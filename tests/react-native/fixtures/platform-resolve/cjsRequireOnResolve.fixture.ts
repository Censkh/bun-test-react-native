import { describe, expect, test } from "bun:test";

describe("Bun plugin onResolve for CJS require", () => {
  test("platform-resolves static require calls from CommonJS modules", () => {
    expect(require("react-native-platform-fixture").default).toBe("ios thing");
  });
});
