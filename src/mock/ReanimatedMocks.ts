import { jest, mock } from "bun:test";

const createReanimatedUseHandlerMock = () => ({
  context: {},
  doDependenciesDiffer: true,
});

const normalizeReanimatedMock = (reanimated: Record<string, unknown>) => {
  const animatedDefault = (reanimated.default as Record<string, unknown> | undefined) ?? {};
  const createAnimatedComponent =
    reanimated.createAnimatedComponent ??
    animatedDefault.createAnimatedComponent ??
    ((component: unknown) => component);
  const setGestureState = reanimated.setGestureState ?? jest.fn();
  const defaultExport = {
    ...animatedDefault,
    createAnimatedComponent,
    setGestureState,
  };

  return {
    ...reanimated,
    createAnimatedComponent,
    default: defaultExport,
    setGestureState,
    useHandler: createReanimatedUseHandlerMock,
  };
};

mock.module("react-native-reanimated", () => normalizeReanimatedMock(require("actual:react-native-reanimated/mock")));

mock.module("react-native-reanimated/mock", () =>
  normalizeReanimatedMock(require("actual:react-native-reanimated/mock")),
);
