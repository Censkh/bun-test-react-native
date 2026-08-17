import { describe } from "bun:test";
import { bunFixtureTest, fixturePath } from "./fixtureRunner";

const fixtureRoot = fixturePath(import.meta.dir, "skia-jest-setup");
const fixture = bunFixtureTest(fixtureRoot);

describe("@shopify/react-native-skia Jest setup fixture", () => {
  fixture.test("passes in its own Bun test process", ({ run }) => {
    run().expectStatusCode(0);
  });
});
