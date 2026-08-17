import { describe } from "bun:test";

import { bunFixtureTest, fixturePath } from "./fixtureRunner";

const reactNativeVersionFixtures = [
  ["0.85.3", fixturePath(import.meta.dir, "react-native-runtime-085")],
  ["0.86.0", fixturePath(import.meta.dir, "react-native-runtime-086")],
] as const;

describe("react-native version compatibility fixtures", () => {
  for (const [version, fixtureRoot] of reactNativeVersionFixtures) {
    const fixture = bunFixtureTest(fixtureRoot);

    fixture.test(
      `passes with react-native ${version}`,
      ({ run }) => {
        run().expectStatusCode(0);
      },
      30_000,
    );
  }
});
