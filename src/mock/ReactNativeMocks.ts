import { jest, mock } from "bun:test";

declare global {
  var __DEV__: boolean | undefined;
  var __REACT_DEVTOOLS_GLOBAL_HOOK__: unknown;
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
  var IS_REACT_NATIVE_TEST_ENVIRONMENT: boolean | undefined;
  var __turboModuleProxy: ((name: string) => unknown) | undefined;
  var ErrorUtils:
    | {
        applyWithGuard: <T>(fun: () => T) => T | undefined;
        applyWithGuardIfNeeded: <T>(fun: () => T) => T | undefined;
        getGlobalHandler: () => (error: unknown, isFatal?: boolean) => void;
        guard: <T extends (...args: unknown[]) => unknown>(fun: T) => T;
        inGuard: () => boolean;
        reportError: (error: unknown) => void;
        reportFatalError: (error: unknown) => void;
        setGlobalHandler: (handler: (error: unknown, isFatal?: boolean) => void) => void;
      }
    | undefined;
  var nativeFabricUIManager: object | undefined;
  var regeneratorRuntime: unknown;
}

const SUPPORTED_REACT_NATIVE_JEST_MOCKS = new Set([
  "AccessibilityInfo",
  "ActivityIndicator",
  "AppState",
  "Clipboard",
  "Image",
  "InitializeCore",
  "Linking",
  "Modal",
  "NativeComponentRegistry",
  "NativeModules",
  "RendererProxy",
  "RefreshControl",
  "ScrollView",
  "Text",
  "TextInput",
  "UIManager",
  "Vibration",
  "View",
  "ViewNativeComponent",
  "requireNativeComponent",
  "useColorScheme",
]);

const reactNativeJestMock = (mockPath: string) => {
  if (!SUPPORTED_REACT_NATIVE_JEST_MOCKS.has(mockPath)) {
    throw new Error(`Unsupported React Native Jest mock: ${mockPath}`);
  }
  return require(`@react-native/jest-preset/jest/mocks/${mockPath}.js`);
};

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.IS_REACT_NATIVE_TEST_ENVIRONMENT = true;

let errorHandler: (error: unknown, isFatal?: boolean) => void = (error: unknown) => {
  throw error;
};
globalThis.ErrorUtils ??= {
  applyWithGuard: (fun) => {
    try {
      return fun();
    } catch (error) {
      errorHandler(error, true);
    }
  },
  applyWithGuardIfNeeded: (fun) => fun(),
  getGlobalHandler: () => errorHandler,
  guard: (fun) => fun,
  inGuard: () => false,
  reportError: (error) => errorHandler(error, false),
  reportFatalError: (error) => errorHandler(error, true),
  setGlobalHandler: (handler) => {
    errorHandler = handler;
  },
};

const browserLocation = new URL("http://localhost:8081/index.bundle?platform=ios");
const browserDocument = {
  currentScript: null,
  title: "",
};
const browserHistory = {
  state: null as unknown,
  go: jest.fn(),
  pushState: jest.fn((state: unknown, _title: string, url?: string) => {
    browserHistory.state = state;
    if (url) browserLocation.href = new URL(url, browserLocation.href).href;
  }),
  replaceState: jest.fn((state: unknown, _title: string, url?: string) => {
    browserHistory.state = state;
    if (url) browserLocation.href = new URL(url, browserLocation.href).href;
  }),
};
const eventListeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
const browserWindow = Object.assign(globalThis, {
  addEventListener: jest.fn((eventName: string, listener: EventListenerOrEventListenerObject) => {
    const listeners = eventListeners.get(eventName) ?? new Set();
    listeners.add(listener);
    eventListeners.set(eventName, listeners);
  }),
  document: browserDocument,
  history: browserHistory,
  location: browserLocation,
  removeEventListener: jest.fn(
    (eventName: string, listener: EventListenerOrEventListenerObject) => {
      eventListeners.get(eventName)?.delete(listener);
    },
  ),
});

Object.defineProperties(globalThis, {
  __DEV__: {
    configurable: true,
    enumerable: true,
    value: true,
    writable: true,
  },
  cancelAnimationFrame: {
    configurable: true,
    enumerable: true,
    value(id: ReturnType<typeof setTimeout>) {
      return clearTimeout(id);
    },
    writable: true,
  },
  nativeFabricUIManager: {
    configurable: true,
    enumerable: true,
    value: {},
    writable: true,
  },
  performance: {
    configurable: true,
    enumerable: true,
    value: {
      now: jest.fn(Date.now),
    },
    writable: true,
  },
  regeneratorRuntime: {
    configurable: true,
    enumerable: true,
    value: require("regenerator-runtime/runtime"),
    writable: true,
  },
  requestAnimationFrame: {
    configurable: true,
    enumerable: true,
    value(callback: (now: number) => void) {
      return setTimeout(() => callback(Date.now()), 0);
    },
    writable: true,
  },
  window: {
    configurable: true,
    enumerable: true,
    value: browserWindow,
    writable: true,
  },
});

if (globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ === undefined) {
  globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    isDisabled: true,
    off() {},
    on() {},
    renderers: {
      values: () => [],
    },
  };
  globalThis.window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
}

try {
  mock.module("prettier", () => {
    const module = require("node:module");
    return module.prototype.require(require.resolve("prettier"));
  });
} catch {}

const mockFromPreset = (moduleName: string, presetMockPath?: string) => {
  mock.module(moduleName, () =>
    presetMockPath
      ? normalizePresetMock(reactNativeJestMock(presetMockPath.replace("./mocks/", "")))
      : { default: {} },
  );
};

const mockViewNativeComponent = () => {
  const mockModule = normalizePresetMock(reactNativeJestMock("ViewNativeComponent"));
  return {
    ...mockModule,
    Commands: {
      blur: jest.fn(),
      focus: jest.fn(),
      hotspotUpdate: jest.fn(),
      setPressed: jest.fn(),
    },
  };
};

const normalizePresetMock = (mockModule: unknown) => {
  if (!mockModule || typeof mockModule !== "object") {
    return { default: mockModule };
  }

  const normalized = { ...(mockModule as Record<string, unknown>) };
  delete normalized.__esModule;
  normalized.default = "default" in normalized ? normalized.default : mockModule;
  return normalized;
};

export const reactNativeNativeModules = reactNativeJestMock("NativeModules").default;
Object.defineProperties(reactNativeNativeModules, {
  __esModule: {
    configurable: true,
    value: true,
  },
  default: {
    configurable: true,
    value: reactNativeNativeModules,
  },
});
reactNativeNativeModules.SourceCode ??= {};
reactNativeNativeModules.SourceCode.getConstants = () => ({
  scriptURL: "http://localhost:8081/index.bundle?platform=ios",
});
const rngestureHandlerModule = {
  ...(reactNativeNativeModules.RNGestureHandlerModule ?? {}),
  createGestureHandler:
    reactNativeNativeModules.RNGestureHandlerModule?.createGestureHandler ?? jest.fn(),
  configureRelations:
    reactNativeNativeModules.RNGestureHandlerModule?.configureRelations ?? jest.fn(),
  install: reactNativeNativeModules.RNGestureHandlerModule?.install ?? jest.fn(),
  installUIRuntimeBindings:
    reactNativeNativeModules.RNGestureHandlerModule?.installUIRuntimeBindings ??
    jest.fn(() => true),
  setGestureHandlerConfig:
    reactNativeNativeModules.RNGestureHandlerModule?.setGestureHandlerConfig ?? jest.fn(),
  updateGestureHandlerConfig:
    reactNativeNativeModules.RNGestureHandlerModule?.updateGestureHandlerConfig ?? jest.fn(),
};
Object.defineProperty(reactNativeNativeModules, "RNGestureHandlerModule", {
  configurable: true,
  enumerable: true,
  value: rngestureHandlerModule,
  writable: true,
});

const keyboardControllerModule = {
  ...(reactNativeNativeModules.KeyboardController ?? {}),
  addListener: reactNativeNativeModules.KeyboardController?.addListener ?? jest.fn(),
  dismiss:
    reactNativeNativeModules.KeyboardController?.dismiss ??
    jest.fn((_keepFocus?: boolean, _animated?: boolean) => undefined),
  getConstants:
    reactNativeNativeModules.KeyboardController?.getConstants ??
    jest.fn(() => ({ keyboardBorderRadius: 0 })),
  preload: reactNativeNativeModules.KeyboardController?.preload ?? jest.fn(),
  removeListeners: reactNativeNativeModules.KeyboardController?.removeListeners ?? jest.fn(),
  setDefaultMode: reactNativeNativeModules.KeyboardController?.setDefaultMode ?? jest.fn(),
  setFocusTo:
    reactNativeNativeModules.KeyboardController?.setFocusTo ??
    jest.fn((_direction: string) => undefined),
  setInputMode:
    reactNativeNativeModules.KeyboardController?.setInputMode ??
    jest.fn((_mode: number) => undefined),
  viewPositionInWindow:
    reactNativeNativeModules.KeyboardController?.viewPositionInWindow ?? jest.fn(async () => ({})),
};
Object.defineProperty(reactNativeNativeModules, "KeyboardController", {
  configurable: true,
  enumerable: true,
  value: keyboardControllerModule,
  writable: true,
});

const previousTurboModuleProxy = globalThis.__turboModuleProxy;
globalThis.__turboModuleProxy = (name: string) => {
  if (name === "KeyboardController") return keyboardControllerModule;
  if (name === "RNGestureHandlerModule") return rngestureHandlerModule;
  return previousTurboModuleProxy?.(name) ?? null;
};

mock.module("react-native/Libraries/BatchedBridge/NativeModules", () => ({
  __esModule: true,
  default: reactNativeNativeModules,
}));
mockFromPreset("react-native/Libraries/Core/InitializeCore", "./mocks/InitializeCore");
mockFromPreset("react-native/Libraries/Core/NativeExceptionsManager");
mockFromPreset(
  "react-native/Libraries/NativeComponent/NativeComponentRegistry",
  "./mocks/NativeComponentRegistry",
);
mockFromPreset("react-native/Libraries/ReactNative/RendererProxy", "./mocks/RendererProxy");
mockFromPreset(
  "react-native/Libraries/ReactNative/requireNativeComponent",
  "./mocks/requireNativeComponent",
);
mockFromPreset("react-native/Libraries/ReactNative/UIManager", "./mocks/UIManager");
mock.module("react-native/Libraries/Components/View/ViewNativeComponent", mockViewNativeComponent);
mockFromPreset("react-native/Libraries/Text/Text", "./mocks/Text");
mockFromPreset("react-native/Libraries/Components/View/View", "./mocks/View");

mockFromPreset("react-native/Libraries/AppState/AppState", "./mocks/AppState");
mockFromPreset(
  "react-native/Libraries/Components/AccessibilityInfo/AccessibilityInfo",
  "./mocks/AccessibilityInfo",
);
mockFromPreset(
  "react-native/Libraries/Components/ActivityIndicator/ActivityIndicator",
  "./mocks/ActivityIndicator",
);
mockFromPreset("react-native/Libraries/Components/Clipboard/Clipboard", "./mocks/Clipboard");
mockFromPreset(
  "react-native/Libraries/Components/RefreshControl/RefreshControl",
  "./mocks/RefreshControl",
);
mockFromPreset("react-native/Libraries/Components/ScrollView/ScrollView", "./mocks/ScrollView");
mockFromPreset("react-native/Libraries/Components/TextInput/TextInput", "./mocks/TextInput");
mockFromPreset("react-native/Libraries/Image/Image", "./mocks/Image");
mockFromPreset("react-native/Libraries/Linking/Linking", "./mocks/Linking");
mockFromPreset("react-native/Libraries/Modal/Modal", "./mocks/Modal");
mockFromPreset("react-native/Libraries/Utilities/useColorScheme", "./mocks/useColorScheme");
mockFromPreset("react-native/Libraries/Vibration/Vibration", "./mocks/Vibration");
