import { describe } from "bun:test";
import { bunFixtureTest, fixturePath } from "./fixtureRunner";

const fixtureRoot = fixturePath(import.meta.dir, "react-native-clipboard");
const fixture = bunFixtureTest(fixtureRoot);

describe("@react-native-clipboard/clipboard fixture", () => {
  fixture.test("uses the package-provided Jest mock", ({ run }) => {
    run().expectStatusCode(0);
  });
});
