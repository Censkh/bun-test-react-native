import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { transpile } from "../../../src/plugin";

const importNativeReanimated = () => import("react-native-reanimated/lib/module/ReanimatedModule/NativeReanimated.js");

describe("react-native-reanimated Jest setup compatibility", () => {
  test("loads Reanimated's own mock and setup helpers", () => {
    const reanimated = require("react-native-reanimated/mock");

    expect(typeof reanimated.default).toBe("object");
    expect(typeof reanimated.setUpTests).toBe("function");

    reanimated.setUpTests();

    expect(typeof reanimated.useSharedValue).toBe("function");
    expect(reanimated.useSharedValue(1).value).toBe(1);
  });

  test("loads Reanimated native module with Worklets named exports", async () => {
    const nativeReanimated = await importNativeReanimated();

    expect(typeof nativeReanimated.createNativeReanimatedModule).toBe("function");
  });

  test("transpiles Reanimated mock sources to ESM-compatible exports", () => {
    const mockPath = require.resolve("react-native-reanimated/src/mock.ts");
    const source = fs.readFileSync(mockPath, "utf8");
    const output = transpile({ source, filePath: mockPath });

    expect(output).toContain("export default");
    expect(output).toContain("export { _setUpTests as setUpTests }");
    expect(output).toContain("export { _useSharedValue as useSharedValue }");
    expect(output).toContain("var module =");
    expect(output).not.toContain("interface ");
  });

  test("transpiles Reanimated's CommonJS mock wrapper to ESM re-exports", () => {
    const mockPath = require.resolve("react-native-reanimated/mock.js");
    const source = fs.readFileSync(mockPath, "utf8");
    const output = transpile({ source, filePath: mockPath });

    expect(output).toContain(
      `export * from ${JSON.stringify(pathToFileURL(path.join(path.dirname(mockPath), "src/mock.ts")).href)}`,
    );
    expect(output).toContain(
      `export * from ${JSON.stringify(pathToFileURL(path.join(path.dirname(mockPath), "src/mock-svg.ts")).href)}`,
    );
    expect(output).toContain("export default module.exports");
  });
});
