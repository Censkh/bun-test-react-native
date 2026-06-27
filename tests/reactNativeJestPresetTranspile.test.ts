import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import { createRequire } from "node:module";
import { transpile } from "../src/plugin";

const require = createRequire(import.meta.url);

describe("React Native Jest preset transpile", () => {
  test("strips Flow generics from View mock", () => {
    const viewMockPath = require.resolve("@react-native/jest-preset/jest/mocks/View.js");
    const source = fs.readFileSync(viewMockPath, "utf8");
    const output = transpile({ source, filePath: viewMockPath });

    expect(output).toContain("jest.requireActual('../mockComponent').default");
    expect(output).toContain("jest.requireActual('../MockNativeMethods').default");
    expect(output).not.toContain("requireActual<");
    expect(output).not.toContain("import typeof");
  });

  test("uses automatic JSX runtime for Flow JSX mocks", () => {
    const modalMockPath = require.resolve("@react-native/jest-preset/jest/mocks/Modal.js");
    const source = fs.readFileSync(modalMockPath, "utf8");
    const output = transpile({ source, filePath: modalMockPath });

    expect(output).toContain("react/jsx-runtime");
    expect(output).not.toContain("React.createElement");
    expect(output).not.toContain("React.Node");
  });

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
