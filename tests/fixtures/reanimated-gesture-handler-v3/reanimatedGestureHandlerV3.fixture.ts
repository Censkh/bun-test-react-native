import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react-native";
import { createElement } from "react";
import { GestureHandlerRootView, ScrollView } from "react-native-gesture-handler";

describe("react-native-gesture-handler v3 with Reanimated mock", () => {
  test("renders RNGH v3 ScrollView with Reanimated's Jest mock", async () => {
    const reanimated = require("react-native-reanimated");

    expect(typeof reanimated.isSharedValue).toBe("function");

    const screen = await render(
      createElement(GestureHandlerRootView, null, createElement(ScrollView, { testID: "scroll-view" })),
    );

    expect(screen.getByTestId("scroll-view")).toBeTruthy();
  });
});
