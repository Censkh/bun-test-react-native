// Installs every React Native fixture against REACT_NATIVE_VERSION ahead of the test run, so the
// suite can run on any Bun version without installing anything itself. Mirrors prepareBunFixture in
// tests/fixtureRunner.ts: once the package link exists, the runner treats the fixture as prepared.
//
// A fixture can override dependencies per matrix version with `matrixDependencies`, keyed by the
// matrix package and then a semver range. Every matching range applies, in order:
//
//   "matrixDependencies": {
//     "react-native": {
//       ">=0.86.0": { "react-native-gesture-handler": "3.3.0" }
//     }
//   }
import fs from "node:fs";
import path from "node:path";

const reactNativeSpec = process.env.REACT_NATIVE_VERSION;
if (!reactNativeSpec) throw new Error("REACT_NATIVE_VERSION is required");

const packageRoot = path.resolve(import.meta.dir, "..");
const fixturesRoot = path.join(packageRoot, "tests", "react-native", "fixtures");

const run = (cmd: string[], cwd = packageRoot) => {
  const result = Bun.spawnSync({ cmd, cwd, stdout: "pipe", stderr: "pipe" });
  if (result.exitCode !== 0) {
    throw new Error(`${cmd.join(" ")} failed in ${cwd}:\n${result.stderr.toString() || result.stdout.toString()}`);
  }
  return result.stdout.toString();
};

const { version: reactNativeVersion, peerDependencies } = JSON.parse(
  run(["npm", "view", `react-native@${reactNativeSpec}`, "version", "peerDependencies", "--json"]),
) as { version: string; peerDependencies?: Record<string, string> };
const reactRange = peerDependencies?.react;
console.log(`react-native@${reactNativeSpec} -> ${reactNativeVersion} (react ${reactRange ?? "unchanged"})`);

// Match prereleases (e.g. `next`) as their release version, so ">=0.86.0" covers 0.87.0-rc.1.
const reactNativeReleaseVersion = reactNativeVersion.replace(/-.*$/, "");

const overrides: Record<string, string | undefined> = {
  "react-native": reactNativeVersion,
  "@react-native/virtualized-lists": reactNativeVersion,
  react: reactRange,
};

for (const fixtureName of fs.readdirSync(fixturesRoot).sort()) {
  const fixtureRoot = path.join(fixturesRoot, fixtureName);
  if (!fs.statSync(fixtureRoot).isDirectory()) continue;

  const packageJsonPath = path.join(fixtureRoot, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    const dependencies: Record<string, string> | undefined = packageJson.dependencies;
    if (dependencies?.["react-native"]) {
      for (const [name, version] of Object.entries(overrides)) {
        if (version && dependencies[name]) dependencies[name] = version;
      }
      const rangeDependencies: Record<string, Record<string, string>> = packageJson.matrixDependencies?.[
        "react-native"
      ] ?? {};
      for (const [range, rangeOverrides] of Object.entries(rangeDependencies)) {
        if (Bun.semver.satisfies(reactNativeReleaseVersion, range)) Object.assign(dependencies, rangeOverrides);
      }
      fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
    }

    const installArgs = ["install", "--no-save"];
    if (fixtureName === "flash-list-ref") installArgs.push("--omit=peer");
    console.log(`Installing ${fixtureName}`);
    run([process.execPath, ...installArgs], fixtureRoot);
  }

  const nodeModulesPath = path.join(fixtureRoot, "node_modules");
  const packageLinkPath = path.join(nodeModulesPath, "bun-test-react-native");
  fs.mkdirSync(nodeModulesPath, { recursive: true });
  fs.rmSync(packageLinkPath, { force: true, recursive: true });
  // Relative so the link survives being packed into an artifact and unpacked elsewhere.
  fs.symlinkSync(path.relative(nodeModulesPath, packageRoot), packageLinkPath, "dir");
}
