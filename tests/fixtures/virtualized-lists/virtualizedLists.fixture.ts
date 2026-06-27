import { describe, expect, test } from "bun:test";

describe("@react-native/virtualized-lists runtime compatibility", () => {
  test("loads VirtualizedListCellRenderer through the plugin runtime", async () => {
    const module = await import(
      "@react-native/virtualized-lists/Lists/VirtualizedListCellRenderer.js"
    );

    expect(typeof module.default).toBe("function");
  });
});
