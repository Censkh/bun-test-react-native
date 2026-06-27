import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveReactNativeImport } from "../src/plugin";

const testRoots: string[] = [];

const createTestRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bun-rn-plugin-"));
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

describe("resolveReactNativeImport", () => {
  test("prefers platform extension over native and base files", () => {
    const root = createTestRoot();
    const importer = writeFile(root, "src/App.tsx");
    writeFile(root, "src/Button.tsx");
    writeFile(root, "src/Button.native.tsx");
    const iosButton = writeFile(root, "src/Button.ios.tsx");

    expect(
      resolveReactNativeImport({ importer, specifier: "./Button" }, { platform: "ios", projectRoot: root }),
    ).toEqual({ path: iosButton });
  });

  test("resolves extensionless specifiers through platform candidates", () => {
    const root = createTestRoot();
    const importer = writeFile(root, "src/App.tsx");
    writeFile(root, "src/Button.tsx");
    const iosButton = writeFile(root, "src/Button.ios.tsx");

    expect(
      resolveReactNativeImport({ importer, specifier: "./Button" }, { platform: "ios", projectRoot: root }),
    ).toEqual({ path: iosButton });
  });

  test("resolves extensionless specifiers to base files when no platform file exists", () => {
    const root = createTestRoot();
    const importer = writeFile(root, "src/App.tsx");
    const button = writeFile(root, "src/Button.tsx");

    expect(
      resolveReactNativeImport({ importer, specifier: "./Button" }, { platform: "ios", projectRoot: root }),
    ).toEqual({ path: button });
  });

  test("falls back to native extension before base files", () => {
    const root = createTestRoot();
    const importer = writeFile(root, "src/App.tsx");
    writeFile(root, "src/Button.tsx");
    const nativeButton = writeFile(root, "src/Button.native.tsx");

    expect(
      resolveReactNativeImport({ importer, specifier: "./Button" }, { platform: "android", projectRoot: root }),
    ).toEqual({ path: nativeButton });
  });

  test("resolves native TypeScript files before base TypeScript files", () => {
    const root = createTestRoot();
    const importer = writeFile(root, "node_modules/expo/src/async-require/hmr.ts");
    writeFile(root, "node_modules/expo/src/async-require/hmrUtils.ts");
    const nativeHmrUtils = writeFile(root, "node_modules/expo/src/async-require/hmrUtils.native.ts");

    expect(
      resolveReactNativeImport({ importer, specifier: "./hmrUtils" }, { platform: "ios", projectRoot: root }),
    ).toEqual({ path: nativeHmrUtils });
  });

  test("resolves platform files for third-party package relative imports", () => {
    const root = createTestRoot();
    const importer = writeFile(root, "node_modules/react-native-screens/lib/commonjs/host/index.js");
    const iosTabsHost = writeFile(root, "node_modules/react-native-screens/lib/commonjs/host/TabsHost.ios.js");
    writeFile(root, "node_modules/react-native-screens/lib/commonjs/host/TabsHost.android.js");

    expect(
      resolveReactNativeImport({ importer, specifier: "./TabsHost" }, { platform: "ios", projectRoot: root }),
    ).toEqual({ path: iosTabsHost });
  });

  test("uses base files before native files inside react-native-worklets", () => {
    const root = createTestRoot();
    const importer = writeFile(root, "node_modules/react-native-worklets/lib/module/index.js");
    const baseNativeWorklets = writeFile(
      root,
      "node_modules/react-native-worklets/lib/module/WorkletsModule/NativeWorklets.js",
    );
    writeFile(root, "node_modules/react-native-worklets/lib/module/WorkletsModule/NativeWorklets.native.js");

    expect(
      resolveReactNativeImport(
        { importer, specifier: "./WorkletsModule/NativeWorklets" },
        { platform: "ios", projectRoot: root },
      ),
    ).toEqual({ path: baseNativeWorklets });
  });

  test("resolves package main values with platform extensions", () => {
    const root = createTestRoot();
    const importer = writeFile(root, "src/App.tsx");
    writeFile(root, "node_modules/example/package.json", JSON.stringify({ main: "./index" }));
    const iosEntry = writeFile(root, "node_modules/example/index.ios.js");
    writeFile(root, "node_modules/example/index.js");

    expect(
      resolveReactNativeImport({ importer, specifier: "example" }, { platform: "ios", projectRoot: root }),
    ).toEqual({ path: iosEntry });
  });

  test("uses string react-native package field before main", () => {
    const root = createTestRoot();
    const importer = writeFile(root, "src/App.tsx");
    writeFile(
      root,
      "node_modules/example/package.json",
      JSON.stringify({
        main: "./index.js",
        "react-native": "./native-entry.js",
      }),
    );
    writeFile(root, "node_modules/example/index.js");
    const nativeEntry = writeFile(root, "node_modules/example/native-entry.js");

    expect(
      resolveReactNativeImport({ importer, specifier: "example" }, { platform: "ios", projectRoot: root }),
    ).toEqual({ path: nativeEntry });
  });

  test("uses object react-native package field for subpath replacements", () => {
    const root = createTestRoot();
    const importer = writeFile(root, "src/App.tsx");
    writeFile(
      root,
      "node_modules/example/package.json",
      JSON.stringify({
        main: "./index.js",
        "react-native": {
          "./server-only": "./empty-native.js",
        },
      }),
    );
    const nativeReplacement = writeFile(root, "node_modules/example/empty-native.js");
    writeFile(root, "node_modules/example/server-only.js");

    expect(
      resolveReactNativeImport({ importer, specifier: "example/server-only" }, { platform: "ios", projectRoot: root }),
    ).toEqual({ path: nativeReplacement });
  });

  test("returns empty namespace sentinel for false react-native package map entries", () => {
    const root = createTestRoot();
    const importer = writeFile(root, "src/App.tsx");
    writeFile(
      root,
      "node_modules/example/package.json",
      JSON.stringify({
        main: "./index.js",
        "react-native": {
          "./server-only": false,
        },
      }),
    );

    expect(
      resolveReactNativeImport({ importer, specifier: "example/server-only" }, { platform: "ios", projectRoot: root }),
    ).toEqual({ path: "empty:" });
  });

  test("resolves package exports before filesystem subpath wrappers", () => {
    const root = createTestRoot();
    const importer = writeFile(root, "src/App.tsx");
    writeFile(
      root,
      "node_modules/example/package.json",
      JSON.stringify({
        exports: {
          "./legacy": {
            default: "./src/legacy/index.ts",
          },
        },
      }),
    );
    writeFile(root, "node_modules/example/legacy.ts");
    const exportedEntry = writeFile(root, "node_modules/example/src/legacy/index.ts");

    const result = resolveReactNativeImport(
      { importer, specifier: "example/legacy" },
      { platform: "ios", projectRoot: root },
    );

    expect(result?.path).toEndWith(fs.realpathSync(exportedEntry).replace(fs.realpathSync(root), ""));
  });

  test("does not resolve node builtins", () => {
    expect(resolveReactNativeImport({ specifier: "node:path" }, { platform: "ios" })).toBeNull();
  });
});
