import { describe, expect, test } from "bun:test";

describe("plugin install guard", () => {
  test("throws if plugin-entry is imported in the parent test process", async () => {
    await expect(import("../src/plugin-entry")).rejects.toThrow("BLOCK_BTRN_INSTALL");
  });
});
