import { describe, test } from "bun:test";
import { expectBunFixtureToPass, fixturePath } from "./fixtureRunner";

const fixtureRoot = fixturePath(import.meta.dir, "cloudflare-worker-fetch");

describe("Cloudflare worker fetch fixture", () => {
  test("passes with Bun fetch globals", () => {
    expectBunFixtureToPass(fixtureRoot);
  }, 30_000);
});
