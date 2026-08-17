import { describe } from "bun:test";
import { bunFixtureTest, fixturePath } from "./fixtureRunner";

const fixtureRoot = fixturePath(import.meta.dir, "platform-resolve");
const fixture = bunFixtureTest(fixtureRoot);

describe("platform resolution fixture", () => {
  fixture.test("passes in its own Bun test process", ({ run }) => {
    run().expectStatusCode(0);
  });
});
