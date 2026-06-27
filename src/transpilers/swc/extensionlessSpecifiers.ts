import path from "node:path";
import {
  hasPlatformExtension,
  normalizeResolverOptions,
  type ReactNativeResolverOptions,
  resolveReactNativeImport,
  toFilePath,
} from "../../platformResolver";
import type { SpecifierKind } from "../specifiers";
import { isExtensionlessRelativeSpecifier } from "../specifiers";
import { rewriteSpecifiersWithSwc } from "./rewriteSpecifiers";

const REWRITABLE_KINDS = new Set<SpecifierKind>([
  "dynamic-import",
  "export-all",
  "export-named",
  "import",
  "require",
]);

const splitSpecifierSuffix = (specifier: string) => {
  const suffixIndex = specifier.search(/[?#]/);
  return suffixIndex === -1
    ? { pathname: specifier, suffix: "" }
    : {
        pathname: specifier.slice(0, suffixIndex),
        suffix: specifier.slice(suffixIndex),
      };
};

const toRelativeSpecifier = (fromFile: string, resolvedFile: string) => {
  const relativePath = path
    .relative(path.dirname(toFilePath(fromFile)), toFilePath(resolvedFile))
    .replaceAll(path.sep, "/");
  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
};

export const resolveExtensionlessSpecifier = (
  specifier: string,
  filename: string,
  options: ReactNativeResolverOptions = {},
) => {
  if (!isExtensionlessRelativeSpecifier(specifier)) return specifier;

  const { pathname, suffix } = splitSpecifierSuffix(specifier);
  const normalizedOptions = normalizeResolverOptions(options);
  const result = resolveReactNativeImport(
    {
      importer: filename,
      specifier: pathname,
    },
    normalizedOptions,
  );
  if (!result?.path || result.path === "empty:") return specifier;
  if (!hasPlatformExtension(result.path, normalizedOptions.platform)) return specifier;

  const resolvedSpecifier = `${toRelativeSpecifier(filename, result.path)}${suffix}`;
  return resolvedSpecifier === specifier ? specifier : resolvedSpecifier;
};

export const shouldRewriteExtensionlessSpecifier = (
  specifier: string,
  filename: string,
  options: ReactNativeResolverOptions = {},
) => resolveExtensionlessSpecifier(specifier, filename, options) !== specifier;

export const rewriteExtensionlessSpecifiersWithSwc = (
  source: string,
  filename: string,
  options: ReactNativeResolverOptions = {},
) => {
  return rewriteSpecifiersWithSwc(source, filename, (specifier, kind) => {
    if (!REWRITABLE_KINDS.has(kind)) return specifier;
    return resolveExtensionlessSpecifier(specifier, filename, options);
  });
};
