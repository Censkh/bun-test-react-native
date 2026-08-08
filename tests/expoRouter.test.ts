import { describe, test } from "bun:test";
import { expectBunFixtureToPass, fixturePath } from "./fixtureRunner";

const fixtureRoot = fixturePath(import.meta.dir, "expo-router");
const EXPO_ROUTER_FIXTURE_TIMEOUT_MS = 30_000;

describe("expo-router fixture", () => {
  test(
    "passes in its own Bun test process",
    () => {
      expectBunFixtureToPass(fixtureRoot);
    },
    EXPO_ROUTER_FIXTURE_TIMEOUT_MS,
  );
});
