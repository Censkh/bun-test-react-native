import { describe } from "bun:test";
import { bunFixtureTest, fixturePath } from "./fixtureRunner";

const fixtureRoot = fixturePath(import.meta.dir, "expo-media-library");
const fixture = bunFixtureTest(fixtureRoot);

describe("expo-media-library fixture", () => {
  fixture.test("loads native-backed next and legacy media library APIs", ({ run }) => {
    run().expectStatusCode(0);
  });
});
