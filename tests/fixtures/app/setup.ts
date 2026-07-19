import "bun-test-react-native/setup";

import { afterEach, mock } from "bun:test";
import { Blob, File } from "node:buffer";
import { performance } from "node:perf_hooks";
import { TextDecoder, TextEncoder } from "node:util";

const jest = globalThis.jest;
const { notifyManager } = require("@tanstack/query-core");
const { act, cleanup } = require("@testing-library/react-native");

globalThis.performance ??= performance as Performance;
if (typeof globalThis.performance.markResourceTiming !== "function") {
  Object.defineProperty(globalThis.performance, "markResourceTiming", {
    configurable: true,
    value: () => {},
  });
}

globalThis.TextEncoder ??= TextEncoder;
globalThis.TextDecoder ??= TextDecoder as typeof globalThis.TextDecoder;
globalThis.Blob = Blob as typeof globalThis.Blob;
globalThis.File = File as typeof globalThis.File;
globalThis.__PICMAGIC_USE_CUSTOM_BUTTON_IN_TESTS__ = true;

notifyManager.setNotifyFunction((callback: () => void) => {
  act(callback);
});

mock.module("expo-blob", () => ({ Blob: globalThis.Blob }));
mock.module("@shopify/flash-list", () => require("./src/tests/mock/FlashList.mock.cjs"));
mock.module("react-native-nitro-auth", () => require("./src/tests/mock/ReactNativeNitroAuth.mock.cjs"));
require("react-native-reanimated/mock").setUpTests();

mock.module("uniwind", () => require("./src/tests/mock/Uniwind.mock.cjs"));
mock.module("uuid", () => require("./src/tests/mock/Uuid.mock.cjs"));
globalThis.CanvasKit ??= {};
require("@shopify/react-native-skia/jestSetup");
require("react-native-gesture-handler/jestSetup");

mock.module("react-i18next", () => ({
  initReactI18next: {
    type: "3rdParty",
    init: jest.fn(),
  },
  useTranslation: () => ({ t: (key: string) => key }),
}));

mock.module("react-native/Libraries/Lists/VirtualizedList", () => {
  const React = require("react");
  const { View } = require("react-native");

  const VirtualizedList = React.forwardRef(
    (
      {
        data = [],
        keyExtractor,
        renderItem,
      }: {
        data?: unknown[];
        keyExtractor?: (item: unknown, index: number) => string;
        renderItem?: (info: { item: unknown; index: number }) => unknown;
      },
      ref: unknown,
    ) =>
      React.createElement(
        View,
        { ref },
        data.map((item, index) =>
          React.createElement(
            View,
            { key: keyExtractor ? keyExtractor(item, index) : String(index) },
            renderItem?.({ item, index }),
          ),
        ),
      ),
  );
  Object.defineProperty(VirtualizedList, "displayName", {
    configurable: true,
    value: "VirtualizedList",
  });

  return {
    __esModule: true,
    default: VirtualizedList,
  };
});

require("./src/tests/mock/ReactNativeStorage.mock.cjs");
require("./src/tests/mock/RevenueCat.mock.cjs");
require("./src/tests/mock/Sentry.mock.cjs");

afterEach(() => {
  cleanup();
});
