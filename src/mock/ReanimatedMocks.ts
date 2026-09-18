import { jest, mock } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { projectRequire } from "../ProjectRequire";

const createReanimatedUseHandlerMock = () => ({
  context: {},
  doDependenciesDiffer: true,
});

const createReanimatedUseComposedEventHandlerMock = (reanimatedUseEvent: unknown) => {
  const composeHandlers = (handlers: Array<((event: unknown) => void) | null>) => (event: unknown) => {
    for (const handler of handlers) {
      handler?.(event);
    }
  };

  if (typeof reanimatedUseEvent === "function") {
    return (handlers: Array<((event: unknown) => void) | null>) =>
      reanimatedUseEvent(
        (event: unknown) => {
          for (const handler of handlers) {
            handler?.(event);
          }
        },
        [],
        true,
      );
  }

  return composeHandlers;
};

const isReanimatedSharedValue = (value: unknown) => typeof value === "object" && value !== null && "value" in value;

const normalizeReanimatedMock = (reanimated: Record<string, unknown>) => {
  const animatedDefault = (reanimated.default as Record<string, unknown> | undefined) ?? {};
  const createAnimatedComponent =
    reanimated.createAnimatedComponent ??
    animatedDefault.createAnimatedComponent ??
    ((component: unknown) => component);
  const setGestureState = reanimated.setGestureState ?? jest.fn();
  const isSharedValue = reanimated.isSharedValue ?? animatedDefault.isSharedValue ?? isReanimatedSharedValue;
  const useComposedEventHandler =
    reanimated.useComposedEventHandler ??
    animatedDefault.useComposedEventHandler ??
    createReanimatedUseComposedEventHandlerMock(reanimated.useEvent ?? animatedDefault.useEvent);
  const defaultExport = {
    ...animatedDefault,
    createAnimatedComponent,
    isSharedValue,
    setGestureState,
    useComposedEventHandler,
  };

  return {
    ...reanimated,
    createAnimatedComponent,
    default: defaultExport,
    isSharedValue,
    setGestureState,
    useComposedEventHandler,
    useHandler: createReanimatedUseHandlerMock,
  };
};

// Reanimated's mock imports its real entry, which (from 4.6) registers a CSS event handler on the
// module it picked. Under Jest that is JSReanimated, whose `setCSSEventHandler` throws, so make it a no-op.
const JS_REANIMATED_PATHS = [
  "src/ReanimatedModule/js-reanimated/JSReanimated.ts",
  "lib/module/ReanimatedModule/js-reanimated/JSReanimated.js",
];

const installJSReanimatedPatch = (reanimatedPath: string) => {
  let packageRoot: string;
  try {
    packageRoot = path.dirname(projectRequire.resolve("react-native-reanimated/package.json"));
  } catch {
    packageRoot = path.dirname(reanimatedPath);
  }

  for (const relativePath of JS_REANIMATED_PATHS) {
    const jsReanimatedPath = path.join(packageRoot, relativePath);
    if (!fs.existsSync(jsReanimatedPath)) continue;

    mock.module(jsReanimatedPath, () => {
      const actual = require(`actual:${jsReanimatedPath}`);
      return {
        ...actual,
        createJSReanimatedModule: () => {
          const reanimatedModule = actual.createJSReanimatedModule();
          reanimatedModule.setCSSEventHandler = () => {};
          return reanimatedModule;
        },
      };
    });
  }
};

const installReanimatedMocks = () => {
  let reanimatedPath: string;
  let reanimatedMockPath: string;
  try {
    reanimatedPath = projectRequire.resolve("react-native-reanimated");
    reanimatedMockPath = projectRequire.resolve("react-native-reanimated/mock");
  } catch {
    return;
  }

  installJSReanimatedPatch(reanimatedPath);
  const createMock = () => normalizeReanimatedMock(require(`actual:${reanimatedMockPath}`));
  mock.module(reanimatedPath, createMock);
  mock.module(reanimatedMockPath, createMock);
};

installReanimatedMocks();
