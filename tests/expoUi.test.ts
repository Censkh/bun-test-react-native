import { describe, test } from "bun:test";
import { expectBunFixtureToPass, fixturePath } from "./fixtureRunner";

const fixtureRoot = fixturePath(import.meta.dir, "expo-ui");

describe("@expo/ui fixture", () => {
  test("renders native-backed SwiftUI and Jetpack Compose components", () => {
    expectBunFixtureToPass(fixtureRoot);
  });
});
