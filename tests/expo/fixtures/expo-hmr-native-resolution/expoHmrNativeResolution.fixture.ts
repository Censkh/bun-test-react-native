import { describe, expect, test } from "bun:test";

describe("Expo HMR native resolution", () => {
  test("resolves platform files before default files", async () => {
    expect((await import("./platformDefault")).platform).toBe("ios");
  });

  test("falls back to native files when no platform file exists", async () => {
    expect((await import("./platformFallback")).platform).toBe("native");
  });

  test("sets Expo's platform environment", () => {
    expect(process.env.EXPO_OS).toBe("ios");
  });

  test("uses native async-require HMR helpers under Bun tests", async () => {
    globalThis.__DEV__ = false;

    const { default: HMRClient } = await import("expo/src/async-require/hmr");

    expect(() => {
      HMRClient.setup("ios", "index.bundle", "localhost", 8081, false);
    }).not.toThrow();
    expect(HMRClient).toBeDefined();
  });
});
