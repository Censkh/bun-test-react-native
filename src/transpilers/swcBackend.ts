import { transformSync as swcTransformSync } from "@swc/core";
import { applyCommonJsExportsWithSwc } from "./swc/commonJsExports";
import { rewriteExtensionlessSpecifiersWithSwc } from "./swc/extensionlessSpecifiers";
import { lowerFlowMatchSyntax } from "./swc/flowMatch";
import type { TranspileBackend } from "./types";

export const swcBackend: TranspileBackend = {
  name: "swc",
  transform(source, options) {
    let output = source;

    if (options.transforms.includes("flow")) {
      output = lowerFlowMatchSyntax(output);
      output = output.replace(/^\s*\/\/\s*@flow[^\n]*\n?/m, "");
    }

    if (options.transforms.includes("flow") || options.transforms.includes("typescript")) {
      const isTypeScript = options.transforms.includes("typescript");
      const result = swcTransformSync(output, {
        filename: options.filename,
        jsc: {
          parser: isTypeScript
            ? {
                syntax: "typescript",
                tsx: options.filename.endsWith(".tsx"),
              }
            : {
                components: true,
                enums: true,
                jsx: true,
                syntax: "flow",
              },
          ...(options.transforms.includes("flow") || (isTypeScript && options.filename.endsWith(".tsx"))
            ? {
                transform: {
                  react: {
                    runtime: "automatic",
                  },
                  // Flow only: match Babel's `flow-strip-types`, which drops a
                  // type-only field like `state: State;` instead of emitting a
                  // real class field. With define semantics that field runs
                  // `Object.defineProperty(this, "state", ...)` after `super()`
                  // and throws inside `VirtualizedList`, whose parent
                  // (`StateSafePureComponent`) already defined `state` as a
                  // non-configurable accessor: every FlatList render fails with
                  // "Attempting to change configurable attribute of
                  // unconfigurable property".
                  ...(options.transforms.includes("flow") ? { useDefineForClassFields: false } : {}),
                },
              }
            : {}),
          target: "es2022",
        },
        module: {
          type: "es6",
        },
        sourceMaps: false,
      });

      output = result.code;
    }

    if (options.transforms.includes("commonjs-exports")) {
      output = applyCommonJsExportsWithSwc(output, options.filename);
    }

    if (options.transforms.includes("rewrite-extensionless-specifiers")) {
      output = rewriteExtensionlessSpecifiersWithSwc(output, options.filename, options.resolverOptions);
    }

    return output;
  },
};
