import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

export const projectRequire = createRequire(path.join(process.cwd(), "__bun_test_react_native__.js"));

export const hasProjectPackage = (packageName: string, projectRoot = process.cwd()) =>
  fs.existsSync(path.join(projectRoot, "node_modules", packageName, "package.json"));
