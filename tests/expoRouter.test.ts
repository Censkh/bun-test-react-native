import { describe } from "bun:test";
import { bunFixtureTest, fixturePath } from "./fixtureRunner";

const fixtureRoot = fixturePath(import.meta.dir, "expo-router");
const EXPO_ROUTER_FIXTURE_TIMEOUT_MS = 30_000;
const fixture = bunFixtureTest(fixtureRoot);

describe("expo-router fixture", () => {
  fixture.test(
    "passes in its own Bun test process",
    ({ run }) => {
      run().expectStatusCode(0);
    },
    EXPO_ROUTER_FIXTURE_TIMEOUT_MS,
  );
});
