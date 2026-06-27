import { describe, test } from "bun:test";
import { expectBunFixtureToPass, fixturePath } from "./fixtureRunner";

const fixtureRoot = fixturePath(import.meta.dir, "react-native-clipboard");

describe("@react-native-clipboard/clipboard fixture", () => {
  test("uses the package-provided Jest mock", () => {
    expectBunFixtureToPass(fixtureRoot);
  });
});
