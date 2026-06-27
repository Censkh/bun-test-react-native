import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  hasExtensionlessPlatformSpecifier,
  rewriteExtensionlessPlatformSpecifiers,
} from "../src/plugin";

const testRoots: string[] = [];

const createTestRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bun-rn-rewrite-"));
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

describe("extensionless platform specifier rewrite", () => {
  test("detects only extensionless relative module specifiers", () => {
    expect(hasExtensionlessPlatformSpecifier('const value = "./Thing";')).toBe(false);
    expect(hasExtensionlessPlatformSpecifier('require("./Thing.js");')).toBe(false);
    expect(hasExtensionlessPlatformSpecifier('require("react-native");')).toBe(false);
    expect(hasExtensionlessPlatformSpecifier('import { Thing } from "./Thing";')).toBe(true);
    expect(hasExtensionlessPlatformSpecifier('export { Thing } from "./Thing";')).toBe(true);
    expect(hasExtensionlessPlatformSpecifier('export * from "./Thing";')).toBe(true);
    expect(hasExtensionlessPlatformSpecifier('require("./Thing");')).toBe(true);
  });

  test("rewrites CommonJS require calls to platform files", () => {
    const root = createTestRoot();
    const importer = writeFile(
      root,
      "node_modules/react-native-screens/lib/commonjs/components/tabs/host/index.js",
    );
    writeFile(
      root,
      "node_modules/react-native-screens/lib/commonjs/components/tabs/host/TabsHost.ios.js",
    );

    const output = rewriteExtensionlessPlatformSpecifiers(
      'const TabsHost = require("./TabsHost");',
      importer,
      { platform: "ios", projectRoot: root },
    );

    expect(output).toContain('require("./TabsHost.ios.js")');
  });

  test("rewrites ESM import and export specifiers to platform files", () => {
    const root = createTestRoot();
    const importer = writeFile(root, "src/index.ts");
    writeFile(root, "src/Button.ios.ts");
    const source = `
      import { Button } from "./Button";
      export { Button } from "./Button";
    `;

    const output = rewriteExtensionlessPlatformSpecifiers(source, importer, {
      platform: "ios",
      projectRoot: root,
    });

    expect(hasExtensionlessPlatformSpecifier(source, "ts")).toBe(true);
    expect(output).toContain('from "./Button.ios.ts"');
  });

  test("rewrites React Native Platform compatibility imports to platform files", () => {
    const root = createTestRoot();
    const importer = writeFile(root, "node_modules/react-native/Libraries/Utilities/Platform.js");
    writeFile(root, "node_modules/react-native/Libraries/Utilities/Platform.ios.js");

    const output = rewriteExtensionlessPlatformSpecifiers(
      'import Platform from "./Platform";\nexport default Platform;',
      importer,
      { platform: "ios", projectRoot: root },
    );

    expect(output).toContain('from "./Platform.ios.js"');
  });

  test("rewrites generated ESM export-star specifiers to platform files", () => {
    const root = createTestRoot();
    const importer = writeFile(root, "node_modules/react-native-platform-fixture/index.js");
    writeFile(root, "node_modules/react-native-platform-fixture/Thing.ios.js");

    const output = rewriteExtensionlessPlatformSpecifiers(
      'module.exports = require("./Thing");\nexport * from "./Thing";',
      importer,
      { platform: "ios", projectRoot: root },
    );

    expect(output).toContain('require("./Thing.ios.js")');
    expect(output).toContain('export * from "./Thing.ios.js"');
  });

  test("leaves files without extensionless module specifiers unchanged", () => {
    const root = createTestRoot();
    const importer = writeFile(root, "src/index.ts");
    writeFile(root, "src/Button.ios.ts");
    const source = `
      const label = "./Button";
      const explicit = require("./Button.js");
      import { value } from "react-native";
    `;

    expect(hasExtensionlessPlatformSpecifier(source, "ts")).toBe(false);
    expect(
      rewriteExtensionlessPlatformSpecifiers(source, importer, {
        platform: "ios",
        projectRoot: root,
      }),
    ).toBe(source);
  });

  test("leaves unresolved extensionless specifiers unchanged", () => {
    const root = createTestRoot();
    const importer = writeFile(root, "src/index.ts");
    const source = 'export { Missing } from "./Missing";';

    expect(
      rewriteExtensionlessPlatformSpecifiers(source, importer, {
        platform: "ios",
        projectRoot: root,
      }),
    ).toContain('from "./Missing"');
  });
});
