import { jest, mock } from "bun:test";
import React, { useContext } from "react";
import { View } from "react-native";

const safeAreaInsets = { bottom: 0, left: 0, right: 0, top: 0 };
const safeAreaFrame = { height: 640, width: 320, x: 0, y: 0 };
const SafeAreaInsetsContext = React.createContext<typeof safeAreaInsets | null>(null);
const SafeAreaFrameContext = React.createContext<typeof safeAreaFrame | null>(null);

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

mock.module("react-native-safe-area-context", () => ({
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
  useSafeArea: () => useContext(SafeAreaInsetsContext) ?? safeAreaInsets,
  useSafeAreaFrame: () => useContext(SafeAreaFrameContext) ?? safeAreaFrame,
  useSafeAreaInsets: () => useContext(SafeAreaInsetsContext) ?? safeAreaInsets,
  withSafeAreaInsets: <Props extends object>(Component: React.ComponentType<Props>) =>
    function WithSafeAreaInsets(props: Props) {
      return React.createElement(Component, {
        ...props,
        insets: useContext(SafeAreaInsetsContext) ?? safeAreaInsets,
      } as Props);
    },
}));
