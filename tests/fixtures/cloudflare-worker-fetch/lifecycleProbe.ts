import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createTestHarness } from "wrangler";

const fixtureRoot = import.meta.dir;
const configPath = path.join(fixtureRoot, "wrangler.toml");

type ProbeResult = {
  mode: "pipe" | "ignore";
  childExitCode: number | null;
  harnessStarted: boolean;
  harnessError?: string;
  events: unknown[];
};

const runMode = async (mode: ProbeResult["mode"]): Promise<ProbeResult> => {
  const directory = mkdtempSync(path.join(tmpdir(), "bun-test-react-native-workerd-"));
  const eventLogPath = path.join(directory, "events.jsonl");
  const child = Bun.spawn({
    cmd: [
      "node",
      "--input-type=module",
      "--eval",
      `
        import { appendFileSync } from "node:fs";
        import childProcess from "node:child_process";
        import path from "node:path";

        const record = (event) => appendFileSync(process.env.WORKERD_PROBE_LOG, JSON.stringify(event) + "\\n");
        const originalSpawn = childProcess.spawn.bind(childProcess);
        childProcess.spawn = (...args) => {
          const process = originalSpawn(...args);
          record({ event: "spawn", pid: process.pid, command: args[0], args: args[1], stdio: args[2]?.stdio });
          process.once("exit", (code, signal) => record({ event: "exit", pid: process.pid, code, signal }));
          process.once("error", (error) => record({ event: "error", pid: process.pid, message: error.message }));
          return process;
        };

        const { unstable_startWorker } = await import("wrangler");
        const worker = await unstable_startWorker({
          config: path.join(process.cwd(), "wrangler.toml"),
          dev: { inspector: false, persist: false, remote: false, server: { hostname: "127.0.0.1", port: 0 } },
        });
        try {
          await worker.ready;
          await (await worker.fetch("https://example.com/cloudflare-worker-fetch")).text();
          record({ event: "worker-ready" });
        } finally {
          await worker.dispose();
          record({ event: "worker-disposed" });
          await new Promise((resolve) => setTimeout(resolve, 1_000));
        }
      `,
    ],
    cwd: fixtureRoot,
    env: { ...process.env, WORKERD_PROBE_LOG: eventLogPath },
    stderr: "pipe",
    stdout: mode,
  });
  const childExitCode = await child.exited;

  let harnessStarted = false;
  let harnessError: string | undefined;
  const server = createTestHarness({ workers: [{ configPath }] });
  try {
    await server.listen();
    harnessStarted = true;
  } catch (error) {
    harnessError = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  } finally {
    await server.close().catch(() => undefined);
  }

  const events = (() => {
    try {
      return readFileSync(eventLogPath, "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
    } catch {
      return [];
    }
  })();

  return { mode, childExitCode, harnessStarted, harnessError, events };
};

for (const mode of ["pipe", "ignore"] as const) {
  console.log(JSON.stringify(await runMode(mode)));
}
