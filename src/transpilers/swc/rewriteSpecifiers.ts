import { parseSync, printSync } from "@swc/core";
import type { SpecifierKind, SpecifierRewriter } from "../specifiers";

type SwcNode = Record<string, unknown>;

const isNode = (value: unknown): value is SwcNode =>
  value != null && typeof value === "object" && typeof (value as SwcNode).type === "string";

const isObject = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === "object";

const rewriteStringLiteral = (
  node: unknown,
  kind: SpecifierKind,
  rewriteSpecifier: SpecifierRewriter,
) => {
  if (!isNode(node) || node.type !== "StringLiteral" || typeof node.value !== "string") return;
  const nextValue = rewriteSpecifier(node.value, kind);
  if (nextValue === node.value) return;
  node.value = nextValue;
  node.raw = JSON.stringify(nextValue);
};

const isMemberCall = (callee: unknown, objectName: string, propertyName: string) =>
  isNode(callee) &&
  callee.type === "MemberExpression" &&
  isNode(callee.object) &&
  callee.object.type === "Identifier" &&
  callee.object.value === objectName &&
  isNode(callee.property) &&
  callee.property.type === "Identifier" &&
  callee.property.value === propertyName;

const visit = (node: unknown, rewriteSpecifier: SpecifierRewriter) => {
  if (Array.isArray(node)) {
    for (const child of node) visit(child, rewriteSpecifier);
    return;
  }

  if (!isNode(node)) {
    if (isObject(node)) {
      for (const value of Object.values(node)) {
        if (isObject(value) || Array.isArray(value)) visit(value, rewriteSpecifier);
      }
    }
    return;
  }

  switch (node.type) {
    case "ImportDeclaration":
      rewriteStringLiteral(node.source, "import", rewriteSpecifier);
      break;
    case "ExportAllDeclaration":
      rewriteStringLiteral(node.source, "export-all", rewriteSpecifier);
      break;
    case "ExportNamedDeclaration":
      rewriteStringLiteral(node.source, "export-named", rewriteSpecifier);
      break;
    case "CallExpression": {
      const callee = node.callee;
      const args = node.arguments;
      const firstArg =
        Array.isArray(args) && args[0] != null && typeof args[0] === "object"
          ? ((args[0] as Record<string, unknown>).expression as unknown)
          : undefined;

      if (isNode(callee) && callee.type === "Import") {
        rewriteStringLiteral(firstArg, "dynamic-import", rewriteSpecifier);
      } else if (isNode(callee) && callee.type === "Identifier" && callee.value === "require") {
        rewriteStringLiteral(firstArg, "require", rewriteSpecifier);
      } else if (isMemberCall(callee, "jest", "requireActual")) {
        rewriteStringLiteral(firstArg, "require", rewriteSpecifier);
      }
      break;
    }
  }

  for (const [key, value] of Object.entries(node)) {
    if (key === "span" || key === "ctxt") continue;
    if (isNode(value) || Array.isArray(value)) visit(value, rewriteSpecifier);
  }
};

export const rewriteSpecifiersWithSwc = (
  source: string,
  filename: string,
  rewriteSpecifier: SpecifierRewriter,
) => {
  const isTypeScript = /\.[cm]?tsx?$/.test(filename);
  const ast = parseSync(source, {
    comments: false,
    dynamicImport: true,
    jsx: true,
    syntax: isTypeScript ? "typescript" : "flow",
    tsx: filename.endsWith(".tsx"),
    ...(isTypeScript ? {} : { components: true }),
  });

  visit(ast, rewriteSpecifier);

  return printSync(ast).code;
};
