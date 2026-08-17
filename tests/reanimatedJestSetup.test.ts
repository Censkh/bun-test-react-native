import { describe } from "bun:test";
import { bunFixtureTest, fixturePath } from "./fixtureRunner";

const fixtureRoot = fixturePath(import.meta.dir, "reanimated-jest-setup");
const fixture = bunFixtureTest(fixtureRoot, {
  env: {
    ...process.env,
    JEST_WORKER_ID: process.env.JEST_WORKER_ID ?? "1",
  },
});

describe("react-native-reanimated Jest setup fixture", () => {
  fixture.test("passes in its own Bun test process", ({ run }) => {
    run().expectStatusCode(0);
  });
});
