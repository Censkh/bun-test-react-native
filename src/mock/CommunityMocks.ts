import { jest, mock } from "bun:test";
import { projectRequire } from "../ProjectRequire";

type JestWithRequireActual = typeof jest & { requireActual: (moduleName: string) => unknown };
const jestWithRequireActual = jest as JestWithRequireActual;

// Community packages that ship their own Jest mock. Each is mocked only when the project installs it,
// using the package's mock so behaviour tracks the installed version. Every version compatible with
// the supported React Native range ships these mocks.
const officialMocks = [
  // Default export only, for `jest.mock(name, () => mock)`.
  { packageName: "react-native-safe-area-context", mockPath: "jest/mock", exportsFrom: "default" },
  // CommonJS object that is both the module and its default export.
  { packageName: "@react-native-community/netinfo", mockPath: "jest/netinfo-mock.js", exportsFrom: "module" },
] as const;

// The mocks are written for Jest and reach for the `jest` global.
(globalThis as { jest?: unknown }).jest ??= jest;

for (const { packageName, mockPath, exportsFrom } of officialMocks) {
  let packagePath: string;
  let resolvedMockPath: string;
  try {
    packagePath = projectRequire.resolve(packageName);
    resolvedMockPath = projectRequire.resolve(`${packageName}/${mockPath}`);
  } catch {
    continue;
  }

  mock.module(packagePath, () => {
    const requireActual = jestWithRequireActual.requireActual;
    jestWithRequireActual.requireActual = (moduleName) =>
      moduleName === packageName ? require(`actual:${packagePath}`) : requireActual(moduleName);
    let loaded;
    try {
      loaded = require(`actual:${resolvedMockPath}`);
    } finally {
      jestWithRequireActual.requireActual = requireActual;
    }
    const moduleMock: Record<string, unknown> = exportsFrom === "default" ? loaded.default : loaded;
    return { ...moduleMock, default: moduleMock };
  });
}
