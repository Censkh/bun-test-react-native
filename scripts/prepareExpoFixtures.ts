// Installs Expo fixtures against EXPO_VERSION ahead of the test run, so the suite can run on any Bun
// version without installing anything itself. The fixture link tells fixtureRunner.ts they are ready.
import fs from "node:fs";
import path from "node:path";

const expoVersion = process.env.EXPO_VERSION;
if (!expoVersion) throw new Error("EXPO_VERSION is required");

const packageRoot = path.resolve(import.meta.dir, "..");
const fixturesRoot = path.join(packageRoot, "tests", "expo", "fixtures");

const run = (cmd: string[], cwd = packageRoot) => {
  const result = Bun.spawnSync({ cmd, cwd, stderr: "pipe", stdout: "pipe" });
  if (result.exitCode !== 0) {
    throw new Error(`${cmd.join(" ")} failed in ${cwd}:\n${result.stderr.toString() || result.stdout.toString()}`);
  }
};

const expoManagedDependencies = (dependencies: Record<string, string>) =>
  Object.keys(dependencies).filter(
    (name) =>
      name !== "expo" &&
      (name === "jest-expo" ||
        name === "react" ||
        name === "react-native" ||
        name.startsWith("expo-") ||
        name.startsWith("@expo/") ||
        name.startsWith("react-native-")),
  );

for (const fixtureName of fs.readdirSync(fixturesRoot).sort()) {
  const fixtureRoot = path.join(fixturesRoot, fixtureName);
  const packageJsonPath = path.join(fixtureRoot, "package.json");
  if (!fs.existsSync(packageJsonPath)) continue;

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
    dependencies?: Record<string, string>;
  };
  if (!packageJson.dependencies?.expo) continue;

  packageJson.dependencies.expo = expoVersion;
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

  console.log(`Installing ${fixtureName}`);
  run([process.execPath, "install", "--no-save"], fixtureRoot);

  const managedDependencies = expoManagedDependencies(packageJson.dependencies);
  if (managedDependencies.length > 0)
    run([process.execPath, "x", "expo", "install", ...managedDependencies], fixtureRoot);

  const nodeModulesPath = path.join(fixtureRoot, "node_modules");
  const packageLinkPath = path.join(nodeModulesPath, "bun-test-react-native");
  fs.rmSync(packageLinkPath, { force: true, recursive: true });
  // Relative so the link survives being packed into an artifact and unpacked elsewhere.
  fs.symlinkSync(path.relative(nodeModulesPath, packageRoot), packageLinkPath, "dir");
}
