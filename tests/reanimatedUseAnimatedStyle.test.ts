import { describe, test } from "bun:test";
import { expectBunFixtureToPass, fixturePath } from "./fixtureRunner";

const fixtureRoot = fixturePath(import.meta.dir, "reanimated-use-animated-style");

describe("react-native-reanimated useAnimatedStyle fixture", () => {
  test("renders components that use useAnimatedStyle without explicit dependencies", () => {
    expectBunFixtureToPass(fixtureRoot, {
      env: {
        ...process.env,
        JEST_WORKER_ID: process.env.JEST_WORKER_ID ?? "1",
      },
    });
  });
});
