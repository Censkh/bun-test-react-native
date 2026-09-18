// Runs the React Native CI matrix locally: every Bun version × every React Native version from
// .github/workflows/test.yml, set up the same way CI does. Dependencies and fixtures are installed
// with the latest Bun, then each Bun version only runs the tests.
//
//   bun scripts/testMatrix.ts
//   bun scripts/testMatrix.ts --bun 1.3.x,canary --react-native 0.86.2,next
//   bun scripts/testMatrix.ts --react-native next -- tests/react-native/reactNativeGestureHandler.test.ts
//
// Work happens in a copy of the package under ~/.cache/bun-test-react-native/matrix, so fixture
// package.json rewrites never touch the checkout. It must live outside the checkout: inside a monorepo,
// module resolution would climb into the parent's node_modules and load packages CI never sees.
// Bun binaries are cached in ~/.cache/bun-test-react-native/bun.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";

const packageRoot = path.resolve(import.meta.dir, "..");
const cacheRoot = path.join(os.homedir(), ".cache", "bun-test-react-native");
const workRoot = path.join(cacheRoot, "matrix");
const bunCacheRoot = path.join(cacheRoot, "bun");

const { values: flags, positionals: testPaths } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  options: {
    bun: { type: "string" },
    "react-native": { type: "string" },
  },
});

type Workflow = {
  jobs: { "react-native": { strategy: { matrix: { bun: { version: string }[]; react_native: string[] } } } };
};
const workflow = Bun.YAML.parse(
  fs.readFileSync(path.join(packageRoot, ".github", "workflows", "test.yml"), "utf8"),
) as Workflow;
const matrix = workflow.jobs["react-native"].strategy.matrix;

const pick = (flag: string | undefined, all: string[]) => {
  if (!flag) return all;
  const selected = flag.split(",").map((value) => value.trim());
  const unknown = selected.filter((value) => !all.includes(value));
  if (unknown.length > 0) console.warn(`Not in the CI matrix: ${unknown.join(", ")}`);
  return selected;
};

const bunSpecs = pick(
  flags.bun,
  matrix.bun.map((entry) => String(entry.version)),
);
const reactNativeSpecs = pick(flags["react-native"], matrix.react_native.map(String));

const run = (cmd: string[], options: { cwd?: string; env?: Record<string, string | undefined> } = {}) => {
  const result = Bun.spawnSync({
    cmd,
    cwd: options.cwd ?? packageRoot,
    env: { ...process.env, ...options.env },
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) {
    throw new Error(`${cmd.join(" ")} failed:\n${result.stderr.toString() || result.stdout.toString()}`);
  }
  return result.stdout.toString();
};

// Bun binaries come from the per-platform npm packages, which cover releases and canaries.
const bunPlatformPackage = `@oven/bun-${process.platform}-${process.arch === "arm64" ? "aarch64" : process.arch}`;

const resolveBunVersion = (spec: string) => {
  if (spec === "latest" || spec === "canary") {
    return JSON.parse(run(["npm", "view", bunPlatformPackage, "dist-tags", "--json"]))[spec] as string;
  }
  const versions = [JSON.parse(run(["npm", "view", `${bunPlatformPackage}@${spec}`, "version", "--json"]))].flat();
  return versions.at(-1) as string;
};

const getBun = (spec: string) => {
  const version = resolveBunVersion(spec);
  const binary = path.join(bunCacheRoot, version, "package", "bin", "bun");
  if (!fs.existsSync(binary)) {
    const versionRoot = path.join(bunCacheRoot, version);
    fs.mkdirSync(versionRoot, { recursive: true });
    console.log(`Downloading Bun ${version}`);
    const tarball = run(["npm", "pack", `${bunPlatformPackage}@${version}`, "--silent"], { cwd: versionRoot }).trim();
    run(["tar", "-xzf", tarball], { cwd: versionRoot });
    fs.rmSync(path.join(versionRoot, tarball));
    fs.chmodSync(binary, 0o755);
  }
  return { binary, version };
};

// Copy tracked and untracked-but-not-ignored files, so local edits are included.
const copyPackage = (destination: string) => {
  fs.rmSync(destination, { force: true, recursive: true });
  const files = run(["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"]).split("\0");
  for (const file of files) {
    const source = path.join(packageRoot, file);
    if (!file || !fs.existsSync(source) || fs.statSync(source).isDirectory()) continue;
    fs.mkdirSync(path.dirname(path.join(destination, file)), { recursive: true });
    fs.copyFileSync(source, path.join(destination, file));
  }
};

const latestBun = getBun("latest");
console.log(`Installing with Bun ${latestBun.version}`);

const baseRoot = path.join(workRoot, "base");
copyPackage(baseRoot);
run([latestBun.binary, "install"], { cwd: baseRoot });

type Result = { bun: string; reactNative: string; passed: boolean; summary: string };
const results: Result[] = [];

for (const reactNativeSpec of reactNativeSpecs) {
  const reactNativeRoot = path.join(workRoot, `react-native-${reactNativeSpec}`);
  copyPackage(reactNativeRoot);
  fs.symlinkSync(path.join(baseRoot, "node_modules"), path.join(reactNativeRoot, "node_modules"), "dir");

  console.log(`\nInstalling fixtures for React Native ${reactNativeSpec}`);
  try {
    process.stdout.write(
      run([latestBun.binary, "scripts/prepareReactNativeFixtures.ts"], {
        cwd: reactNativeRoot,
        env: { REACT_NATIVE_VERSION: reactNativeSpec },
      }).split("\n")[0] + "\n",
    );
  } catch (error) {
    console.error((error as Error).message);
    for (const bunSpec of bunSpecs) {
      results.push({ bun: bunSpec, reactNative: reactNativeSpec, passed: false, summary: "fixture install failed" });
    }
    continue;
  }

  for (const bunSpec of bunSpecs) {
    const bun = getBun(bunSpec);
    console.log(`Bun ${bunSpec} (${bun.version}) / React Native ${reactNativeSpec}`);
    const result = Bun.spawnSync({
      cmd: [
        bun.binary,
        "test",
        "--parallel=3",
        "--timeout=10000",
        ...(testPaths.length ? testPaths : ["tests/react-native"]),
      ],
      cwd: reactNativeRoot,
      // Put this Bun first so anything that shells out to `bun` gets the same version.
      env: { ...process.env, PATH: `${path.dirname(bun.binary)}${path.delimiter}${process.env.PATH}` },
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = result.stdout.toString() + result.stderr.toString();
    const passed = result.exitCode === 0;
    const counts = output.match(/^\s*\d+ (?:pass|fail)$/gm)?.map((line) => line.trim()) ?? [];
    results.push({ bun: bunSpec, reactNative: reactNativeSpec, passed, summary: counts.join(", ") });
    if (!passed) {
      const failures = output.split("\n").filter((line) => line.startsWith("(fail)"));
      console.log(failures.length > 0 ? failures.join("\n") : output.slice(-2000));
    }
  }
}

console.log("\nBun        React Native  Result");
for (const result of results) {
  console.log(
    `${result.bun.padEnd(10)} ${result.reactNative.padEnd(13)} ${result.passed ? "pass" : "FAIL"}  ${result.summary}`,
  );
}

process.exit(results.every((result) => result.passed) ? 0 : 1);
