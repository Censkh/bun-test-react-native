import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react-native";
import React from "react";
import { Text } from "react-native";
import {
  KeyboardController,
  KeyboardProvider,
  useKeyboardController,
} from "react-native-keyboard-controller";

const KeyboardControllerReader = () => {
  const keyboard = useKeyboardController();
  return React.createElement(Text, { testID: "keyboard-controller" }, String(Boolean(keyboard)));
};

describe("react-native-keyboard-controller native module mock", () => {
  test("loads and renders without package-level mocks", async () => {
    expect(KeyboardController).toBeDefined();
    expect(typeof KeyboardController.preload).toBe("function");
    expect(typeof KeyboardProvider).toBe("function");

    const result = await render(
      React.createElement(KeyboardProvider, null, React.createElement(KeyboardControllerReader)),
    );

    expect(result.getByTestId("keyboard-controller").props.children).toBe("true");
  });
});
