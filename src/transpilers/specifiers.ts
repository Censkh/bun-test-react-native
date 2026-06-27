import path from "node:path";

export type SpecifierKind = "dynamic-import" | "export-all" | "export-named" | "import" | "require";

export type SpecifierRewriter = (specifier: string, kind: SpecifierKind) => string;

export const isRelativeSpecifier = (specifier: string) => specifier.startsWith("./") || specifier.startsWith("../");

export const isExtensionlessRelativeSpecifier = (specifier: string) => {
  if (!isRelativeSpecifier(specifier)) return false;
  const pathname = specifier.split(/[?#]/, 1)[0] ?? specifier;
  return path.extname(pathname) === "";
};

export const HAS_EXTENSIONLESS_RELATIVE_SPECIFIER_PATTERN =
  /\b(?:require|import|jest\.requireActual)\s*\(\s*["'](?:\.{1,2}\/)+(?:[^"'./]+\/)*[^"'./?#]+(?:[?#][^"']*)?["']\s*\)|\bimport(?:\s+type)?(?:\s+[\s\S]*?\s+from\s*)?["'](?:\.{1,2}\/)+(?:[^"'./]+\/)*[^"'./?#]+(?:[?#][^"']*)?["']|\bexport(?:\s+type)?(?:\s+\*|\s+\{[\s\S]*?\})\s+from\s*["'](?:\.{1,2}\/)+(?:[^"'./]+\/)*[^"'./?#]+(?:[?#][^"']*)?["']/;
