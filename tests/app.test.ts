import { describe, test } from "bun:test";
import { expectBunFixtureToPass, fixturePath } from "./fixtureRunner";

const fixtureRoot = fixturePath(import.meta.dir, "app");
const APP_FIXTURE_TIMEOUT_MS = 30_000;

describe("app fixture", () => {
  test(
    "passes in its own Bun test process",
    () => {
      expectBunFixtureToPass(fixtureRoot);
    },
    APP_FIXTURE_TIMEOUT_MS,
  );
});
