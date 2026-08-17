import { describe } from "bun:test";
import { bunFixtureTest, fixturePath } from "./fixtureRunner";

const fixtureRoot = fixturePath(import.meta.dir, "expo-file-system");
const fixture = bunFixtureTest(fixtureRoot);

describe("Expo Image cache mock", () => {
  fixture.test("writes, reads, and clears cache entries by key", ({ run }) => {
    run().expectStatusCode(0);
  });
});
