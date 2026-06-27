import { describe, expect, test } from "bun:test";

describe("expo-modules-core", () => {
  test("loads native runtime exports through the Bun React Native plugin", async () => {
    const expoModulesCore = await import("expo-modules-core");

    expect(expoModulesCore.Platform.OS).toBe("ios");
    expect(expoModulesCore.Platform.select({ default: "default", ios: "ios" })).toBe("ios");
    expect(typeof expoModulesCore.installOnUIRuntime).toBe("function");
    expect(typeof expoModulesCore.requireNativeModule).toBe("function");
  });

  test("keeps fetch usable after Expo Winter runtime installs globals", async () => {
    await import("expo/src/winter");

    const response = await globalThis.fetch("data:text/plain,expo-fetch-ok");

    expect(await response.text()).toBe("expo-fetch-ok");
  });
});
