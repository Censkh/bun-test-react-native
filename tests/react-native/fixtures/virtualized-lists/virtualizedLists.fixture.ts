import { describe, expect, test } from "bun:test";

describe("@react-native/virtualized-lists runtime compatibility", () => {
  test("loads list calculations that import React Native private feature flags", async () => {
    const { newRangeCount } = await import("@react-native/virtualized-lists/Lists/VirtualizeUtils.js");
    expect(newRangeCount({ first: 1, last: 3 }, { first: 2, last: 5 })).toBe(2);
  });
  test("loads VirtualizedListCellRenderer through the plugin runtime", async () => {
    const module = await import("@react-native/virtualized-lists/Lists/VirtualizedListCellRenderer.js");

    expect(typeof module.default).toBe("function");
  });
});
