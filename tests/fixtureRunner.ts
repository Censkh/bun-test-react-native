import { beforeAll, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

export const fixturePath = (testDir: string, fixtureName: string) => path.join(testDir, "fixtures", fixtureName);

const packageRoot = path.resolve(import.meta.dir, "..");
const fixturePreparationTimeoutMs = 60_000;
const fixturePreparationLockTimeoutMs = 60_000;
const fixtureRunTimeoutMs = 30_000;

type BunFixtureBeforeOptions = {
  env?: NodeJS.ProcessEnv;
};

const preparedFixtureRoots = new Set<string>();

const sleepSync = (durationMs: number) => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, durationMs);
};

const getFixturePackageLinkPath = (fixtureRoot: string) =>
  path.join(fixtureRoot, "node_modules", "bun-test-react-native");

const pathExists = (value: string) => {
  try {
    fs.lstatSync(value);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
};

const isFixturePrepared = (fixtureRoot: string) => pathExists(getFixturePackageLinkPath(fixtureRoot));

const withFixturePreparationLock = <TResult>(fixtureRoot: string, callback: () => TResult) => {
  const lockPath = path.join(fixtureRoot, ".bun-test-react-native-prepare.lock");
  const deadline = Date.now() + fixturePreparationLockTimeoutMs;
  let lockFile: number | undefined;

  while (lockFile === undefined && Date.now() < deadline) {
    try {
      lockFile = fs.openSync(lockPath, "wx");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
      sleepSync(25);
    }
  }

  if (lockFile === undefined) {
    throw new Error(`Timed out waiting for fixture preparation lock: ${lockPath}`);
  }

  try {
    fs.writeFileSync(lockFile, `${process.pid}\n`);
    return callback();
  } finally {
    fs.closeSync(lockFile);
    fs.unlinkSync(lockPath);
  }
};

const linkFixturePackage = (fixtureRoot: string) => {
  const nodeModulesPath = path.join(fixtureRoot, "node_modules");
  const packageLinkPath = getFixturePackageLinkPath(fixtureRoot);
  if (pathExists(packageLinkPath)) return;

  fs.mkdirSync(nodeModulesPath, { recursive: true });
  fs.symlinkSync(packageRoot, packageLinkPath, "dir");
};

const clearFixtureTransformCache = (fixtureRoot: string) => {
  fs.rmSync(path.join(fixtureRoot, "node_modules", ".btrn-cache"), { force: true, recursive: true });
};

const findFixtureTests = (fixtureRoot: string): string[] => {
  const fixtureTests: string[] = [];
  const visit = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "coverage") continue;
        visit(entryPath);
      } else if (/\.fixture\.tsx?$/.test(entry.name)) {
        fixtureTests.push(`./${path.relative(fixtureRoot, entryPath)}`);
      }
    }
  };

  visit(fixtureRoot);
  return fixtureTests.sort();
};

const prepareBunFixture = (fixtureRoot: string, options: BunFixtureBeforeOptions = {}) => {
  if (isFixturePrepared(fixtureRoot)) {
    return;
  }

  return withFixturePreparationLock(fixtureRoot, () => {
    if (isFixturePrepared(fixtureRoot)) {
      return;
    }

    const packageJsonPath = path.join(fixtureRoot, "package.json");
    if (!fs.existsSync(packageJsonPath)) {
      linkFixturePackage(fixtureRoot);
      return;
    }

    const installArgs = ["install", "--no-save"];
    if (path.basename(fixtureRoot) === "flash-list-ref") installArgs.push("--omit=peer");
    const installResult = Bun.spawnSync({
      cmd: [process.execPath, ...installArgs],
      cwd: fixtureRoot,
      env: { ...process.env, ...options.env },
      stderr: "pipe",
      stdout: "pipe",
    });

    if (installResult.exitCode !== 0) {
      throw new Error(
        `Failed to install fixture dependencies for ${fixtureRoot}:\n${installResult.stderr.toString() || installResult.stdout.toString()}`,
      );
    }

    linkFixturePackage(fixtureRoot);
  });
};

const beforeBunFixture = (fixtureRoot: string, options: BunFixtureBeforeOptions = {}) => {
  const resolvedFixtureRoot = path.resolve(fixtureRoot);

  beforeAll(() => {
    prepareBunFixture(resolvedFixtureRoot, options);
    preparedFixtureRoots.add(resolvedFixtureRoot);
  }, fixturePreparationTimeoutMs);
};

type BunFixtureResult = {
  durationMs: number;
  exitCode: number | null;
  stderr: string;
  stdout: string;
  expectStatusCode(expectedStatusCode: number): void;
};

const createBunFixtureResult = (
  fixtureRoot: string,
  result: Omit<BunFixtureResult, "expectStatusCode">,
): BunFixtureResult => ({
  ...result,
  expectStatusCode(expectedStatusCode: number) {
    if (result.exitCode !== expectedStatusCode) {
      console.error(`[fixture:${path.basename(fixtureRoot)}] expected exit code ${expectedStatusCode}`);
      console.error(`[fixture:${path.basename(fixtureRoot)}] actual exit code ${result.exitCode}`);
      if (result.stdout) console.error(result.stdout);
      if (result.stderr) console.error(result.stderr);
    }

    expect(result.exitCode).toBe(expectedStatusCode);
  },
});

type BunFixtureRunOptions = {
  env?: NodeJS.ProcessEnv;
  fixtureTests?: string[];
  logOutput?: boolean;
  testArgs?: string[];
  timeoutMs?: number;
};

const runBunFixture = (fixtureRoot: string, options: BunFixtureRunOptions = {}) => {
  const start = performance.now();
  if (!preparedFixtureRoots.has(path.resolve(fixtureRoot))) {
    return createBunFixtureResult(fixtureRoot, {
      durationMs: performance.now() - start,
      exitCode: 1,
      stderr: `Fixture ${fixtureRoot} was not prepared. Call bunFixtureTest() while defining the test suite.`,
      stdout: "",
    });
  }

  const fixtureTests = options.fixtureTests ?? findFixtureTests(fixtureRoot);
  if (fixtureTests.length === 0) {
    return createBunFixtureResult(fixtureRoot, {
      durationMs: performance.now() - start,
      exitCode: 1,
      stderr: `No fixture tests found in ${fixtureRoot}`,
      stdout: "",
    });
  }

  clearFixtureTransformCache(fixtureRoot);

  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      "test",
      ...(options.testArgs ?? []),
      "--timeout",
      String(options.timeoutMs ?? fixtureRunTimeoutMs),
      ...fixtureTests,
    ],
    cwd: fixtureRoot,
    env: { ...process.env, ...options.env },
    stderr: "pipe",
    stdout: "pipe",
  });
  const durationMs = performance.now() - start;
  const stdout = result.stdout.toString();
  const stderr = result.stderr.toString();

  if (options.logOutput || process.env.BUN_TEST_REACT_NATIVE_TIMINGS === "1") {
    console.error(`[fixture:${path.basename(fixtureRoot)}] ${durationMs.toFixed(1)}ms`);
    if (stdout) console.error(stdout);
    if (stderr) console.error(stderr);
  }

  return createBunFixtureResult(fixtureRoot, { durationMs, exitCode: result.exitCode, stderr, stdout });
};

/** The version of `packageName` installed in the fixture, or undefined if it is not installed. */
export const fixturePackageVersion = (fixtureRoot: string, packageName: string): string | undefined => {
  try {
    const packageJsonPath = path.join(fixtureRoot, "node_modules", packageName, "package.json");
    return JSON.parse(fs.readFileSync(packageJsonPath, "utf8")).version;
  } catch {
    return undefined;
  }
};

/**
 * Whether the fixture's installed `packageName` satisfies `range`. Prereleases match as their release
 * version (0.87.0-rc.1 satisfies ">=0.87.0"), matching `matrixDependencies` in the fixture install.
 */
export const fixturePackageSatisfies = (fixtureRoot: string, packageName: string, range: string) => {
  const version = fixturePackageVersion(fixtureRoot, packageName);
  return version !== undefined && Bun.semver.satisfies(version.replace(/-.*$/, ""), range);
};

type BunFixtureVersions = {
  packageVersion(packageName: string): string | undefined;
  satisfies(packageName: string, range: string): boolean;
};

export const bunFixtureTest = (fixtureRoot: string, options: BunFixtureBeforeOptions = {}) => {
  beforeBunFixture(fixtureRoot, options);

  // Read lazily: fixtures may only be installed once the suite's beforeAll runs.
  const versions: BunFixtureVersions = {
    packageVersion: (packageName) => fixturePackageVersion(fixtureRoot, packageName),
    satisfies: (packageName, range) => fixturePackageSatisfies(fixtureRoot, packageName, range),
  };

  return {
    ...versions,
    test(
      name: string,
      callback: (
        context: BunFixtureVersions & { run: (runOptions?: BunFixtureRunOptions) => BunFixtureResult },
      ) => void | Promise<void>,
      timeout?: number,
    ) {
      return test(
        name,
        () => callback({ ...versions, run: (runOptions) => runBunFixture(fixtureRoot, runOptions) }),
        timeout ?? fixtureRunTimeoutMs,
      );
    },
  };
};
