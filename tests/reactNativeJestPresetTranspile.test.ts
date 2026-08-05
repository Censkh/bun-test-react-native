import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import { transpile } from "../src/plugin";

describe("React Native source transpile", () => {
  test("transpiles react-native View implementation", () => {
    const viewPath = require.resolve("react-native/Libraries/Components/View/View.js");
    const source = fs.readFileSync(viewPath, "utf8");
    const output = transpile({ source, filePath: viewPath });

    expect(output).toContain("export default View");
    expect(output).not.toContain("import type");
    expect(output).not.toContain("type ViewProps");
  });

  test("transpiles @react-native/normalize-colors CommonJS default export", () => {
    const normalizeColorsPath = require.resolve("@react-native/normalize-colors/index.js");
    const source = fs.readFileSync(normalizeColorsPath, "utf8");
    const output = transpile({ source, filePath: normalizeColorsPath });

    expect(output).toContain("module.exports = normalizeColor");
    expect(output).toContain("export default module.exports");
  });
});
