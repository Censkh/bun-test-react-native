import { describe, test } from "bun:test";
import { expectBunFixtureToPass, fixturePath } from "./fixtureRunner";

const fixtureRoot = fixturePath(import.meta.dir, "expo-file-system");

describe("Expo Image cache mock", () => {
  test("writes, reads, and clears cache entries by key", () => {
    expectBunFixtureToPass(fixtureRoot);
  });
});
