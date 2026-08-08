import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { hasProjectPackage } from "../src/ProjectRequire";

describe("hasProjectPackage", () => {
  test("only resolves packages installed in the current project", () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "bun-test-react-native-"));
    const packageJsonPath = path.join(projectRoot, "node_modules", "expo", "package.json");
    fs.mkdirSync(path.dirname(packageJsonPath), { recursive: true });
    fs.writeFileSync(packageJsonPath, '{"name":"expo"}');

    expect(hasProjectPackage("expo", projectRoot)).toBe(true);
    expect(hasProjectPackage("jest-expo", projectRoot)).toBe(false);
  });
});
