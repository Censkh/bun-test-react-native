import { describe, expect, test } from "bun:test";

describe("expo-modules-core mock shape", () => {
  test("supports ESM named imports and CommonJS require", async () => {
    const imported = await import("expo-modules-core");
    const required = require("expo-modules-core");

    expect(imported.Platform.OS).toBe("ios");
    expect(typeof imported.requireNativeModule).toBe("function");
    expect(required.Platform.OS).toBe("ios");
    expect(typeof required.requireNativeModule).toBe("function");
  });
});
