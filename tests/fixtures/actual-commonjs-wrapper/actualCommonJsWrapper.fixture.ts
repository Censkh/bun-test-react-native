import { describe, expect, mock, test } from "bun:test";

mock.module("./target.cjs", () => ({
  default: () => "mock-default",
  named: () => "mock-named",
}));

describe("CommonJS actual wrapper", () => {
  test("loads actual CommonJS default and named exports", () => {
    const mocked = require("./target.cjs");
    const actual = jest.requireActual("./target.cjs");

    expect(mocked.named()).toBe("mock-named");
    expect(actual.default()).toBe("actual-default");
    expect(actual.named()).toBe("actual-named");
  });
});
