import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getReactNativeTransformations, shouldTransformReactNativeSource, transpile } from "../src/plugin";

const testRoots: string[] = [];

const createTestRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bun-rn-transform-"));
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

describe("React Native transform decision", () => {
  test("transforms Flow JavaScript sources", () => {
    expect(
      getReactNativeTransformations(
        `
        // @flow
        const value: string = "ok";
        export default value;
      `,
        "/project/node_modules/react-native/Libraries/Example.js",
      ),
    ).toEqual(["flow"]);
  });

  test("transforms CommonJS export sources", () => {
    expect(
      getReactNativeTransformations(
        "module.exports = require('./Thing');",
        "/project/node_modules/@react-native/normalize-colors/index.js",
      ),
    ).toEqual(["commonjs-exports", "rewrite-relative-specifiers"]);
  });

  test("transforms resolved extensionless platform specifiers without CJS or Flow", () => {
    const root = createTestRoot();
    const importer = writeFile(root, "node_modules/react-native-screens/lib/module/index.js");
    writeFile(root, "node_modules/react-native-screens/lib/module/Thing.ios.js");

    expect(
      getReactNativeTransformations('import Thing from "./Thing";\nexport default Thing;', importer, undefined, {
        platform: "ios",
        projectRoot: root,
      }),
    ).toEqual(["rewrite-extensionless-specifiers", "rewrite-relative-specifiers"]);
  });

  test("does not select a platform file for base-only extensionless specifiers", () => {
    const root = createTestRoot();
    const importer = writeFile(root, "node_modules/react-native-reanimated/src/index.ts");
    writeFile(root, "node_modules/react-native-reanimated/src/Thing.ts");

    expect(
      getReactNativeTransformations('import Thing from "./Thing";\nexport default Thing;', importer, undefined, {
        platform: "ios",
        projectRoot: root,
      }),
    ).toEqual(["typescript", "rewrite-relative-specifiers"]);
  });

  test("keeps CommonJS transform without base-only extensionless rewrite", () => {
    const root = createTestRoot();
    const importer = writeFile(root, "node_modules/react-native-reanimated/lib/module/mock.js");
    writeFile(root, "node_modules/react-native-reanimated/lib/module/Thing.js");

    expect(
      getReactNativeTransformations("module.exports = require('./Thing');", importer, undefined, {
        platform: "ios",
        projectRoot: root,
      }),
    ).toEqual(["commonjs-exports", "rewrite-relative-specifiers"]);
  });

  test("canonicalizes base-only CommonJS dependencies after export transpilation", () => {
    const root = createTestRoot();
    const importer = writeFile(root, "node_modules/expo-router/build/native-tabs/NativeTabsView.ios.js");
    const dependency = writeFile(root, "node_modules/expo-router/build/native-tabs/NativeTabsView.shared.js");
    const source = "const shared = require('./NativeTabsView.shared'); module.exports = shared;";
    const options = { platform: "ios", projectRoot: root };

    expect(getReactNativeTransformations(source, importer, undefined, options)).toEqual([
      "commonjs-exports",
      "rewrite-relative-specifiers",
    ]);
    expect(transpile({ source, filePath: importer, options })).toContain(
      `require(${JSON.stringify(pathToFileURL(dependency).href)})`,
    );
  });

  test("canonicalizes platform CommonJS dependencies after platform selection", () => {
    const root = createTestRoot();
    const importer = writeFile(root, "node_modules/react-native-screens/lib/module/index.js");
    const dependency = writeFile(root, "node_modules/react-native-screens/lib/module/TabsHost.ios.js");
    const source = "const TabsHost = require('./TabsHost'); module.exports = TabsHost;";
    const options = { platform: "ios", projectRoot: root };

    expect(getReactNativeTransformations(source, importer, undefined, options)).toEqual([
      "commonjs-exports",
      "rewrite-extensionless-specifiers",
      "rewrite-relative-specifiers",
    ]);
    expect(transpile({ source, filePath: importer, options })).toContain(
      `require(${JSON.stringify(pathToFileURL(dependency).href)})`,
    );
  });

  test("uses TypeScript transform only for TypeScript loaders", () => {
    expect(
      getReactNativeTransformations(
        "export type Value = string;\nexport default 1;",
        "/project/node_modules/example/index.ts",
      ),
    ).toEqual(["typescript"]);
  });

  test("does not transform by reanimated path alone", () => {
    expect(
      shouldTransformReactNativeSource(
        "export default {};",
        "/project/node_modules/react-native-reanimated/lib/module/mock.js",
      ),
    ).toBe(false);
  });

  test("keeps commonjs-exports when it is the only transform", () => {
    expect(
      getReactNativeTransformations(
        "module.exports = {};",
        "/project/node_modules/react-native-reanimated/lib/module/mock.js",
      ),
    ).toEqual(["commonjs-exports"]);
  });

  test("keeps commonjs-exports when another transform also applies", () => {
    const root = createTestRoot();
    const importer = writeFile(root, "node_modules/react-native-reanimated/lib/module/mock.js");
    writeFile(root, "node_modules/react-native-reanimated/lib/module/Thing.ios.js");

    expect(
      getReactNativeTransformations("module.exports = require('./Thing');", importer, undefined, {
        platform: "ios",
        projectRoot: root,
      }),
    ).toEqual(["commonjs-exports", "rewrite-extensionless-specifiers", "rewrite-relative-specifiers"]);
  });

  test("skips plain ESM without platform specifiers", () => {
    expect(
      getReactNativeTransformations(
        'export const value = "ok";',
        "/project/node_modules/react-native-screens/lib/module/plain.js",
      ),
    ).toEqual([]);
  });
});
