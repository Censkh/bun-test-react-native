import fs from "node:fs";
import { builtinModules, createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type ReactNativePlatform = "android" | "ios" | "native" | "web" | (string & {});

export type ReactNativeResolverOptions = {
  platform?: ReactNativePlatform;
  projectRoot?: string;
  sourceExtensions?: readonly string[];
  packageMainFields?: readonly string[];
};

export type ResolveRequest = {
  specifier: string;
  importer?: string;
};

export type ResolveResult = {
  path: string;
} | null;

type PackageJson = {
  main?: string;
  module?: string;
  browser?: string | Record<string, string | false>;
  "react-native"?: string | Record<string, string | false>;
};

const DEFAULT_SOURCE_EXTENSIONS = ["tsx", "ts", "jsx", "js", "json"] as const;
const DEFAULT_PACKAGE_MAIN_FIELDS = ["react-native", "browser", "module", "main"] as const;
const DEFAULT_PLATFORM: ReactNativePlatform = "ios";
const REACT_NATIVE_PACKAGE_PATH_PATTERN = /[/\\]node_modules[/\\](?:@react-native[/\\][^/\\]+|react-native)(?:[/\\]|$)/;
const REACT_NATIVE_WORKLETS_PACKAGE_PATH_PATTERN = /[/\\]node_modules[/\\]react-native-worklets(?:[/\\]|$)/;
const BUILTIN_MODULES = new Set([...builtinModules, ...builtinModules.map((moduleName) => `node:${moduleName}`)]);
const projectRequire = createRequire(process.cwd());

const isRelativeOrAbsolute = (specifier: string) =>
  specifier.startsWith("./") ||
  specifier.startsWith("../") ||
  specifier.startsWith("/") ||
  specifier === "." ||
  specifier === "..";

const isBuiltin = (specifier: string) => BUILTIN_MODULES.has(specifier);

export const toFilePath = (filePath: string) => (filePath.startsWith("file:") ? fileURLToPath(filePath) : filePath);

export const hasPlatformExtension = (filePath: string, platform: ReactNativePlatform) =>
  filePath.includes(`.${platform}.`) || filePath.includes(".native.");

export const isReactNativePackagePath = (filePath: string) =>
  REACT_NATIVE_PACKAGE_PATH_PATTERN.test(toFilePath(filePath));

export const isReactNativeNativeModulesPath = (filePath: string) =>
  /[/\\]node_modules[/\\]react-native[/\\]Libraries[/\\]BatchedBridge[/\\]NativeModules(?:\.js)?$/.test(
    toFilePath(filePath),
  );

const fileExists = (filePath: string) => {
  try {
    return fs.statSync(toFilePath(filePath)).isFile();
  } catch {
    return false;
  }
};

const directoryExists = (directoryPath: string) => {
  try {
    return fs.statSync(toFilePath(directoryPath)).isDirectory();
  } catch {
    return false;
  }
};

const readPackageJson = (packageDirectory: string): PackageJson | null => {
  const packageJsonPath = path.join(packageDirectory, "package.json");
  if (!fileExists(packageJsonPath)) return null;

  try {
    return JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as PackageJson;
  } catch {
    return null;
  }
};

const extensionCandidates = (
  basePath: string,
  options: Required<Pick<ReactNativeResolverOptions, "platform" | "sourceExtensions">>,
) => {
  const extension = path.extname(basePath);
  const extensionWithoutDot = extension.slice(1);
  const hasKnownExtension = options.sourceExtensions.includes(extensionWithoutDot);
  const extensionBasePath = hasKnownExtension ? basePath.slice(0, -extension.length) : basePath;
  const sourceExtensions = hasKnownExtension ? [extensionWithoutDot] : options.sourceExtensions;
  const skipNativePrefix = REACT_NATIVE_WORKLETS_PACKAGE_PATH_PATTERN.test(toFilePath(basePath));
  const platformPrefixes = skipNativePrefix
    ? options.platform === "native"
      ? [""]
      : [`.${options.platform}`, ""]
    : options.platform === "native"
      ? [".native", ""]
      : [`.${options.platform}`, ".native", ""];

  return platformPrefixes.flatMap((platformPrefix) =>
    sourceExtensions.map((sourceExtension) => `${extensionBasePath}${platformPrefix}.${sourceExtension}`),
  );
};

const resolveFile = (
  basePath: string,
  options: Required<Pick<ReactNativeResolverOptions, "platform" | "sourceExtensions">>,
) => {
  for (const candidate of extensionCandidates(basePath, options)) {
    if (fileExists(candidate)) return candidate;
  }
  return null;
};

const getPackageMainValue = (packageJson: PackageJson, packageMainFields: readonly string[]): string | undefined => {
  for (const field of packageMainFields) {
    const value = packageJson[field as keyof PackageJson];
    if (typeof value === "string") return value;
  }
  return packageJson.main ?? "index";
};

const applyReactNativePackageMap = (
  packageJson: PackageJson | null,
  packageDirectory: string,
  packageSubpath: string,
) => {
  const reactNativeField = packageJson?.["react-native"];
  if (!reactNativeField || typeof reactNativeField !== "object") return null;

  const normalizedSubpath = packageSubpath ? `./${packageSubpath}` : ".";
  const mappedValue =
    reactNativeField[normalizedSubpath] ??
    reactNativeField[`${normalizedSubpath}.js`] ??
    reactNativeField[packageSubpath];

  if (mappedValue === false) {
    return "empty:";
  }
  if (typeof mappedValue === "string") {
    return path.resolve(packageDirectory, mappedValue);
  }
  return null;
};

const resolveDirectory = (
  directoryPath: string,
  options: Required<Pick<ReactNativeResolverOptions, "packageMainFields" | "platform" | "sourceExtensions">>,
) => {
  const packageJson = readPackageJson(directoryPath);
  const packageMain = packageJson ? getPackageMainValue(packageJson, options.packageMainFields) : "index";
  if (packageMain) {
    const packageMainPath = resolveFile(path.resolve(directoryPath, packageMain), options);
    if (packageMainPath) return packageMainPath;
  }

  return resolveFile(path.join(directoryPath, "index"), options);
};

const resolvePath = (
  basePath: string,
  options: Required<Pick<ReactNativeResolverOptions, "packageMainFields" | "platform" | "sourceExtensions">>,
) => {
  const filePath = resolveFile(basePath, options);
  if (filePath) return filePath;

  if (directoryExists(basePath)) {
    return resolveDirectory(basePath, options);
  }

  return null;
};

const parsePackageSpecifier = (specifier: string) => {
  const parts = specifier.split("/");
  const packageName = specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
  const packageSubpath = parts.slice(packageName.startsWith("@") ? 2 : 1).join("/");
  return { packageName, packageSubpath };
};

const findPackageDirectory = (packageName: string, importerDirectory: string, projectRoot: string) => {
  let currentDirectory = importerDirectory;
  while (true) {
    const candidate = path.join(currentDirectory, "node_modules", packageName);
    if (directoryExists(candidate)) return candidate;

    const parentDirectory = path.dirname(currentDirectory);
    if (parentDirectory === currentDirectory) break;
    currentDirectory = parentDirectory;
  }

  const projectNodeModulesCandidate = path.join(projectRoot, "node_modules", packageName);
  if (directoryExists(projectNodeModulesCandidate)) return projectNodeModulesCandidate;

  const workspaceCandidate = path.join(projectRoot, "packages", packageName);
  if (directoryExists(workspaceCandidate)) return workspaceCandidate;

  return null;
};

const findWorkspaceRoot = (startDirectory: string) => {
  let currentDirectory = path.resolve(startDirectory);

  while (true) {
    const packageJsonPath = path.join(currentDirectory, "package.json");
    if (fileExists(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
          workspaces?: unknown;
        };
        if (packageJson.workspaces) return currentDirectory;
      } catch {
        return currentDirectory;
      }
    }

    if (directoryExists(path.join(currentDirectory, "packages"))) {
      return currentDirectory;
    }

    const parentDirectory = path.dirname(currentDirectory);
    if (parentDirectory === currentDirectory) return startDirectory;
    currentDirectory = parentDirectory;
  }
};

const resolvePackageExports = (specifier: string, importerDirectory: string) => {
  try {
    return projectRequire.resolve(specifier, { paths: [importerDirectory] });
  } catch {
    return null;
  }
};

export const normalizeResolverOptions = (options: ReactNativeResolverOptions = {}) => ({
  packageMainFields: options.packageMainFields ?? DEFAULT_PACKAGE_MAIN_FIELDS,
  platform:
    options.platform ?? process.env.BUN_REACT_NATIVE_PLATFORM ?? process.env.REACT_NATIVE_PLATFORM ?? DEFAULT_PLATFORM,
  projectRoot: options.projectRoot ? path.resolve(options.projectRoot) : findWorkspaceRoot(process.cwd()),
  sourceExtensions: options.sourceExtensions ?? DEFAULT_SOURCE_EXTENSIONS,
});

type NormalizedResolverOptions = ReturnType<typeof normalizeResolverOptions>;

const resolveResultCache = new Map<string, ResolveResult>();

export const clearReactNativeResolveCache = () => {
  resolveResultCache.clear();
};

const getResolveCacheKey = (request: ResolveRequest, options: NormalizedResolverOptions) =>
  [
    options.platform,
    options.projectRoot,
    options.sourceExtensions.join(","),
    options.packageMainFields.join(","),
    request.importer ? path.resolve(toFilePath(request.importer)) : "",
    request.specifier,
  ].join("\0");

export const resolveReactNativeImport = (
  request: ResolveRequest,
  options?: ReactNativeResolverOptions,
): ResolveResult => {
  const normalizedOptions = normalizeResolverOptions(options);
  const cacheKey = getResolveCacheKey(request, normalizedOptions);
  if (resolveResultCache.has(cacheKey)) {
    return resolveResultCache.get(cacheKey) ?? null;
  }

  const cacheResult = (result: ResolveResult) => {
    resolveResultCache.set(cacheKey, result);
    return result;
  };

  const specifier = request.specifier;
  if (isBuiltin(specifier)) return cacheResult(null);
  if (specifier.startsWith("file:")) return cacheResult({ path: toFilePath(specifier) });

  const importerDirectory = request.importer
    ? path.dirname(path.resolve(toFilePath(request.importer)))
    : normalizedOptions.projectRoot;

  if (isRelativeOrAbsolute(specifier)) {
    const basePath = path.resolve(importerDirectory, specifier);
    const resolvedPath = resolvePath(basePath, normalizedOptions);
    return cacheResult(resolvedPath ? { path: resolvedPath } : null);
  }

  const { packageName, packageSubpath } = parsePackageSpecifier(specifier);
  const packageDirectory = findPackageDirectory(packageName, importerDirectory, normalizedOptions.projectRoot);
  if (!packageDirectory) return cacheResult(null);

  const packageJson = readPackageJson(packageDirectory);
  const mappedSubpath = applyReactNativePackageMap(packageJson, packageDirectory, packageSubpath);
  if (mappedSubpath === "empty:") return cacheResult({ path: mappedSubpath });

  const exportedPath = packageSubpath && !mappedSubpath ? resolvePackageExports(specifier, importerDirectory) : null;
  if (exportedPath) {
    const resolvedExportPath = resolvePath(exportedPath, normalizedOptions);
    return cacheResult({ path: resolvedExportPath ?? exportedPath });
  }

  const basePath = mappedSubpath
    ? mappedSubpath
    : packageSubpath
      ? path.join(packageDirectory, packageSubpath)
      : packageDirectory;
  const resolvedPath = resolvePath(basePath, normalizedOptions);
  return cacheResult(resolvedPath ? { path: resolvedPath } : null);
};
