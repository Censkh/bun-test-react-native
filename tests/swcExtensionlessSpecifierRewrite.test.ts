import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { rewriteExtensionlessSpecifiersWithSwc } from "../src/transpilers/swc/extensionlessSpecifiers";

const testRoots: string[] = [];

const createTestRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bun-rn-swc-rewrite-"));
  testRoots.push(root);
  return root;
};

const writeFile = (root: string, relativePath: string, contents = "") => {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
  return filePath;
};

afterEach(() => {
  for (const root of testRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("SWC extensionless platform specifier rewrite", () => {
  test("rewrites ESM, CJS, and dynamic import specifiers", () => {
    const root = createTestRoot();
    const importer = writeFile(root, "src/example.ts");
    writeFile(root, "src/value.ios.ts");
    writeFile(root, "other.native.ts");
    writeFile(root, "src/star.native.ts");
    writeFile(root, "src/required.ios.js");
    writeFile(root, "dynamic.ios.js");

    const output = rewriteExtensionlessSpecifiersWithSwc(
      `
        import value from "./value";
        export { other } from "../other";
        export * from "./star";
        const required = require("./required");
        const dynamic = import("../dynamic");
      `,
      importer,
      { platform: "ios", projectRoot: root },
    );

    expect(output).toContain('from "./value.ios.ts"');
    expect(output).toContain('from "../other.native.ts"');
    expect(output).toContain('from "./star.native.ts"');
    expect(output).toContain('require("./required.ios.js")');
    expect(output).toContain('import("../dynamic.ios.js")');
  });

  test("leaves extension and package specifiers alone", () => {
    const output = rewriteExtensionlessSpecifiersWithSwc(
      `
        import value from "./value.js";
        export * from "react-native";
        const required = require("../required.json");
      `,
      "example.js",
    );

    expect(output).toContain('from "./value.js"');
    expect(output).toContain('from "react-native"');
    expect(output).toContain('require("../required.json")');
  });

  test("leaves unresolved extensionless specifiers alone", () => {
    const root = createTestRoot();
    const importer = writeFile(root, "src/example.ts");
    const output = rewriteExtensionlessSpecifiersWithSwc(
      'import value from "./missing";',
      importer,
      { platform: "ios", projectRoot: root },
    );

    expect(output).toContain('from "./missing"');
  });

  test("leaves base-only extensionless specifiers alone", () => {
    const root = createTestRoot();
    const importer = writeFile(root, "src/example.ts");
    writeFile(root, "src/value.ts");
    const output = rewriteExtensionlessSpecifiersWithSwc('import value from "./value";', importer, {
      platform: "ios",
      projectRoot: root,
    });

    expect(output).toContain('from "./value"');
  });
});
