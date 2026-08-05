import { describe, expect, test } from "bun:test";
import {
  createAccessibilityInfoMock,
  createAppStateMock,
  createClipboardMock,
  createLinkingMock,
  createVibrationMock,
} from "../src/mock/ReactNativeModuleMocks";

describe("React Native module replacements", () => {
  test("provides removable AppState subscriptions", () => {
    const appState = createAppStateMock();
    const subscription = (appState.addEventListener as any)("change", () => {});

    expect(typeof subscription.remove).toBe("function");
  });

  test("provides stable accessibility, clipboard, linking, and vibration APIs", async () => {
    const accessibilityInfo = createAccessibilityInfoMock();
    const clipboard = createClipboardMock();
    const linking = createLinkingMock();
    const vibration = createVibrationMock();

    expect(await accessibilityInfo.isScreenReaderEnabled()).toBe(false);
    expect(await clipboard.getString()).toBe("");
    expect(await (linking.canOpenURL as any)("https://example.com")).toBe(true);
    expect(typeof vibration.vibrate).toBe("function");
    expect(typeof vibration.cancel).toBe("function");
  });
});
