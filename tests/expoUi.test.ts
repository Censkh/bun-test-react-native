import { describe } from "bun:test";
import { bunFixtureTest, fixturePath } from "./fixtureRunner";

const fixtureRoot = fixturePath(import.meta.dir, "expo-ui");
const fixture = bunFixtureTest(fixtureRoot);

describe("@expo/ui fixture", () => {
  fixture.test("renders native-backed SwiftUI and Jetpack Compose components", ({ run }) => {
    run().expectStatusCode(0);
  });
});
