import { describe } from "bun:test";
import { bunFixtureTest, fixturePath } from "../fixtureRunner";

const fixtureRoot = fixturePath(import.meta.dir, "react-native-source-transpile");
const fixture = bunFixtureTest(fixtureRoot);

describe("React Native source transpile fixture", () => {
  fixture.test("passes in its own Bun test process", ({ run }) => {
    run().expectStatusCode(0);
  });
});
