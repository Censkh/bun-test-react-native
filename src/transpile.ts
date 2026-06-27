import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  normalizeResolverOptions,
  type ReactNativeResolverOptions,
  resolveReactNativeImport,
  toFilePath,
} from "./platformResolver";
import { getTranspileBackend } from "./transpilers";
import {
  HAS_EXTENSIONLESS_RELATIVE_SPECIFIER_PATTERN,
  isExtensionlessRelativeSpecifier,
  isRelativeSpecifier,
} from "./transpilers/specifiers";
import {
  rewriteExtensionlessSpecifiersWithSwc,
  shouldRewriteExtensionlessSpecifier,
} from "./transpilers/swc/extensionlessSpecifiers";
import { rewriteSpecifiersWithSwc } from "./transpilers/swc/rewriteSpecifiers";
import type { JavaScriptLoader, TranspileTransform, TranspileTransformId } from "./transpilers/types";

export type {
  JavaScriptLoader,
  ReactNativeTransformation,
  TranspileTransform,
  TranspileTransformContext,
  TranspileTransformId,
} from "./transpilers/types";

const transpilers = new Map<JavaScriptLoader, Bun.Transpiler>();

const getTranspiler = (loader: JavaScriptLoader) => {
  const existing = transpilers.get(loader);
  if (existing) return existing;

  const transpiler = new Bun.Transpiler({ loader });
  transpilers.set(loader, transpiler);
  return transpiler;
};

export const isReanimatedJestMockPath = (filePath: string) =>
  /[/\\]node_modules[/\\]react-native-reanimated[/\\](?:src|lib[/\\]module)[/\\]mock(?:-svg)?\.[jt]s$/.test(
    toFilePath(filePath),
  );

const CJS_EXPORT_PATTERN =
  /\bmodule\.exports\b|\bexports\.[A-Za-z_$][\w$]*\b|Object\.(?:assign|defineProperty)\(\s*exports\b|__exportStar\(/;
const CJS_DYNAMIC_EXPORT_PATTERN =
  /Object\.defineProperty\(\s*(?:exports|module\.exports)\s*,\s*[A-Za-z_$]|\bmodule\.exports\s*=|__exportStar\(\s*require\(/;
const DEFAULT_EXPORT_PROPERTY_PATTERN =
  /(?:\b([A-Za-z_$][\w$]*)\.[A-Za-z_$][\w$]*\s*=[\s\S]*?\bexport\s+default\s+\1\b|\bexport\s+default\s+([A-Za-z_$][\w$]*)\b[\s\S]*?\b\2\.[A-Za-z_$][\w$]*\s*=)/;

export const hasCjsDynamicExport = (source: string) => CJS_DYNAMIC_EXPORT_PATTERN.test(source);

const hasFlowSyntax = (source: string) => /@flow\b/.test(source);

const hasCommonJsExportSyntax = (source: string) => CJS_EXPORT_PATTERN.test(source);

const hasDefaultExportPropertySyntax = (source: string) => DEFAULT_EXPORT_PROPERTY_PATTERN.test(source);

const needsCommonJsExports = (source: string) =>
  hasCommonJsExportSyntax(source) || hasDefaultExportPropertySyntax(source);

const isJavaScriptLoader = (loader: JavaScriptLoader) => loader === "js" || loader === "jsx";

const isTypeScriptLoader = (loader: JavaScriptLoader) => loader === "ts" || loader === "tsx";

export const TRANSPILE_TRANSFORMS: readonly TranspileTransform[] = [
  {
    id: "flow",
    predicate: ({ loader, source }) => isJavaScriptLoader(loader) && hasFlowSyntax(source),
  },
  {
    id: "typescript",
    predicate: ({ loader }) => isTypeScriptLoader(loader),
  },
  {
    id: "commonjs-exports",
    predicate: ({ source }) => needsCommonJsExports(source),
  },
  {
    id: "rewrite-extensionless-specifiers",
    predicate: ({ filePath, loader, resolverOptions, source }) =>
      hasResolvableExtensionlessPlatformSpecifier(source, filePath, loader, resolverOptions),
  },
];

export const getReactNativeTransformations = (
  source: string,
  filePath: string,
  loader: JavaScriptLoader = getJavaScriptLoader(filePath),
  resolverOptions: ReactNativeResolverOptions = {},
): TranspileTransformId[] => {
  const transforms: TranspileTransformId[] = [];
  const hasFlow = isJavaScriptLoader(loader) && hasFlowSyntax(source);

  if (hasFlow) transforms.push("flow");
  if (isTypeScriptLoader(loader)) transforms.push("typescript");
  if (needsCommonJsExports(source)) transforms.push("commonjs-exports");
  if (
    hasResolvableExtensionlessPlatformSpecifier(source, filePath, loader, resolverOptions, {
      hasFlow,
    })
  ) {
    transforms.push("rewrite-extensionless-specifiers");
  }

  return transforms;
};

export const shouldTransformReactNativeSource = (
  source: string,
  filePath: string,
  loader?: JavaScriptLoader,
  resolverOptions: ReactNativeResolverOptions = {},
) => getReactNativeTransformations(source, filePath, loader, resolverOptions).length > 0;

export type ReactNativeTranspileRequest = {
  filePath: string;
  options?: ReactNativeResolverOptions;
  source: string;
  transforms?: readonly TranspileTransformId[];
};

export const transpile = ({ filePath, options = {}, source, transforms }: ReactNativeTranspileRequest) => {
  const activeTransforms = transforms ?? getReactNativeTransformations(source, filePath, undefined, options);
  return getTranspileBackend().transform(source, {
    filename: filePath,
    resolverOptions: options,
    transforms: activeTransforms,
  });
};

export const hasExtensionlessPlatformSpecifier = (source: string, loader: JavaScriptLoader = "js") => {
  if (HAS_EXTENSIONLESS_RELATIVE_SPECIFIER_PATTERN.test(source)) return true;

  try {
    return getTranspiler(loader)
      .scanImports(source)
      .some((importRecord) => isExtensionlessRelativeSpecifier(importRecord.path));
  } catch {
    return false;
  }
};

export const hasResolvableExtensionlessPlatformSpecifier = (
  source: string,
  filePath: string,
  loader: JavaScriptLoader = getJavaScriptLoader(filePath),
  options: ReactNativeResolverOptions = {},
  flags: { hasFlow?: boolean } = {},
) => {
  if (!source.includes("./") && !source.includes("../")) return false;
  if (!hasExtensionlessPlatformSpecifier(source, loader)) return false;

  if (flags.hasFlow ?? (isJavaScriptLoader(loader) && hasFlowSyntax(source))) {
    return true;
  }

  try {
    return getTranspiler(loader)
      .scanImports(source)
      .some(
        (importRecord) =>
          isExtensionlessRelativeSpecifier(importRecord.path) &&
          shouldRewriteExtensionlessSpecifier(importRecord.path, filePath, options),
      );
  } catch {
    return true;
  }
};

export const rewriteExtensionlessPlatformSpecifiers = (
  source: string,
  filename = "unknown.js",
  options: ReactNativeResolverOptions = {},
) => {
  if (!source.includes("./") && !source.includes("../")) return source;
  if (!HAS_EXTENSIONLESS_RELATIVE_SPECIFIER_PATTERN.test(source)) {
    return source;
  }

  return rewriteExtensionlessSpecifiersWithSwc(source, filename, options);
};

export const rewriteRelativeSpecifiersToAbsolute = (
  source: string,
  filename: string,
  options: ReactNativeResolverOptions = {},
) => {
  if (!source.includes("./") && !source.includes("../")) return source;

  const normalizedOptions = normalizeResolverOptions(options);
  return rewriteSpecifiersWithSwc(source, filename, (specifier) => {
    if (!isRelativeSpecifier(specifier)) return specifier;
    const result = resolveReactNativeImport(
      {
        importer: filename,
        specifier,
      },
      normalizedOptions,
    );

    return result?.path && result.path !== "empty:" ? result.path : specifier;
  });
};

export const rewriteRelativeSpecifiersToFileUrls = (
  source: string,
  filename: string,
  options: ReactNativeResolverOptions = {},
) => {
  if (!source.includes("./") && !source.includes("../")) return source;

  const normalizedOptions = normalizeResolverOptions(options);
  return rewriteSpecifiersWithSwc(source, filename, (specifier) => {
    if (!isRelativeSpecifier(specifier)) return specifier;
    const result = resolveReactNativeImport(
      {
        importer: filename,
        specifier,
      },
      normalizedOptions,
    );

    return result?.path && result.path !== "empty:" ? pathToFileURL(toFilePath(result.path)).href : specifier;
  });
};

export const getJavaScriptLoader = (filePath: string): JavaScriptLoader => {
  const extension = path.extname(filePath);
  if (extension === ".tsx") return "tsx";
  if (extension === ".ts" || extension === ".mts" || extension === ".cts") return "ts";
  if (extension === ".js" || extension === ".jsx") return "jsx";
  return "js";
};
