import { describe, test } from "bun:test";
import { expectBunFixtureToPass, fixturePath } from "./fixtureRunner";

const fixtureRoot = fixturePath(import.meta.dir, "virtualized-lists");

describe("@react-native/virtualized-lists fixture", () => {
  test("passes in its own Bun test process", () => {
    expectBunFixtureToPass(fixtureRoot);
  });
});
