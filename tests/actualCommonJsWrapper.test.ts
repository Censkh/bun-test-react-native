import { describe, test } from "bun:test";
import { expectBunFixtureToPass, fixturePath } from "./fixtureRunner";

const fixtureRoot = fixturePath(import.meta.dir, "actual-commonjs-wrapper");

describe("actual CommonJS wrapper fixture", () => {
  test("passes in its own Bun test process", () => {
    expectBunFixtureToPass(fixtureRoot);
  });
});
