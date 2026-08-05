import { jest, mock } from "bun:test";
import { projectRequire } from "../ProjectRequire";

const safeAreaInsets = { bottom: 0, left: 0, right: 0, top: 0 };
const safeAreaFrame = { height: 640, width: 320, x: 0, y: 0 };

const netInfoState = {
  isConnected: true,
  isInternetReachable: true,
  type: "wifi",
};

const netInfoMock = {
  addEventListener: jest.fn((listener?: (state: typeof netInfoState) => void) => {
    listener?.(netInfoState);
    return jest.fn();
  }),
  fetch: jest.fn(async () => netInfoState),
};

mock.module("@react-native-community/netinfo", () => ({
  ...netInfoMock,
  default: netInfoMock,
}));

const installSafeAreaContextMock = () => {
  let safeAreaContextPath: string;
  try {
    safeAreaContextPath = projectRequire.resolve("react-native-safe-area-context");
  } catch {
    return;
  }

  const React = projectRequire("react") as typeof import("react");
  const { View } = projectRequire("react-native") as typeof import("react-native");
  const SafeAreaInsetsContext = React.createContext<typeof safeAreaInsets | null>(null);
  const SafeAreaFrameContext = React.createContext<typeof safeAreaFrame | null>(null);

  mock.module(safeAreaContextPath, () => ({
    SafeAreaConsumer: SafeAreaInsetsContext.Consumer,
    SafeAreaContext: SafeAreaInsetsContext,
    SafeAreaFrameContext,
    SafeAreaInsetsContext,
    SafeAreaProvider: ({
      children,
      initialMetrics,
    }: {
      children: React.ReactNode;
      initialMetrics?: { frame?: typeof safeAreaFrame; insets?: typeof safeAreaInsets };
    }) =>
      React.createElement(
        SafeAreaFrameContext.Provider,
        { value: initialMetrics?.frame ?? safeAreaFrame },
        React.createElement(
          SafeAreaInsetsContext.Provider,
          { value: initialMetrics?.insets ?? safeAreaInsets },
          children,
        ),
      ),
    SafeAreaView: View,
    initialWindowMetrics: null,
    initialWindowSafeAreaInsets: safeAreaInsets,
    useSafeArea: () => React.useContext(SafeAreaInsetsContext) ?? safeAreaInsets,
    useSafeAreaFrame: () => React.useContext(SafeAreaFrameContext) ?? safeAreaFrame,
    useSafeAreaInsets: () => React.useContext(SafeAreaInsetsContext) ?? safeAreaInsets,
    withSafeAreaInsets: <Props extends object>(Component: React.ComponentType<Props>) =>
      function WithSafeAreaInsets(props: Props) {
        return React.createElement(Component, {
          ...props,
          insets: React.useContext(SafeAreaInsetsContext) ?? safeAreaInsets,
        } as Props);
      },
  }));
};

installSafeAreaContextMock();
