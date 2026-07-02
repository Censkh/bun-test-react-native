import { jest, mock } from "bun:test";

const createReanimatedUseHandlerMock = () => ({
  context: {},
  doDependenciesDiffer: true,
});

const createReanimatedUseComposedEventHandlerMock =
  (useEvent: unknown) => (handlers: Array<((event: unknown) => void) | null>) => {
    if (typeof useEvent === "function") {
      return useEvent(
        (event: unknown) => {
          for (const handler of handlers) {
            handler?.(event);
          }
        },
        [],
        true,
      );
    }

    return (event: unknown) => {
      for (const handler of handlers) {
        handler?.(event);
      }
    };
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

mock.module("react-native-reanimated", () => normalizeReanimatedMock(require("actual:react-native-reanimated/mock")));

mock.module("react-native-reanimated/mock", () =>
  normalizeReanimatedMock(require("actual:react-native-reanimated/mock")),
);
