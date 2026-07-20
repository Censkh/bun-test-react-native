import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import { transpile } from "../src/plugin";

describe("React Native module transpile", () => {
  test("exports properties assigned to an ESM default export as named exports", () => {
    const output = transpile({
      filePath: "unknown.js",
      source: `
      function setCustomSourceTransformer() {}
      function addCustomSourceTransformer() {}
      const pickScale = () => 1;
      function resolveAssetSource() {}

      resolveAssetSource.pickScale = pickScale;
      resolveAssetSource.setCustomSourceTransformer = setCustomSourceTransformer;
      resolveAssetSource.addCustomSourceTransformer = addCustomSourceTransformer;
      export default resolveAssetSource;
    `,
    });

    expect(output).toMatch(/export\s*\{\s*addCustomSourceTransformer(?:\s+as\s+addCustomSourceTransformer)?\s*\}/);
    expect(output).toMatch(/export\s*\{\s*pickScale(?:\s+as\s+pickScale)?\s*\}/);
    expect(output).toMatch(/export\s*\{\s*setCustomSourceTransformer(?:\s+as\s+setCustomSourceTransformer)?\s*\}/);
    expect(output).toContain("export default resolveAssetSource");
  });

  test("transpiles react-native resolveAssetSource default properties to named exports", () => {
    const resolveAssetSourcePath = require.resolve("react-native/Libraries/Image/resolveAssetSource.js");
    const source = fs.readFileSync(resolveAssetSourcePath, "utf8");
    const output = transpile({ source, filePath: resolveAssetSourcePath });

    expect(output).toMatch(/export\s*\{\s*addCustomSourceTransformer(?:\s+as\s+addCustomSourceTransformer)?\s*\}/);
    expect(output).toMatch(/export\s*\{\s*pickScale(?:\s+as\s+pickScale)?\s*\}/);
    expect(output).toMatch(/export\s*\{\s*setCustomSourceTransformer(?:\s+as\s+setCustomSourceTransformer)?\s*\}/);
    expect(output).toContain("export default resolveAssetSource");
    expect(output).not.toContain("@flow");
  });

  test("does not export method-local static property assignments", () => {
    const output = transpile({
      filePath: "unknown.js",
      source: `
      class StatusBar {
        static _currentValues = null;
        static update(mergedProps) {
          StatusBar._currentValues = mergedProps;
        }
      }

      export default StatusBar;
    `,
    });

    expect(output).not.toContain("export { mergedProps as _currentValues }");
    expect(output).toContain("export default StatusBar");
  });

  test("does not export react-native StatusBar method locals", () => {
    const statusBarPath = require.resolve("react-native/Libraries/Components/StatusBar/StatusBar.js");
    const source = fs.readFileSync(statusBarPath, "utf8");
    const output = transpile({ source, filePath: statusBarPath });

    expect(output).not.toContain("export { mergedProps as _currentValues }");
  });

  test("does not export react-native XMLHttpRequest method locals", () => {
    const xmlHttpRequestPath = require.resolve("react-native/Libraries/Network/XMLHttpRequest.js");
    const source = fs.readFileSync(xmlHttpRequestPath, "utf8");
    const output = transpile({ source, filePath: xmlHttpRequestPath });

    expect(output).not.toContain("export { interceptor as _interceptor }");
  });

  test("transpiles react-native/index.js to ESM-compatible exports", () => {
    const reactNativeIndexPath = require.resolve("react-native/index.js");
    const source = fs.readFileSync(reactNativeIndexPath, "utf8");
    const output = transpile({ source, filePath: reactNativeIndexPath });

    expect(output).toContain("export default module.exports");
    expect(output).toContain("function __lazyExport(getValue, component)");
    expect(output).toMatch(
      /const\s+_Platform\s*=\s*__lazyExport\(\s*\(\)\s*=>\s*module\.exports\.Platform,\s*true\s*\)/,
    );
    expect(output).toMatch(
      /const\s+_StyleSheet\s*=\s*__lazyExport\(\s*\(\)\s*=>\s*module\.exports\.StyleSheet,\s*true\s*\)/,
    );
    expect(output).toMatch(
      /const\s+_TurboModuleRegistry\s*=\s*__lazyExport\(\s*\(\)\s*=>\s*module\.exports\.TurboModuleRegistry,\s*true\s*\)/,
    );
    expect(output).toContain("export { _StyleSheet as StyleSheet }");
    expect(output).not.toContain("import typeof");
    expect(output).not.toContain("@flow");
  });
});
