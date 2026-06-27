import { describe, expect, test } from "bun:test";
import { renderRouter } from "expo-router/testing-library";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import React from "react";
import { Text } from "react-native";

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
});
