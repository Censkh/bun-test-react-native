import { describe, expect, test } from "bun:test";
import { transpile } from "../../src/plugin";

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
});
