import { describe } from "bun:test";
import { bunFixtureTest, fixturePath } from "./fixtureRunner";

const fixtureRoot = fixturePath(import.meta.dir, "app");
const APP_FIXTURE_TIMEOUT_MS = 30_000;
const fixture = bunFixtureTest(fixtureRoot);

describe("app fixture", () => {
  fixture.test(
    "passes in its own Bun test process",
    ({ run }) => {
      run().expectStatusCode(0);
    },
    APP_FIXTURE_TIMEOUT_MS,
  );
});
