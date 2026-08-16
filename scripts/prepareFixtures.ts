import fs from "node:fs";
import path from "node:path";

const fixturesRoot = path.resolve(import.meta.dir, "../tests/fixtures");

for (const entry of fs.readdirSync(fixturesRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;

  const fixtureRoot = path.join(fixturesRoot, entry.name);
  if (!fs.existsSync(path.join(fixtureRoot, "package.json"))) continue;

  console.log(`Installing fixture dependencies for ${entry.name}`);
  const installArgs = ["install", "--no-save"];
  if (entry.name === "flash-list-ref") installArgs.push("--omit=peer");
  const result = Bun.spawnSync({
    cmd: [process.execPath, ...installArgs],
    cwd: fixtureRoot,
    stdio: ["inherit", "inherit", "inherit"],
  });
  if (result.exitCode !== 0) process.exit(result.exitCode ?? 1);
}
