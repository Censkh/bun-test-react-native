import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

export const projectRequire = createRequire(path.join(process.cwd(), "__bun_test_react_native__.js"));

export const hasProjectPackage = (packageName: string, projectRoot = process.cwd()) => {
  if (fs.existsSync(path.join(projectRoot, "node_modules", packageName, "package.json"))) return true;
  try {
    createRequire(path.join(projectRoot, "__bun_test_react_native__.js")).resolve(`${packageName}/package.json`);
    return true;
  } catch {
    return false;
  }
};
