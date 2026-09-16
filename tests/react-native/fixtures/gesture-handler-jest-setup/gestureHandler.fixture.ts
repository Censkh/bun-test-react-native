import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react-native";
import React from "react";
import { Text } from "react-native";

import { GestureHandlerRootView } from "react-native-gesture-handler";

describe("react-native-gesture-handler jestSetup", () => {
  test("renders GestureHandlerRootView under Bun", async () => {
    const result = await render(
      React.createElement(GestureHandlerRootView, null, React.createElement(Text, null, "gesture root")),
    );

    expect(result.getByText("gesture root")).toBeTruthy();
  });
});
