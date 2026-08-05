import { createRequire } from "node:module";
import path from "node:path";

export const projectRequire = createRequire(path.join(process.cwd(), "__bun_test_react_native__.js"));
