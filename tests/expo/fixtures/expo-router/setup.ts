import "bun-test-react-native/setup";

jest.mock("@jest/globals", () => ({
  expect: globalThis.expect,
  jest: globalThis.jest,
}));

const safeAreaContextMock = require("react-native-safe-area-context/jest/mock").default;

jest.mock("react-native-safe-area-context", () => ({
  ...safeAreaContextMock,
  default: safeAreaContextMock,
}));
