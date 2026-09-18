import { describe } from "bun:test";
import { bunFixtureTest, fixturePath } from "../fixtureRunner";

const fixtureRoot = fixturePath(import.meta.dir, "gesture-handler-2-source");
const fixture = bunFixtureTest(fixtureRoot);

describe("gesture-handler 2 source fixture", () => {
  fixture.test("passes in its own Bun test process", ({ run }) => {
    run().expectStatusCode(0);
  });
});
