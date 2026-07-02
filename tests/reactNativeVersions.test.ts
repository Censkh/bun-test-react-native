import { describe, test } from "bun:test";

import { expectBunFixtureToPass, fixturePath } from "./fixtureRunner";

const reactNativeVersionFixtures = [
  ["0.85.3", fixturePath(import.meta.dir, "react-native-runtime-085")],
  ["0.86.0", fixturePath(import.meta.dir, "react-native-runtime-086")],
] as const;

describe("react-native version compatibility fixtures", () => {
  for (const [version, fixtureRoot] of reactNativeVersionFixtures) {
    test(`passes with react-native ${version}`, () => {
      expectBunFixtureToPass(fixtureRoot, { installMode: "full" });
    }, 30_000);
  }
});
