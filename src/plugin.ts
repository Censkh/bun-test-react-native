import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type { BunPlugin } from "bun";
import { normalizeResolverOptions, resolveReactNativeImport, toFilePath } from "./platformResolver";
import {
  getJavaScriptLoader,
  getReactNativeTransformations,
  rewriteRelativeSpecifiersToFileUrls,
  transpile,
} from "./transpile";

export type {
  ReactNativePlatform,
  ReactNativeResolverOptions,
  ResolveRequest,
  ResolveResult,
} from "./platformResolver";
export { resolveReactNativeImport } from "./platformResolver";
export type { ReactNativeTransformation, TranspileTransform } from "./transpile";
export {
  getReactNativeTransformations,
  hasCjsDynamicExport,
  hasExtensionlessPlatformSpecifier,
  isReanimatedJestMockPath,
  rewriteExtensionlessPlatformSpecifiers,
  rewriteRelativeSpecifiersToAbsolute,
  shouldTransformReactNativeSource,
  transpile,
} from "./transpile";

const REACT_NATIVE_ASSET_FILE_PATTERN = /\.(?:bmp|gif|jpg|jpeg|m4a|mp3|mp4|otf|png|psd|svg|ttf|webm|webp|wav)$/i;
const NORMAL_SOURCE_FILE_PATTERN =
  /^(?!.*[/\\]node_modules[/\\](?!@expo[/\\]|@react-native[/\\]|expo(?:[/\\]|-|$)|react-native(?!-gesture-handler(?:[/\\]|$))(?:[/\\]|-|$))).*\.[cm]?[jt]sx?$/;
const NODE_MODULES_SEGMENT = `${path.sep}node_modules${path.sep}`;
const TRANSFORM_CACHE_VERSION = "4";
const identifierPattern = /^[A-Za-z_$][\w$]*$/;

type PackageJson = {
  name?: string;
  version?: string;
};

type NodeModulesPackageBase = {
  cacheDirectory: string;
  name: string;
  packageDirectory: string;
  version: string;
};

const debug = (...args: unknown[]) => {
  if (!process.env.BTRN_DEBUG) return;
  const filter = process.env.BTRN_DEBUG_FILTER;
  const message = args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" ");
  if (filter && !message.includes(filter)) return;
  console.error("[btrn:plugin]", ...args);
};

type ResolveDebugArgs = {
  importer: string;
  kind?: string;
  namespace: string;
  path: string;
};

const debugOnResolve = (event: string, args: ResolveDebugArgs, details: Record<string, unknown> = {}) => {
  debug(`onResolve:${event}`, {
    importer: args.importer,
    kind: args.kind,
    namespace: args.namespace,
    path: args.path,
    ...details,
  });
};

const normalizePluginImporter = (importer: string) => importer.replace(/^\/actual:/, "").replace(/^actual:/, "");

const getSpecifierPathname = (specifier: string) => specifier.split(/[?#]/, 1)[0] ?? specifier;

const hasExplicitExtension = (specifier: string) => path.extname(getSpecifierPathname(specifier)) !== "";

const isNativeAddonSpecifier = (specifier: string) => path.extname(getSpecifierPathname(specifier)) === ".node";

const isRelativeSpecifier = (specifier: string) => specifier.startsWith("./") || specifier.startsWith("../");

const isExactRelativeResolution = (specifier: string, importer: string | undefined, resolvedPath: string) => {
  if (!importer || !isRelativeSpecifier(specifier) || !hasExplicitExtension(specifier)) {
    return false;
  }

  return path.resolve(path.dirname(toFilePath(importer)), getSpecifierPathname(specifier)) === toFilePath(resolvedPath);
};

const isExactPackageSubpathResolution = (specifier: string, resolvedPath: string) => {
  if (
    specifier.startsWith(".") ||
    specifier.startsWith("/") ||
    specifier.startsWith("file:") ||
    !hasExplicitExtension(specifier)
  ) {
    return false;
  }

  return toFilePath(resolvedPath)
    .replaceAll(path.sep, "/")
    .endsWith(`/${getSpecifierPathname(specifier)}`);
};

const hashText = (value: string) => createHash("sha256").update(value).digest("hex");

const sanitizeCacheSegment = (value: string) => value.replace(/[\\/:"*?<>|\s]+/g, "+");

const readJsonFile = <T>(filePath: string): T | null => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
};

const nodeModulesPackageCache = new Map<string, NodeModulesPackageBase | null>();

const getNodeModulesPackage = (filePath: string) => {
  const normalizedPath = path.resolve(toFilePath(filePath));
  const markerIndex = normalizedPath.lastIndexOf(NODE_MODULES_SEGMENT);
  if (markerIndex === -1) return null;

  const nodeModulesDirectory = normalizedPath.slice(0, markerIndex + NODE_MODULES_SEGMENT.length - 1);
  const packagePath = normalizedPath.slice(markerIndex + NODE_MODULES_SEGMENT.length);
  const packageParts = packagePath.split(path.sep);
  const packageName = packageParts[0]?.startsWith("@") ? packageParts.slice(0, 2).join("/") : packageParts[0];
  if (!packageName) return null;

  const packageDirectory = path.join(nodeModulesDirectory, packageName);
  const cachedPackage = nodeModulesPackageCache.get(packageDirectory);
  if (cachedPackage !== undefined) {
    return cachedPackage
      ? {
          ...cachedPackage,
          relativePath: path.relative(packageDirectory, normalizedPath).replaceAll(path.sep, "/"),
        }
      : null;
  }

  const packageJson = readJsonFile<PackageJson>(path.join(packageDirectory, "package.json"));
  if (!packageJson?.name || !packageJson.version) {
    nodeModulesPackageCache.set(packageDirectory, null);
    return null;
  }

  const packageBase = {
    cacheDirectory: path.join(
      nodeModulesDirectory,
      ".btrn-cache",
      `${sanitizeCacheSegment(packageJson.name)}-${sanitizeCacheSegment(packageJson.version)}`,
    ),
    name: packageJson.name,
    packageDirectory,
    version: packageJson.version,
  };
  nodeModulesPackageCache.set(packageDirectory, packageBase);

  return {
    ...packageBase,
    relativePath: path.relative(packageDirectory, normalizedPath).replaceAll(path.sep, "/"),
  };
};

const getNodeModulesTransformCachePath = (
  filePath: string,
  source: string,
  transformations: readonly string[],
  options: ReturnType<typeof normalizeResolverOptions>,
) => {
  const packageInfo = getNodeModulesPackage(filePath);
  if (!packageInfo) return null;

  const key = hashText(
    JSON.stringify({
      cacheVersion: TRANSFORM_CACHE_VERSION,
      packageName: packageInfo.name,
      packageVersion: packageInfo.version,
      path: packageInfo.relativePath,
      platform: options.platform,
      sourceHash: hashText(source),
      transforms: transformations,
    }),
  );

  return path.join(packageInfo.cacheDirectory, `${key}.js`);
};

const readCachedTransform = (cachePath: string) => {
  try {
    return fs.readFileSync(cachePath, "utf8");
  } catch {
    return null;
  }
};

const writeCachedTransform = (cachePath: string, contents: string) => {
  try {
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, contents);
  } catch {}
};

const isOnlyCommonJsExportsTransform = (transformations: readonly string[]) =>
  transformations.length === 1 && transformations[0] === "commonjs-exports";

const evaluateCommonJsActual = (filePath: string, source: string) => {
  const module = { exports: {} };
  const exports = module.exports;
  const require = createRequire(filePath);
  Function(
    "require",
    "module",
    "exports",
    "__filename",
    "__dirname",
    source,
  )(require, module, exports, filePath, path.dirname(filePath));
  return module.exports;
};

const createCommonJsActualWrapper = (filePath: string, source: string) => {
  const actual = evaluateCommonJsActual(filePath, source);
  const namedExports = Object.keys(actual)
    .filter((key) => identifierPattern.test(key) && key !== "default")
    .map((key) => `export const ${key} = actual[${JSON.stringify(key)}];`);

  return [
    `import { createRequire } from "node:module";`,
    "const module = { exports: {} };",
    "const exports = module.exports;",
    `const require = createRequire(${JSON.stringify(filePath)});`,
    `const __filename = ${JSON.stringify(filePath)};`,
    `const __dirname = ${JSON.stringify(path.dirname(filePath))};`,
    `Function("require", "module", "exports", "__filename", "__dirname", ${JSON.stringify(
      source,
    )})(require, module, exports, __filename, __dirname);`,
    "const actual = module.exports;",
    `const defaultExport = actual && typeof actual === "object" && "default" in actual ? actual.default : actual;`,
    "export default defaultExport;",
    ...namedExports,
  ].join("\n");
};

const tryCreateCommonJsActualWrapper = (filePath: string, source: string) => {
  try {
    return createCommonJsActualWrapper(filePath, source);
  } catch (error) {
    debug("commonjs actual wrapper fallback", {
      error: error instanceof Error ? error.message : String(error),
      filePath,
    });
    return null;
  }
};

export const reactNativePlatformResolverPlugin: BunPlugin = {
  name: "react-native-platform-resolver",
  setup(build) {
    const options = normalizeResolverOptions();

    build.onResolve({ filter: /.*/, namespace: "actual" }, (args) => {
      if (isNativeAddonSpecifier(args.path)) return undefined;

      debugOnResolve("actual:start", args);
      const importer = normalizePluginImporter(args.importer);
      const result = resolveReactNativeImport(
        {
          importer,
          specifier: args.path,
        },
        options,
      );

      if (!result || result.path === "empty:") {
        debugOnResolve("actual:pass", args);
        return undefined;
      }
      if (isNativeAddonSpecifier(result.path)) return undefined;
      debugOnResolve("actual:hit", args, { resolvedPath: result.path });
      return {
        path: result.path,
        namespace: "actual",
      };
    });

    build.onResolve({ filter: /./ }, (args) => {
      if (isNativeAddonSpecifier(args.path)) return undefined;

      const importer = args.importer ? normalizePluginImporter(args.importer) : undefined;
      const result = resolveReactNativeImport(
        {
          importer,
          specifier: args.path,
        },
        options,
      );

      if (!result) {
        debugOnResolve("main:pass:miss", args);
        return undefined;
      }
      if (isNativeAddonSpecifier(result.path)) return undefined;
      if (result.path === args.path) {
        return undefined;
      }
      if (
        isExactRelativeResolution(args.path, importer, result.path) ||
        isExactPackageSubpathResolution(args.path, result.path)
      ) {
        return undefined;
      }

      debugOnResolve("main:hit", args, { resolvedPath: result.path });
      if (result.path === "empty:") {
        debugOnResolve("main:empty", args);
        return {
          namespace: "react-native-empty",
          path: args.path,
        };
      }

      debugOnResolve("main:resolved", args, { resolvedPath: result.path });
      return {
        path: result.path,
      };
    });

    build.onLoad({ filter: /.*/, namespace: "react-native-empty" }, (args) => {
      debug("onLoad empty", args.path);
      return {
        contents: "export default {};",
        loader: "js",
      };
    });

    build.onLoad({ filter: /.*/, namespace: "actual" }, (args) => {
      const filePath = toFilePath(args.path);
      const loader = getJavaScriptLoader(filePath);
      const source = fs.readFileSync(filePath, "utf8");
      const transformations = getReactNativeTransformations(source, filePath, loader, options);
      const commonJsWrapper = isOnlyCommonJsExportsTransform(transformations)
        ? tryCreateCommonJsActualWrapper(filePath, source)
        : null;
      const contents =
        commonJsWrapper ??
        rewriteRelativeSpecifiersToFileUrls(
          transformations.length > 0 ? transpile({ source, filePath, options, transforms: transformations }) : source,
          filePath,
          options,
        );

      debug("onLoad actual", filePath);
      return {
        contents,
        loader,
      };
    });

    build.onLoad({ filter: NORMAL_SOURCE_FILE_PATTERN }, (args) => {
      const filePath = toFilePath(args.path);
      const loader = getJavaScriptLoader(filePath);
      const source = fs.readFileSync(filePath, "utf8");
      const transformations = getReactNativeTransformations(source, filePath, loader, options);
      if (transformations.length === 0) {
        return {
          contents: source,
          loader,
        };
      }

      debug("onLoad normal", filePath, { transformations });
      const cachePath = getNodeModulesTransformCachePath(filePath, source, transformations, options);
      if (cachePath) {
        const cached = readCachedTransform(cachePath);
        if (cached !== null) {
          debug("onLoad normal cache hit", filePath, { cachePath, transformations });
          return {
            contents: cached,
            loader,
          };
        }
      }

      const contents = transpile({ source, filePath, options, transforms: transformations });
      if (cachePath) {
        writeCachedTransform(cachePath, contents);
      }

      return {
        contents,
        loader,
      };
    });

    build.onLoad({ filter: REACT_NATIVE_ASSET_FILE_PATTERN }, (args) => {
      debug("onLoad asset", args.path);
      return {
        contents: `export default ${JSON.stringify({ uri: args.path })};`,
        loader: "js",
      };
    });
  },
};
