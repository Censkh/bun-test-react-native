import { describe, test } from "bun:test";

import { expectBunFixtureToPass, fixturePath } from "./fixtureRunner";

describe("react-native-gesture-handler v3 Reanimated mock fixture", () => {
  test("passes in its own Bun test process", () => {
    expectBunFixtureToPass(fixturePath(import.meta.dir, "reanimated-gesture-handler-v3"), {
      installMode: "full",
    });
  }, 30_000);
});
