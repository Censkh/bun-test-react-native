import { describe, test } from "bun:test";
import { expectBunFixtureToPass, fixturePath } from "./fixtureRunner";

const fixtureRoot = fixturePath(import.meta.dir, "expo-media-library");

describe("expo-media-library fixture", () => {
  test("loads native-backed next and legacy media library APIs", () => {
    expectBunFixtureToPass(fixtureRoot);
  });
});
