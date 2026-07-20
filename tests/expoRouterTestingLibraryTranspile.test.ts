import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import { getReactNativeTransformations, transpile } from "../src/plugin";

describe("Expo Router testing-library transpile", () => {
  test("transpiles testing-library files", () => {
    const files = [
      require.resolve("expo-router/testing-library"),
      require.resolve("expo-router/build/testing-library"),
    ];

    for (const filePath of files) {
      const source = fs.readFileSync(filePath, "utf8");
      const transformations = getReactNativeTransformations(source, filePath);
      const output = transpile({ source, filePath });

      expect(transformations.length).toBeGreaterThan(0);
      expect(output).toContain("export default module.exports");
    }
  });

  test("re-exports testing-library names assigned onto exports", () => {
    const filePath = require.resolve("expo-router/build/testing-library");
    const source = fs.readFileSync(filePath, "utf8");
    const output = transpile({ source, filePath });

    expect(source).toContain("Object.assign(exports, rnTestingLibrary)");
    expect(output).toContain("export { _render as render }");
    expect(output).toContain("export { _waitFor as waitFor }");
    expect(output).not.toContain('export * from "@testing-library/react-native"');
  });
});
