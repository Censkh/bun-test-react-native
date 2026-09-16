import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react-native";
import React from "react";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const InsetsReader = () => {
  const insets = useSafeAreaInsets();
  return React.createElement("Text", { testID: "insets" }, JSON.stringify(insets));
};

const testMetrics = {
  frame: { height: 640, width: 320, x: 0, y: 0 },
  insets: { bottom: 0, left: 0, right: 0, top: 0 },
};

describe("react-native-safe-area-context without package jest mock", () => {
  test("loads without the package jest mock", () => {
    expect(initialWindowMetrics).toBeNull();
    expect(SafeAreaProvider).toBeDefined();
    expect(SafeAreaView).toBeDefined();
  });

  test("renders SafeAreaProvider and SafeAreaView", async () => {
    const result = await render(
      React.createElement(
        SafeAreaProvider,
        { initialMetrics: testMetrics },
        React.createElement(SafeAreaView, null, React.createElement(InsetsReader)),
      ),
    );

    expect(result.getByTestId("insets").props.children).toContain("top");
  });
});
