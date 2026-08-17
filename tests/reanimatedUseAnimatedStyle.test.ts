import { describe } from "bun:test";
import { bunFixtureTest, fixturePath } from "./fixtureRunner";

const fixtureRoot = fixturePath(import.meta.dir, "reanimated-use-animated-style");
const fixture = bunFixtureTest(fixtureRoot, {
  env: {
    ...process.env,
    JEST_WORKER_ID: process.env.JEST_WORKER_ID ?? "1",
  },
});

describe("react-native-reanimated useAnimatedStyle fixture", () => {
  fixture.test("renders components that use useAnimatedStyle without explicit dependencies", ({ run }) => {
    run().expectStatusCode(0);
  });
});
