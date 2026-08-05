import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import { renderRouter } from "expo-router/testing-library";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import React from "react";
import { Text } from "react-native";
import { getReactNativeTransformations, transpile } from "../../../src/plugin";

describe("expo-router", () => {
  test("renders an in-memory router with renderRouter", async () => {
    const result = renderRouter({
      index: () => React.createElement(React.Fragment),
      profile: () => React.createElement(React.Fragment),
    });

    expect(result.getPathname()).toBe("/");
    expect(result.getSegments()).toEqual([]);
  });

  test("renders NativeTabs layouts in the test runtime", () => {
    const result = renderRouter({
      _layout: () =>
        React.createElement(
          NativeTabs,
          null,
          React.createElement(NativeTabs.Trigger, { name: "index" }),
          React.createElement(NativeTabs.Trigger, { name: "create" }),
        ),
      index: () => React.createElement(Text, null, "Home"),
      create: () => React.createElement(Text, null, "Create"),
    });

    expect(result.getPathname()).toBe("/");
  });

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
