import { jest, mock } from "bun:test";
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

const installReanimatedMocks = () => {
  let reanimatedPath: string;
  let reanimatedMockPath: string;
  try {
    reanimatedPath = projectRequire.resolve("react-native-reanimated");
    reanimatedMockPath = projectRequire.resolve("react-native-reanimated/mock");
  } catch {
    return;
  }

  const createMock = () => normalizeReanimatedMock(require(`actual:${reanimatedMockPath}`));
  mock.module(reanimatedPath, createMock);
  mock.module(reanimatedMockPath, createMock);
};

installReanimatedMocks();
