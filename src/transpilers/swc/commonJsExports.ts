import fs from "node:fs";
import { createRequire } from "node:module";
import { parseSync, printSync } from "@swc/core";

type SwcNode = Record<string, any>;

const isNode = (value: unknown): value is SwcNode =>
  value != null && typeof value === "object" && typeof (value as SwcNode).type === "string";

const isValidExportName = (name: string) => /^[A-Za-z_$][\w$]*$/.test(name);

const parseStatements = (source: string): SwcNode[] => (parseSync(source, { syntax: "ecmascript" }) as SwcNode).body;

const toIdentifierName = (name: string) => name.replace(/[^\w$]/g, "_");

const getUniqueName = (baseName: string, usedNames: Set<string>) => {
  const safeBaseName = toIdentifierName(baseName);
  const candidates = [`_${safeBaseName}`, `_${safeBaseName}Export`];
  for (const candidate of candidates) {
    if (!usedNames.has(candidate)) {
      usedNames.add(candidate);
      return candidate;
    }
  }

  let suffix = 2;
  while (usedNames.has(`_${safeBaseName}Export${suffix}`)) suffix += 1;
  const candidate = `_${safeBaseName}Export${suffix}`;
  usedNames.add(candidate);
  return candidate;
};

const idName = (node: unknown) => (isNode(node) && node.type === "Identifier" ? String(node.value) : null);

const stringValue = (node: unknown) => (isNode(node) && node.type === "StringLiteral" ? String(node.value) : null);

const argExpression = (node: unknown) =>
  node != null && typeof node === "object" ? (node as Record<string, unknown>).expression : null;

const memberExportName = (memberExpression: SwcNode): string | null => {
  const property = memberExpression.property;
  const name = idName(property) ?? stringValue(property);
  return name && isValidExportName(name) ? name : null;
};

const objectPropertyName = (property: SwcNode): string | null => {
  if (property.type === "Identifier") {
    const name = idName(property);
    return name && isValidExportName(name) ? name : null;
  }
  if (
    property.type === "KeyValueProperty" ||
    property.type === "MethodProperty" ||
    property.type === "GetterProperty"
  ) {
    const name = idName(property.key) ?? stringValue(property.key);
    return name && isValidExportName(name) ? name : null;
  }
  return null;
};

const isModuleExportsObject = (node: unknown) =>
  isNode(node) &&
  node.type === "MemberExpression" &&
  idName(node.object) === "module" &&
  idName(node.property) === "exports";

const isExportsObject = (node: unknown) =>
  (isNode(node) && node.type === "Identifier" && node.value === "exports") || isModuleExportsObject(node);

const getRequireSpecifier = (node: unknown) => {
  if (!isNode(node) || node.type !== "CallExpression") return null;
  if (idName(node.callee) !== "require") return null;
  if (!Array.isArray(node.arguments) || node.arguments.length !== 1) return null;
  return stringValue(argExpression(node.arguments[0]));
};

const getRequireSpecifiers = (node: unknown) => {
  const requireSpecifiers = new Set<string>();
  walk(node, (child) => {
    const requireSpecifier = getRequireSpecifier(child);
    if (requireSpecifier) requireSpecifiers.add(requireSpecifier);
  });
  return requireSpecifiers;
};

const resolveRequireSpecifier = (specifier: string, filename: string | undefined) => {
  if (!filename || filename === "unknown.js") return null;

  try {
    return createRequire(filename).resolve(specifier);
  } catch {
    return null;
  }
};

const isObjectDefinePropertyCall = (node: SwcNode) =>
  node.type === "CallExpression" &&
  isNode(node.callee) &&
  node.callee.type === "MemberExpression" &&
  idName(node.callee.object) === "Object" &&
  idName(node.callee.property) === "defineProperty";

const isObjectAssignCall = (node: SwcNode) =>
  node.type === "CallExpression" &&
  isNode(node.callee) &&
  node.callee.type === "MemberExpression" &&
  idName(node.callee.object) === "Object" &&
  idName(node.callee.property) === "assign";

const hasObjectProperty = (objectExpression: SwcNode, propertyName: string) =>
  Array.isArray(objectExpression.properties) &&
  objectExpression.properties.some((property: SwcNode) => objectPropertyName(property) === propertyName);

const getObjectKeysForEachBinding = (node: SwcNode) => {
  if (
    node.type !== "CallExpression" ||
    !isNode(node.callee) ||
    node.callee.type !== "MemberExpression" ||
    idName(node.callee.property) !== "forEach" ||
    !isNode(node.callee.object) ||
    node.callee.object.type !== "CallExpression"
  ) {
    return null;
  }

  const objectKeysCall = node.callee.object;
  if (
    !isNode(objectKeysCall.callee) ||
    objectKeysCall.callee.type !== "MemberExpression" ||
    idName(objectKeysCall.callee.object) !== "Object" ||
    idName(objectKeysCall.callee.property) !== "keys" ||
    !Array.isArray(objectKeysCall.arguments) ||
    objectKeysCall.arguments.length !== 1
  ) {
    return null;
  }

  return idName(argExpression(objectKeysCall.arguments[0]));
};

const createLazyExportHelper = () =>
  parseStatements(`
    function __lazyExport(getValue, component) {
      let value;
      let resolved = false;
      function resolve() {
        if (!resolved) {
          value = getValue();
          resolved = true;
        }
        return value;
      }

      return new Proxy(function () {}, {
        get(_target, property) {
          const value = resolve();
          const isFunctionComponent = component && typeof value === "function" && !value.prototype?.isReactComponent;
          if (isFunctionComponent) {
            if (property === "$$typeof") {
              return Symbol.for("react.forward_ref");
            }
            if (property === "render") {
              return (props, ref) => {
                return value(props, ref);
              };
            }
          }
          if (property === Symbol.toPrimitive) {
            return () => {
              return value && (typeof value === "object" || typeof value === "function")
                ? String(value)
                : value;
            };
          }
          if (property === "toString") {
            return () => String(value);
          }
          if (property === "valueOf") {
            return () => value;
          }
          const propertyValue = Reflect.get(value, property, value);
          return typeof propertyValue === "function" ? propertyValue.bind(value) : propertyValue;
        },
        set(_target, property, nextValue) {
          resolve()[property] = nextValue;
          return true;
        },
        apply(_target, thisArg, args) {
          const value = resolve();
          if (typeof value === "function") {
            return Reflect.apply(value, thisArg, args);
          }
          if (value?.$$typeof === Symbol.for("react.forward_ref") && typeof value.render === "function") {
            return Reflect.apply(value.render, thisArg, args);
          }
          if (value?.$$typeof === Symbol.for("react.memo")) {
            const component = value.type;
            if (typeof component === "function") {
              return Reflect.apply(component, thisArg, args);
            }
            if (component?.$$typeof === Symbol.for("react.forward_ref") && typeof component.render === "function") {
              return Reflect.apply(component.render, thisArg, args);
            }
          }
          return Reflect.apply(value, thisArg, args);
        },
        construct(_target, args, newTarget) {
          return Reflect.construct(resolve(), args, newTarget);
        },
      });
    }
  `)[0];

const createDefaultUnwrapHelper = () =>
  parseStatements(`
    function __unwrapDefault(value) {
      if (
        value &&
        typeof value === "object" &&
        "default" in value &&
        Object.keys(value).length === 1
      ) {
        return value.default;
      }
      return value;
    }
  `)[0];

const collectObjectExportNames = (
  objectExpression: SwcNode,
  objectExportNames: Map<string, Set<string>>,
  requireBindings: Map<string, string>,
  exportAllSpecifiers: Set<string>,
) => {
  const exportNames = new Set<string>();
  for (const property of objectExpression.properties ?? []) {
    if (property.type === "SpreadElement") {
      const spreadName = idName(property.arguments);
      if (!spreadName) continue;
      for (const exportName of objectExportNames.get(spreadName) ?? []) {
        exportNames.add(exportName);
      }
      const requireSpecifier = requireBindings.get(spreadName);
      if (requireSpecifier) exportAllSpecifiers.add(requireSpecifier);
      continue;
    }

    const exportName = objectPropertyName(property);
    if (exportName) exportNames.add(exportName);
  }
  return exportNames;
};

const walk = (
  node: unknown,
  visitor: (node: SwcNode, parent: SwcNode | null) => void,
  parent: SwcNode | null = null,
) => {
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visitor, parent);
    return;
  }
  if (!isNode(node)) return;
  visitor(node, parent);
  for (const [key, value] of Object.entries(node)) {
    if (key === "span" || key === "ctxt") continue;
    if (Array.isArray(value) || isNode(value)) walk(value, visitor, node);
  }
};

const collectStaticExportNames = (source: string, filename: string | undefined, seenFiles = new Set<string>()) => {
  const exportNames = new Set<string>();
  let ast: SwcNode;

  try {
    ast = parseSync(source, { syntax: "ecmascript" }) as SwcNode;
  } catch {
    return exportNames;
  }

  const requireBindings = new Map<string, string>();

  walk(ast.body, (node) => {
    if (node.type !== "VariableDeclarator") return;
    const name = idName(node.id);
    if (!name) return;
    const requireSpecifier = getRequireSpecifier(node.init);
    if (requireSpecifier) requireBindings.set(name, requireSpecifier);
  });

  const addRequireExportNames = (specifier: string) => {
    const resolved = resolveRequireSpecifier(specifier, filename);
    if (!resolved || resolved.startsWith("node:") || seenFiles.has(resolved)) return;

    try {
      const nextSource = fs.readFileSync(resolved, "utf8");
      seenFiles.add(resolved);
      for (const exportName of collectStaticExportNames(nextSource, resolved, seenFiles)) {
        exportNames.add(exportName);
      }
    } catch {}
  };

  const addExpressionExportNames = (expression: SwcNode | null | undefined) => {
    if (!expression) return;

    const expressionName = idName(expression);
    if (expressionName) {
      const requireSpecifier = requireBindings.get(expressionName);
      if (requireSpecifier) addRequireExportNames(requireSpecifier);
      return;
    }

    const requireSpecifier = getRequireSpecifier(expression);
    if (requireSpecifier) {
      addRequireExportNames(requireSpecifier);
      return;
    }

    if (expression.type !== "ObjectExpression") return;
    for (const property of expression.properties ?? []) {
      const exportName = objectPropertyName(property);
      if (exportName && exportName !== "default" && exportName !== "__esModule") {
        exportNames.add(exportName);
      }
    }
  };

  walk(ast.body, (node) => {
    if (node.type === "AssignmentExpression") {
      const left = node.left;
      if (left?.type === "MemberExpression") {
        if (isModuleExportsObject(left)) {
          addExpressionExportNames(node.right);
          return;
        }

        if (isExportsObject(left.object)) {
          const exportName = memberExportName(left);
          if (exportName && exportName !== "default" && exportName !== "__esModule") {
            exportNames.add(exportName);
          }
        }
      }
      return;
    }

    if (node.type !== "CallExpression") return;

    const objectKeysBinding = getObjectKeysForEachBinding(node);
    if (objectKeysBinding) {
      const requireSpecifier = requireBindings.get(objectKeysBinding);
      if (requireSpecifier) addRequireExportNames(requireSpecifier);
      return;
    }

    if (
      idName(node.callee) === "__exportStar" &&
      Array.isArray(node.arguments) &&
      node.arguments.length >= 2 &&
      isExportsObject(argExpression(node.arguments[1]))
    ) {
      const requireSpecifier = getRequireSpecifier(argExpression(node.arguments[0]));
      if (requireSpecifier) addRequireExportNames(requireSpecifier);
      return;
    }

    if (isObjectAssignCall(node)) {
      const target = argExpression(node.arguments?.[0]);
      if (!isExportsObject(target)) return;
      for (const argument of node.arguments?.slice(1) ?? []) {
        addExpressionExportNames(argExpression(argument) as SwcNode | null | undefined);
      }
      return;
    }

    if (!isObjectDefinePropertyCall(node)) return;
    const target = argExpression(node.arguments?.[0]);
    const property = argExpression(node.arguments?.[1]);
    if (!isExportsObject(target)) return;
    const exportName = stringValue(property);
    if (exportName && exportName !== "default" && exportName !== "__esModule") {
      exportNames.add(exportName);
    }
  });

  return exportNames;
};

export const applyCommonJsExportsWithSwc = (source: string, filename?: string) => {
  const ast = parseSync(source, { syntax: "ecmascript" }) as SwcNode;
  const objectExportNames = new Map<string, Set<string>>();
  const requireBindings = new Map<string, string>();
  const nestedRequireBindings = new Map<string, Set<string>>();
  const exportNames = new Set<string>();
  const directExportNames = new Set<string>();
  const existingNamedExportNames = new Set<string>();
  const defaultPropertyExportNames = new Map<string, string>();
  const exportAllSpecifiers = new Set<string>();
  const usedNames = new Set<string>();
  let hasCommonJsExports = false;
  let hasExportsDefault = false;
  let hasModuleExportsObject = false;
  let hasEsModuleObjectDefault = false;
  let defaultExportLocalName: string | null = null;
  let needsDefaultUnwrapHelper = false;
  const addStaticExportNamesForRequireSpecifier = (requireSpecifier: string) => {
    const resolved = resolveRequireSpecifier(requireSpecifier, filename);
    if (!resolved) return;

    try {
      const nextSource = fs.readFileSync(resolved, "utf8");
      for (const exportName of collectStaticExportNames(nextSource, resolved)) {
        exportNames.add(exportName);
      }
    } catch {}
  };

  walk(ast.body, (node) => {
    const name = idName(node);
    if (name) usedNames.add(name);
  });

  for (const statement of ast.body ?? []) {
    if (statement.type === "ExportDefaultDeclaration") {
      defaultExportLocalName = idName(statement.decl) ?? idName(statement.declaration);
    }
    if (statement.type === "ExportDefaultExpression") {
      defaultExportLocalName = idName(statement.expression);
    }

    if (statement.type === "ExportDeclaration" || statement.type === "ExportNamedDeclaration") {
      for (const specifier of statement.specifiers ?? []) {
        const exported = idName(specifier.exported);
        if (exported) existingNamedExportNames.add(exported);
      }
      const declaration = statement.declaration ?? statement.decl;
      if (declaration?.type === "VariableDeclaration") {
        for (const declarator of declaration.declarations ?? []) {
          const name = idName(declarator.id);
          if (name) existingNamedExportNames.add(name);
        }
      }
      const declaredName = idName(declaration?.identifier) ?? idName(declaration?.id);
      if (declaredName) existingNamedExportNames.add(declaredName);
    }
  }

  walk(ast.body, (node) => {
    if (node.type !== "VariableDeclarator") return;
    const name = idName(node.id);
    if (!name) return;
    const requireSpecifier = getRequireSpecifier(node.init);
    if (requireSpecifier) {
      requireBindings.set(name, requireSpecifier);
      return;
    }
    const nestedRequireSpecifiers = getRequireSpecifiers(node.init);
    if (nestedRequireSpecifiers.size > 0) {
      nestedRequireBindings.set(name, nestedRequireSpecifiers);
    }
    if (node.init?.type === "ObjectExpression") {
      objectExportNames.set(
        name,
        collectObjectExportNames(node.init, objectExportNames, requireBindings, exportAllSpecifiers),
      );
    }
  });

  for (const statement of ast.body ?? []) {
    if (statement.type !== "ExpressionStatement") continue;
    const node = statement.expression;
    if (node?.type !== "AssignmentExpression") continue;
    const left = node.left;
    const right = node.right;
    if (
      left?.type === "MemberExpression" &&
      defaultExportLocalName &&
      idName(left.object) === defaultExportLocalName &&
      right?.type === "Identifier"
    ) {
      const exportName = memberExportName(left);
      if (
        exportName &&
        exportName !== "default" &&
        exportName !== "__esModule" &&
        !existingNamedExportNames.has(exportName)
      ) {
        defaultPropertyExportNames.set(exportName, right.value);
      }
    }
  }

  walk(ast.body, (node) => {
    if (node.type === "AssignmentExpression") {
      const left = node.left;
      const right = node.right;

      if (left?.type === "MemberExpression") {
        if (isModuleExportsObject(left)) {
          hasCommonJsExports = true;
          hasModuleExportsObject = true;
          const requireSpecifier = getRequireSpecifier(right);
          if (requireSpecifier) {
            exportAllSpecifiers.add(requireSpecifier);
            needsDefaultUnwrapHelper = true;
            node.right = parseStatements(
              `__unwrapDefault(require(${JSON.stringify(requireSpecifier)}));`,
            )[0].expression;
          }
          if (right?.type === "ObjectExpression") {
            if (hasObjectProperty(right, "__esModule") && hasObjectProperty(right, "default")) {
              hasEsModuleObjectDefault = true;
            }
            for (const exportName of collectObjectExportNames(
              right,
              objectExportNames,
              requireBindings,
              exportAllSpecifiers,
            )) {
              if (exportName === "default") hasExportsDefault = true;
              else exportNames.add(exportName);
            }
          }
          return;
        }

        if (isExportsObject(left.object)) {
          const exportName = memberExportName(left);
          if (!exportName || exportName === "__esModule") return;
          hasCommonJsExports = true;
          if (exportName === "default") hasExportsDefault = true;
          else {
            exportNames.add(exportName);
            directExportNames.add(exportName);
          }
        }
      }
      return;
    }

    if (node.type !== "CallExpression") return;
    const objectKeysBinding = getObjectKeysForEachBinding(node);
    if (objectKeysBinding) {
      const requireSpecifier = requireBindings.get(objectKeysBinding);
      if (requireSpecifier) {
        hasCommonJsExports = true;
        exportAllSpecifiers.add(requireSpecifier);
      }
      return;
    }

    if (
      idName(node.callee) === "__exportStar" &&
      Array.isArray(node.arguments) &&
      node.arguments.length >= 2 &&
      isExportsObject(argExpression(node.arguments[1]))
    ) {
      const requireSpecifier = getRequireSpecifier(argExpression(node.arguments[0]));
      if (requireSpecifier) {
        hasCommonJsExports = true;
        exportAllSpecifiers.add(requireSpecifier);
      }
      return;
    }

    if (isObjectAssignCall(node)) {
      const target = argExpression(node.arguments?.[0]);
      if (!isExportsObject(target)) return;

      hasCommonJsExports = true;
      for (const argument of node.arguments?.slice(1) ?? []) {
        const expression = argExpression(argument);
        const expressionName = idName(expression);

        if (expressionName) {
          const requireSpecifier = requireBindings.get(expressionName);
          if (requireSpecifier) addStaticExportNamesForRequireSpecifier(requireSpecifier);
          for (const nestedRequireSpecifier of nestedRequireBindings.get(expressionName) ?? []) {
            addStaticExportNamesForRequireSpecifier(nestedRequireSpecifier);
          }
        }

        const requireSpecifier = getRequireSpecifier(expression);
        if (requireSpecifier) addStaticExportNamesForRequireSpecifier(requireSpecifier);

        if (isNode(expression) && expression.type === "ObjectExpression") {
          for (const exportName of collectObjectExportNames(
            expression,
            objectExportNames,
            requireBindings,
            exportAllSpecifiers,
          )) {
            if (exportName === "default") hasExportsDefault = true;
            else exportNames.add(exportName);
          }
        }
      }
      return;
    }

    if (!isObjectDefinePropertyCall(node)) return;
    const target = argExpression(node.arguments?.[0]);
    const property = argExpression(node.arguments?.[1]);
    const descriptor = argExpression(node.arguments?.[2]);
    if (!isExportsObject(target)) return;
    const exportName = stringValue(property);
    if (!exportName || !isValidExportName(exportName) || exportName === "__esModule") return;

    hasCommonJsExports = true;
    if (exportName === "default") hasExportsDefault = true;
    else {
      exportNames.add(exportName);
      if (isNode(descriptor) && descriptor.type === "ObjectExpression" && !hasObjectProperty(descriptor, "get")) {
        directExportNames.add(exportName);
      }
    }
  });

  for (const [exportName, localName] of [...defaultPropertyExportNames].sort(([a], [b]) => a.localeCompare(b))) {
    ast.body.push(...parseStatements(`export { ${localName} as ${exportName} };`));
  }

  if (!hasCommonJsExports) {
    return printSync(ast as any).code;
  }

  ast.body.unshift(
    ...parseStatements("var module = { exports: {} }; var exports = module.exports;"),
    ...(needsDefaultUnwrapHelper ? [createDefaultUnwrapHelper()] : []),
    ...(exportNames.size > 0 ? [createLazyExportHelper()] : []),
  );

  for (const specifier of [...exportAllSpecifiers].sort()) {
    ast.body.push(...parseStatements(`export * from ${JSON.stringify(specifier)};`));
  }

  for (const exportName of [...exportNames].sort()) {
    if (exportName === "__esModule" || exportName === "default") continue;
    const exportIdentifier = getUniqueName(exportName, usedNames);
    const valueExpression = `module.exports.${exportName}`;
    ast.body.push(
      ...parseStatements(
        `const ${exportIdentifier} = ${
          directExportNames.has(exportName)
            ? valueExpression
            : `__lazyExport(() => ${valueExpression}, ${/^[A-Z]/.test(exportName)})`
        }; export { ${exportIdentifier} as ${exportName} };`,
      ),
    );
  }

  ast.body.push(
    ...parseStatements(
      `export default ${
        hasExportsDefault && (!hasModuleExportsObject || hasEsModuleObjectDefault)
          ? "module.exports.default"
          : "module.exports"
      };`,
    ),
  );

  return printSync(ast as any).code;
};
