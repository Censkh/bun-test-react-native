import { describe, expect, test } from "bun:test";

describe("Expo HMR native resolution", () => {
  test("uses native async-require HMR helpers under Bun tests", async () => {
    globalThis.__DEV__ = false;

    const { default: HMRClient } = await import("expo/src/async-require/hmr");

    expect(() => {
      HMRClient.setup("ios", "index.bundle", "localhost", 8081, false);
    }).not.toThrow();
    expect(HMRClient).toBeDefined();
  });
});
