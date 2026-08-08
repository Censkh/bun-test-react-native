import childProcess from "node:child_process";

type WorkerdSpawnOptions = {
  stdio: string[];
  [key: string]: unknown;
};

type SpawnArguments = [command: string, args: readonly string[], options: WorkerdSpawnOptions];

const isMiniflareWorkerdSpawn = ([command, args, options]: SpawnArguments) =>
  /(?:^|[/\\\\])workerd(?:\\.exe)?$/i.test(command) &&
  args.includes("--control-fd=3") &&
  options.stdio.length === 4 &&
  options.stdio.every((entry) => entry === "pipe");

export const patchMiniflareWorkerdSpawn = <Child>(
  spawn: (...arguments_: SpawnArguments) => Child,
  getStdout: (child: Child) => unknown,
  getStdio: (child: Child) => unknown[],
) => {
  return (...arguments_: SpawnArguments) => {
    if (!isMiniflareWorkerdSpawn(arguments_)) {
      return spawn(...arguments_);
    }

    const [command, args, options] = arguments_;
    const child = spawn(
      command,
      args.map((arg) => (arg === "--control-fd=3" ? "--control-fd=1" : arg)),
      {
        ...options,
        stdio: options.stdio.slice(0, 3),
      },
    );
    getStdio(child)[3] = getStdout(child);
    return child;
  };
};

const originalSpawn = childProcess.spawn as unknown as (
  ...arguments_: SpawnArguments
) => ReturnType<typeof childProcess.spawn>;

childProcess.spawn = patchMiniflareWorkerdSpawn(
  originalSpawn as (...arguments_: SpawnArguments) => ReturnType<typeof childProcess.spawn>,
  (child) => child.stdout,
  (child) => child.stdio,
) as typeof childProcess.spawn;
