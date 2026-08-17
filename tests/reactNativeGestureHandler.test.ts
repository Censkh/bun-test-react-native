import { describe } from "bun:test";
import { bunFixtureTest, fixturePath } from "./fixtureRunner";

const fixtureRoot = fixturePath(import.meta.dir, "gesture-handler-jest-setup");
const fixture = bunFixtureTest(fixtureRoot);

describe("react-native-gesture-handler jestSetup fixture", () => {
  fixture.test("passes in its own Bun test process", ({ run }) => {
    run().expectStatusCode(0);
  });
});
