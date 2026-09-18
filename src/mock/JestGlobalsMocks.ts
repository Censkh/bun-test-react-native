import * as bunTest from "bun:test";
import { mock } from "bun:test";
import { projectRequire } from "../ProjectRequire";

// Packages' official Jest mocks import `@jest/globals`. When the real package is installed (it often
// is, hoisted from other tooling) it throws outside Jest, so serve Bun's test API in its place.
const jestGlobals = () => ({
  afterAll: bunTest.afterAll,
  afterEach: bunTest.afterEach,
  beforeAll: bunTest.beforeAll,
  beforeEach: bunTest.beforeEach,
  describe: bunTest.describe,
  expect: bunTest.expect,
  it: bunTest.it,
  jest: bunTest.jest,
  test: bunTest.test,
});

mock.module("@jest/globals", jestGlobals);
try {
  mock.module(projectRequire.resolve("@jest/globals"), jestGlobals);
} catch {
  // Not installed: Bun already maps `@jest/globals` imports to `bun:test`.
}
