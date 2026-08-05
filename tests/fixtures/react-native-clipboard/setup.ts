import { mock } from "bun:test";

import "../../../src/setup";

mock.module("@react-native-clipboard/clipboard", () => {
  const Clipboard = require("@react-native-clipboard/clipboard/jest/clipboard-mock");
  return {
    __esModule: true,
    ...Clipboard,
    default: Clipboard,
  };
});
