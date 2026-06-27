import { describe, expect, test } from "bun:test";

describe("jest.requireActual with React Native preset mocks", () => {
  test("loads the actual React Native View implementation", () => {
    const actualView = jest.requireActual("react-native/Libraries/Components/View/View");

    expect(actualView.default).toBeDefined();
    expect(actualView.default.displayName).toBe("View");
  });

  test("loads the React Native Jest preset View mock", () => {
    const viewMock = require("@react-native/jest-preset/jest/mocks/View");

    expect(viewMock.default).toBeDefined();
  });
});
