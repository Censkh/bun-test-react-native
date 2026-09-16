import { describe, expect, test } from "bun:test";

describe("react-native-worklets", () => {
  test("prebuilt module entry exposes native runtime named exports", async () => {
    const worklets = await import("react-native-worklets/lib/module/index.js");

    expect(typeof worklets.getUISchedulerHolder).toBe("function");
  });
});
