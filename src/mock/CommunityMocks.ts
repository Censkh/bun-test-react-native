import { jest, mock } from "bun:test";

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
