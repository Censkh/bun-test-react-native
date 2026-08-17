import { describe } from "bun:test";
import { bunFixtureTest, fixturePath } from "./fixtureRunner";

const fixtureRoot = fixturePath(import.meta.dir, "react-native-keyboard-controller");
const fixture = bunFixtureTest(fixtureRoot);

describe("react-native-keyboard-controller fixture", () => {
  fixture.test("passes in its own Bun test process", ({ run }) => {
    run().expectStatusCode(0);
  });
});
