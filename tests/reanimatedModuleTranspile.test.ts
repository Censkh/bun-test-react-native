import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import { hasCjsDynamicExport, transpile } from "../src/plugin";


describe("CommonJS dynamic export detection", () => {
  test("ignores literal Object.defineProperty export getters", () => {
    expect(
      hasCjsDynamicExport(`
        Object.defineProperty(exports, "GestureHandlerRootView", {
          enumerable: true,
          get: function () {
            return _GestureHandlerRootView.default;
          }
        });
      `),
    ).toBe(false);
  });

  test("detects dynamic Object.defineProperty export getters", () => {
    expect(
      hasCjsDynamicExport(`
        Object.keys(_SafeAreaContext).forEach(function (key) {
          Object.defineProperty(exports, key, {
            enumerable: true,
            get: function () {
              return _SafeAreaContext[key];
            }
          });
        });
      `),
    ).toBe(true);
  });

  test("detects module.exports default export assignments", () => {
    expect(hasCjsDynamicExport("module.exports = normalizeColor;")).toBe(true);
  });

  test("does not treat react-native-gesture-handler literal getter exports as dynamic", () => {
    const gestureHandlerIndexPath = require.resolve("react-native-gesture-handler-2/lib/commonjs/index.js");
    const source = fs.readFileSync(gestureHandlerIndexPath, "utf8");

    expect(source).toContain('Object.defineProperty(exports, "GestureHandlerRootView"');
    expect(hasCjsDynamicExport(source)).toBe(false);
  });
});

describe("Reanimated Jest mock transpile", () => {
  test("transpiles react-native-reanimated/src/mock.ts to ESM-compatible exports", () => {
    const mockPath = require.resolve("react-native-reanimated/src/mock.ts");
    const source = fs.readFileSync(mockPath, "utf8");
    const output = transpile({ source, filePath: mockPath });

    expect(output).toContain("export default");
    expect(output).toContain("export { _setUpTests as setUpTests }");
    expect(output).toContain("export { _useSharedValue as useSharedValue }");
    expect(output).toContain("var module =");
    expect(output).not.toContain("interface ");
  });

  test("transpiles react-native-reanimated/mock.js spread exports to ESM re-exports", () => {
    const mockPath = require.resolve("react-native-reanimated/mock.js");
    const source = fs.readFileSync(mockPath, "utf8");
    const output = transpile({ source, filePath: mockPath });

    expect(output).toContain('export * from "./src/mock"');
    expect(output).toContain('export * from "./src/mock-svg"');
    expect(output).toContain("export default module.exports");
  });

  test("exports __esModule CommonJS object defaults from module.exports.default", () => {
    const output = transpile({
      filePath: "/project/node_modules/react-native-reanimated/src/mock.ts",
      source: `
        const Animated = { View: "View" };

        module.exports = {
          __esModule: true,
          useAnimatedStyle: () => ({}),
          default: Animated,
        };
      `,
    });

    expect(output).toContain("export { _useAnimatedStyle as useAnimatedStyle }");
    expect(output).toContain("export default module.exports.default");
    expect(output).not.toContain("export default module.exports;");
  });

  test("transpiles direct CommonJS re-export wrappers to ESM re-exports", () => {
    const output = transpile({
      filePath: "/project/node_modules/expo-router/testing-library.js",
      source: 'module.exports = require("./build/testing-library");',
    });

    expect(output).toContain('module.exports = __unwrapDefault(require("./build/testing-library"))');
    expect(output).toContain('export * from "./build/testing-library"');
    expect(output).toContain("export default module.exports");
  });

  test("transpiles TypeScript __exportStar helpers to ESM re-exports", () => {
    const output = transpile({
      filePath: "/project/node_modules/expo-router/build/react-navigation/native/index.js",
      source: '__exportStar(require("../core"), exports);',
    });

    expect(output).toContain('export * from "../core"');
  });

  test("transpiles Babel Object.keys re-export loops to ESM re-exports", () => {
    const output = transpile({
      filePath: "/project/node_modules/react-native-safe-area-context/lib/commonjs/index.js",
      source: `
        var _SafeAreaContext = require("./SafeAreaContext");
        Object.keys(_SafeAreaContext).forEach(function (key) {
          if (key === "default" || key === "__esModule") return;
          Object.defineProperty(exports, key, {
            enumerable: true,
            get: function () {
              return _SafeAreaContext[key];
            }
          });
        });
      `,
    });

    expect(output).toContain('export * from "./SafeAreaContext"');
  });

  test("only wraps Object.defineProperty getter exports in lazy proxies", () => {
    const output = transpile({
      filePath: "/project/node_modules/react-native-example/lib/commonjs/index.js",
      source: `
        Object.defineProperty(exports, "GetterExport", {
          enumerable: true,
          get: function () {
            return require("./GetterExport").default;
          },
        });
        Object.defineProperty(exports, "ValueExport", {
          enumerable: true,
          value: require("./ValueExport").default,
        });
      `,
    });

    expect(output).toMatch(
      /const\s+_GetterExport\s*=\s*__lazyExport\(\s*\(\)\s*=>\s*module\.exports\.GetterExport,\s*true\s*\)/,
    );
    expect(output).toContain("const _ValueExport = module.exports.ValueExport");
    expect(output).not.toContain("const _ValueExport = __lazyExport(() => module.exports.ValueExport, true)");
  });
});
