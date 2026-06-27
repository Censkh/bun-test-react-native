import { describe, test } from "bun:test";
import { expectBunFixtureToPass, fixturePath } from "./fixtureRunner";

const fixtureRoot = fixturePath(import.meta.dir, "reanimated-jest-setup");

describe("react-native-reanimated Jest setup fixture", () => {
  test("passes in its own Bun test process", () => {
    expectBunFixtureToPass(fixtureRoot, {
      env: {
        ...process.env,
        JEST_WORKER_ID: process.env.JEST_WORKER_ID ?? "1",
      },
    });
  });
});
