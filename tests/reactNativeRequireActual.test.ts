import { describe, test } from "bun:test";
import { expectBunFixtureToPass, fixturePath } from "./fixtureRunner";

const fixtureRoot = fixturePath(import.meta.dir, "react-native-require-actual");

describe("React Native requireActual fixture", () => {
  test("passes in its own Bun test process", () => {
    expectBunFixtureToPass(fixtureRoot);
  });
});
