import { describe, expect, test } from "bun:test";

const importNativeReanimated = () =>
  import("react-native-reanimated/lib/module/ReanimatedModule/NativeReanimated.js");

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
});
