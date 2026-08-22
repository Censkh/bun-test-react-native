import { jest, mock } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { projectRequire } from "../ProjectRequire";
import {
  createComponentMock,
  createModalMock,
  createNativeComponent,
  createRefreshControlMock,
  createScrollViewMock,
  nativeMethods,
} from "./ReactNativeComponentMocks";
import {
  createAccessibilityInfoMock,
  createAppStateMock,
  createClipboardMock,
  createLinkingMock,
  createVibrationMock,
} from "./ReactNativeModuleMocks";

const getReactNativeInstallations = () => {
  const installations = new Set<string>();
  for (const startDirectory of [process.cwd(), import.meta.dir]) {
    for (let directory = startDirectory; path.dirname(directory) !== directory; directory = path.dirname(directory)) {
      const installation = path.join(directory, "node_modules", "react-native");
      if (fs.existsSync(installation)) installations.add(installation);
    }
  }
  return installations;
};

const mockReactNativeModule = (moduleName: string, factory: () => unknown) => {
  mock.module(moduleName, factory);

  for (const resolve of [require.resolve, projectRequire.resolve]) {
    try {
      const resolvedPath = resolve(moduleName);
      mock.module(resolvedPath, factory);
      mock.module(pathToFileURL(resolvedPath).href, factory);
    } catch {}
  }

  const relativePath = moduleName.replace(/^react-native\//, "");
  for (const installation of getReactNativeInstallations()) {
    const resolvedPath = path.join(installation, `${relativePath}.js`);
    if (!fs.existsSync(resolvedPath)) continue;
    mock.module(resolvedPath, factory);
    mock.module(pathToFileURL(resolvedPath).href, factory);
  }
};

declare global {
  var __REACT_DEVTOOLS_GLOBAL_HOOK__: unknown;
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
  var IS_REACT_NATIVE_TEST_ENVIRONMENT: boolean | undefined;
  var nativeModuleProxy: Record<string, unknown> | undefined;
  var __turboModuleProxy: ((name: string) => unknown) | undefined;

  var nativeFabricUIManager: object | undefined;
  var regeneratorRuntime: unknown;
}

type ErrorUtilsGlobal = {
  applyWithGuard: <ReturnValue>(fun: () => ReturnValue) => ReturnValue | undefined;
  applyWithGuardIfNeeded: <ReturnValue>(fun: () => ReturnValue) => ReturnValue;
  getGlobalHandler: () => (error: unknown, isFatal?: boolean) => void;
  guard: <FunctionValue extends (...args: never[]) => unknown>(fun: FunctionValue) => FunctionValue;
  inGuard: () => boolean;
  reportError: (error: unknown) => void;
  reportFatalError: (error: unknown) => void;
  setGlobalHandler: (handler: (error: unknown, isFatal?: boolean) => void) => void;
};

const reactNativeGlobal = globalThis as typeof globalThis & {
  ErrorUtils?: ErrorUtilsGlobal;
};

const withDefaultExport = (value: unknown) => ({
  default: value,
});

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.IS_REACT_NATIVE_TEST_ENVIRONMENT = true;

let errorHandler: (error: unknown, isFatal?: boolean) => void = (error: unknown) => {
  throw error;
};
reactNativeGlobal.ErrorUtils ??= {
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
  removeEventListener: jest.fn((eventName: string, listener: EventListenerOrEventListenerObject) => {
    eventListeners.get(eventName)?.delete(listener);
  }),
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

const sharedNativeModules = require("./NativeModules").default;
export const reactNativeNativeModules = sharedNativeModules;
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
const reactNativeUIManager = {
  ...reactNativeNativeModules.UIManager,
  blur: reactNativeNativeModules.UIManager?.blur ?? jest.fn(),
  createView: reactNativeNativeModules.UIManager?.createView ?? jest.fn(),
  customBubblingEventTypes: reactNativeNativeModules.UIManager?.customBubblingEventTypes ?? {},
  customDirectEventTypes: reactNativeNativeModules.UIManager?.customDirectEventTypes ?? {},
  dispatchViewManagerCommand: reactNativeNativeModules.UIManager?.dispatchViewManagerCommand ?? jest.fn(),
  focus: reactNativeNativeModules.UIManager?.focus ?? jest.fn(),
  getConstants:
    reactNativeNativeModules.UIManager?.getConstants ??
    jest.fn(() => ({
      genericBubblingEventTypes: {},
      genericDirectEventTypes: {},
    })),
  getConstantsForViewManager: reactNativeNativeModules.UIManager?.getConstantsForViewManager ?? jest.fn(() => null),
  getDefaultEventTypes:
    reactNativeNativeModules.UIManager?.getDefaultEventTypes ??
    jest.fn(() => ({
      bubblingEventTypes: {},
      directEventTypes: {},
    })),
  getViewManagerConfig: reactNativeNativeModules.UIManager?.getViewManagerConfig ?? jest.fn(() => null),
  hasViewManagerConfig: reactNativeNativeModules.UIManager?.hasViewManagerConfig ?? jest.fn(() => false),
  measure: reactNativeNativeModules.UIManager?.measure ?? jest.fn(),
  measureInWindow: reactNativeNativeModules.UIManager?.measureInWindow ?? jest.fn(),
  measureLayout: reactNativeNativeModules.UIManager?.measureLayout ?? jest.fn(),
  measureLayoutRelativeToParent: reactNativeNativeModules.UIManager?.measureLayoutRelativeToParent ?? jest.fn(),
  setChildren: reactNativeNativeModules.UIManager?.setChildren ?? jest.fn(),
  updateView: reactNativeNativeModules.UIManager?.updateView ?? jest.fn(),
};
Object.defineProperty(reactNativeNativeModules, "UIManager", {
  configurable: true,
  enumerable: true,
  value: reactNativeUIManager,
  writable: true,
});
globalThis.nativeModuleProxy ??= reactNativeNativeModules;
const rngestureHandlerModule = {
  ...(reactNativeNativeModules.RNGestureHandlerModule ?? {}),
  attachGestureHandler: reactNativeNativeModules.RNGestureHandlerModule?.attachGestureHandler ?? jest.fn(),
  createGestureHandler: reactNativeNativeModules.RNGestureHandlerModule?.createGestureHandler ?? jest.fn(),
  configureRelations: reactNativeNativeModules.RNGestureHandlerModule?.configureRelations ?? jest.fn(),
  dropGestureHandler: reactNativeNativeModules.RNGestureHandlerModule?.dropGestureHandler ?? jest.fn(),
  flushOperations: reactNativeNativeModules.RNGestureHandlerModule?.flushOperations ?? jest.fn(),
  install: reactNativeNativeModules.RNGestureHandlerModule?.install ?? jest.fn(),
  installUIRuntimeBindings:
    reactNativeNativeModules.RNGestureHandlerModule?.installUIRuntimeBindings ?? jest.fn(() => true),
  setGestureHandlerConfig: reactNativeNativeModules.RNGestureHandlerModule?.setGestureHandlerConfig ?? jest.fn(),
  updateGestureHandlerConfig: reactNativeNativeModules.RNGestureHandlerModule?.updateGestureHandlerConfig ?? jest.fn(),
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
    reactNativeNativeModules.KeyboardController?.getConstants ?? jest.fn(() => ({ keyboardBorderRadius: 0 })),
  preload: reactNativeNativeModules.KeyboardController?.preload ?? jest.fn(),
  removeListeners: reactNativeNativeModules.KeyboardController?.removeListeners ?? jest.fn(),
  setDefaultMode: reactNativeNativeModules.KeyboardController?.setDefaultMode ?? jest.fn(),
  setFocusTo: reactNativeNativeModules.KeyboardController?.setFocusTo ?? jest.fn((_direction: string) => undefined),
  setInputMode: reactNativeNativeModules.KeyboardController?.setInputMode ?? jest.fn((_mode: number) => undefined),
  viewPositionInWindow: reactNativeNativeModules.KeyboardController?.viewPositionInWindow ?? jest.fn(async () => ({})),
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
  if (name === "UIManager") return reactNativeUIManager;
  return previousTurboModuleProxy?.(name) ?? null;
};

mockReactNativeModule("react-native/Libraries/BatchedBridge/NativeModules", () => ({
  __esModule: true,
  default: reactNativeNativeModules,
}));
mockReactNativeModule("react-native/Libraries/Core/InitializeCore", () => ({}));
mockReactNativeModule("react-native/Libraries/Core/NativeExceptionsManager", () => withDefaultExport({}));
mockReactNativeModule("react-native/Libraries/NativeComponent/NativeComponentRegistry", () => ({
  get: jest.fn((name: string) => createNativeComponent(name)),
  getWithFallback_DEPRECATED: jest.fn((name: string) => createNativeComponent(name)),
  setRuntimeConfigProvider: jest.fn(),
}));
const rendererImplementationPath = projectRequire.resolve("react-native/Libraries/ReactNative/RendererImplementation");

const mockRendererProxy = () => ({
  ...require(`actual:${rendererImplementationPath}`),
  findNodeHandle: jest.fn(() => 1),
});
mockReactNativeModule("react-native/Libraries/ReactNative/RendererProxy", mockRendererProxy);
mockReactNativeModule("react-native/Libraries/ReactNative/RendererProxy.js", mockRendererProxy);
mockReactNativeModule("react-native/Libraries/ReactNative/requireNativeComponent", () =>
  withDefaultExport((name: string) => createNativeComponent(name)),
);
mockReactNativeModule("react-native/Libraries/ReactNative/UIManager", () => withDefaultExport(reactNativeUIManager));
mockReactNativeModule("react-native/Libraries/Components/View/ViewNativeComponent", () => ({
  ...withDefaultExport(createNativeComponent("View")),
  Commands: {
    blur: jest.fn(),
    focus: jest.fn(),
    hotspotUpdate: jest.fn(),
    setPressed: jest.fn(),
  },
}));
mockReactNativeModule("react-native/Libraries/Text/Text", () =>
  withDefaultExport(createComponentMock("react-native/Libraries/Text/Text", nativeMethods)),
);
mockReactNativeModule("react-native/Libraries/Components/View/View", () =>
  withDefaultExport(createComponentMock("react-native/Libraries/Components/View/View", nativeMethods)),
);
mockReactNativeModule("react-native/Libraries/AppState/AppState", () => withDefaultExport(createAppStateMock()));
mockReactNativeModule("react-native/Libraries/Components/AccessibilityInfo/AccessibilityInfo", () =>
  withDefaultExport(createAccessibilityInfoMock()),
);
mockReactNativeModule("react-native/Libraries/Components/ActivityIndicator/ActivityIndicator", () =>
  withDefaultExport(createComponentMock("react-native/Libraries/Components/ActivityIndicator/ActivityIndicator", null)),
);
mockReactNativeModule("react-native/Libraries/Components/Clipboard/Clipboard", () =>
  withDefaultExport(createClipboardMock()),
);
mockReactNativeModule("react-native/Libraries/Components/RefreshControl/RefreshControl", () =>
  withDefaultExport(createRefreshControlMock()),
);
mockReactNativeModule("react-native/Libraries/Components/ScrollView/ScrollView", () =>
  withDefaultExport(createScrollViewMock()),
);
mockReactNativeModule("react-native/Libraries/Components/TextInput/TextInput", () =>
  withDefaultExport(
    createComponentMock("react-native/Libraries/Components/TextInput/TextInput", {
      ...nativeMethods,
      clear: jest.fn(),
      getNativeRef: jest.fn(),
      isFocused: jest.fn(),
    }),
  ),
);
mockReactNativeModule("react-native/Libraries/Image/Image", () =>
  withDefaultExport(createComponentMock("react-native/Libraries/Image/Image", null)),
);
mockReactNativeModule("react-native/Libraries/Linking/Linking", () => withDefaultExport(createLinkingMock()));
mockReactNativeModule("react-native/Libraries/Modal/Modal", () => withDefaultExport(createModalMock()));
mockReactNativeModule("react-native/Libraries/Utilities/useColorScheme", () =>
  withDefaultExport(jest.fn(() => "light")),
);
mockReactNativeModule("react-native/Libraries/Vibration/Vibration", () => withDefaultExport(createVibrationMock()));
