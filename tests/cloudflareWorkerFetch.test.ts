import { describe } from "bun:test";
import { bunFixtureTest, fixturePath } from "./fixtureRunner";

const fixtureRoot = fixturePath(import.meta.dir, "cloudflare-worker-fetch");
const fixture = bunFixtureTest(fixtureRoot);

describe("Cloudflare worker fetch fixture", () => {
  fixture.test(
    "passes with Bun fetch globals",
    ({ run }) => {
      run().expectStatusCode(0);
    },
    30_000,
  );
});
