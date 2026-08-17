import { describe } from "bun:test";
import { bunFixtureTest, fixturePath } from "./fixtureRunner";

const fixtureRoot = fixturePath(import.meta.dir, "expo-hmr-native-resolution");
const fixture = bunFixtureTest(fixtureRoot);

describe("Expo HMR native resolution fixture", () => {
  fixture.test("passes in its own Bun test process", ({ run }) => {
    run().expectStatusCode(0);
  });
});
