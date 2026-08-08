import { describe, expect, test } from "bun:test";
import { patchMiniflareWorkerdSpawn } from "../src/mock/MiniflareWorkerdPatch";

describe("Miniflare workerd patch", () => {
  test("moves Miniflare's control channel onto stdout without changing its stdio contract", () => {
    const stdout = {};
    const child = { stdio: [{}, stdout, {}] as unknown[], stdout };
    const spawnCalls: unknown[][] = [];
    const spawn = patchMiniflareWorkerdSpawn(
      (...arguments_) => {
        spawnCalls.push(arguments_);
        return child;
      },
      (process) => process.stdout,
      (process) => process.stdio,
    );

    const result = spawn("/tmp/workerd", ["serve", "--control-fd=3", "-"], {
      env: {},
      stdio: ["pipe", "pipe", "pipe", "pipe"],
    });

    expect(spawnCalls).toEqual([
      ["/tmp/workerd", ["serve", "--control-fd=1", "-"], { env: {}, stdio: ["pipe", "pipe", "pipe"] }],
    ]);
    expect(result.stdio[3]).toBe(stdout);
  });

  test("leaves unrelated child processes unchanged", () => {
    const child = { stdio: [], stdout: {} };
    const spawnCalls: unknown[][] = [];
    const spawn = patchMiniflareWorkerdSpawn(
      (...arguments_) => {
        spawnCalls.push(arguments_);
        return child;
      },
      (process) => process.stdout,
      (process) => process.stdio,
    );
    const options = { env: {}, stdio: ["pipe", "pipe", "pipe", "pipe"] };

    expect(spawn("/tmp/workerd", ["serve", "--control-fd=4", "-"], options)).toBe(child);
    expect(spawnCalls).toEqual([["/tmp/workerd", ["serve", "--control-fd=4", "-"], options]]);
  });
});
