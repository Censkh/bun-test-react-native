import { describe } from "bun:test";
import { bunFixtureTest, fixturePath } from "./fixtureRunner";

const fixtureRoot = fixturePath(import.meta.dir, "virtualized-lists");
const fixture = bunFixtureTest(fixtureRoot);

describe("@react-native/virtualized-lists fixture", () => {
  fixture.test("passes in its own Bun test process", ({ run }) => {
    run().expectStatusCode(0);
  });
});
