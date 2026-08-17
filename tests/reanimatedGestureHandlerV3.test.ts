import { describe } from "bun:test";

import { bunFixtureTest, fixturePath } from "./fixtureRunner";

const fixture = bunFixtureTest(fixturePath(import.meta.dir, "reanimated-gesture-handler-v3"));

describe("react-native-gesture-handler v3 Reanimated mock fixture", () => {
  fixture.test(
    "passes in its own Bun test process",
    ({ run }) => {
      run().expectStatusCode(0);
    },
    30_000,
  );
});
