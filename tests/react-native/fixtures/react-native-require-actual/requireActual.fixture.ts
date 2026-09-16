import { describe, expect, test } from "bun:test";

describe("jest.requireActual with React Native local mocks", () => {
  test("loads the actual React Native View implementation", () => {
    const actualView = jest.requireActual("react-native/Libraries/Components/View/View");

    expect(actualView.default).toBeDefined();
    expect(actualView.default.displayName).toBe("View");
  });
});
