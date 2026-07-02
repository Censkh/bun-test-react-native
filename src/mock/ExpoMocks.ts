import { jest, mock } from "bun:test";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { getExponentConstantsNativeModule } from "./ExpoConstantsMocks";
import {
  getExpoFileSystemNativeModule,
  getExponentFileSystemNativeModule,
  installExpoFileSystemModuleMocks,
} from "./ExpoFileSystemMocks";
import { getImageLoaderNativeModule } from "./ExpoImageMocks";
import { getExpoMediaLibraryNativeModule, getExpoMediaLibraryNextNativeModule } from "./ExpoMediaLibraryMocks";
import { createExpoUIViewMock, getExpoUINativeModule } from "./ExpoUIMocks";
import { reactNativeNativeModules } from "./ReactNativeMocks";

const require = createRequire(import.meta.url);
const mockNativeModules = reactNativeNativeModules;
process.env.EXPO_OS ??= "ios";
let actualExpoModulesCore: any;
const getActualExpoModulesCore = () => {
  if (!actualExpoModulesCore) {
    require("actual:expo-modules-core/src/polyfill/dangerous-internal").installExpoGlobalPolyfill();
    actualExpoModulesCore = require("actual:expo-modules-core");
  }
  return actualExpoModulesCore;
};

const createNativeViewMock = (displayName: string) => {
  const React = require("react");
  const component = ({ children, ...props }) => React.createElement(displayName, props, children);
  Object.defineProperty(component, "displayName", {
    configurable: true,
    value: displayName,
  });
  return component;
};

const mockImageLoader = {
  configurable: true,
  enumerable: true,
  get: () => getImageLoaderNativeModule(),
};

Object.defineProperty(mockNativeModules, "ImageLoader", mockImageLoader);
Object.defineProperty(mockNativeModules, "ImageViewManager", mockImageLoader);

Object.defineProperty(mockNativeModules, "LinkingManager", {
  configurable: true,
  enumerable: true,
  get: () => mockNativeModules.Linking,
});

Object.defineProperty(mockNativeModules, "ExponentConstants", {
  configurable: true,
  enumerable: true,
  get: () => getExponentConstantsNativeModule(),
});

Object.defineProperty(mockNativeModules, "ExpoUI", {
  configurable: true,
  enumerable: true,
  get: () => getExpoUINativeModule(),
});

Object.defineProperty(mockNativeModules, "FileSystem", {
  configurable: true,
  enumerable: true,
  get: () => getExpoFileSystemNativeModule(),
});

Object.defineProperty(mockNativeModules, "ExponentFileSystem", {
  configurable: true,
  enumerable: true,
  get: () => getExponentFileSystemNativeModule(),
});

Object.defineProperty(mockNativeModules, "ExpoMediaLibraryNext", {
  configurable: true,
  enumerable: true,
  get: () => getExpoMediaLibraryNextNativeModule(),
});

Object.defineProperty(mockNativeModules, "ExpoMediaLibrary", {
  configurable: true,
  enumerable: true,
  get: () => getExpoMediaLibraryNativeModule(),
});

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const mergeExpoModuleDefinitions = (target: Record<string, unknown>, source: Record<string, unknown>) => {
  for (const [key, value] of Object.entries(source)) {
    const existing = target[key];
    target[key] =
      isPlainObject(existing) && isPlainObject(value) ? mergeExpoModuleDefinitions({ ...existing }, value) : value;
  }
  return target;
};

let expoModules: Record<string, unknown> | undefined;
const getExpoModules = () => {
  expoModules ??= mergeExpoModuleDefinitions(
    mergeExpoModuleDefinitions(
      require("jest-expo/src/preset/moduleMocks/expoModules"),
      require("jest-expo/src/preset/moduleMocks/thirdPartyModules"),
    ),
    require("jest-expo/src/preset/moduleMocks/internalExpoModules"),
  );
  return expoModules;
};

const mockProperty = (property, customMock) => {
  if (customMock !== undefined) return customMock;
  if (property.type === "function") {
    return property.functionType === "promise" ? jest.fn(() => Promise.resolve()) : jest.fn();
  }
  if (property.type === "number") return 1;
  if (property.type === "string") return "mock";
  if (property.type === "array") return [];
  if (property.type === "mock") return mockByMockDefinition(property.mockDefinition);
  return property.mock ?? {};
};

const mockProperties = (moduleProperties, customMocks = {}) => {
  const mockedProperties = {};
  for (const propertyName of Object.keys(moduleProperties)) {
    const property = moduleProperties[propertyName];
    const customMock =
      customMocks && Object.hasOwn(customMocks, propertyName) ? customMocks[propertyName] : property.mock;
    mockedProperties[propertyName] = mockProperty(property, customMock);
  }
  return mockedProperties;
};

function mockByMockDefinition(definition) {
  const mock = {};
  for (const key of Object.keys(definition)) {
    mock[key] = mockProperties(definition[key]);
  }
  return mock;
}

const expoModuleMockCache = new Map<string, unknown>();

const getExpoModuleMock = (moduleName: string) => {
  if (expoModuleMockCache.has(moduleName)) return expoModuleMockCache.get(moduleName);
  const moduleDefinition = getExpoModules()[moduleName];
  if (!moduleDefinition) return undefined;
  const mockedProperties = mockProperties(moduleDefinition);
  expoModuleMockCache.set(moduleName, mockedProperties);
  return mockedProperties;
};

Object.defineProperty(mockNativeModules, "NativeUnimoduleProxy", {
  configurable: true,
  enumerable: true,
  get: () => getExpoModuleMock("NativeUnimoduleProxy"),
});

Object.keys(mockNativeModules.NativeUnimoduleProxy?.viewManagersMetadata ?? {}).forEach((viewManagerName) => {
  Object.defineProperty(mockNativeModules.UIManager, `ViewManagerAdapter_${viewManagerName}`, {
    get: () => ({
      NativeProps: {},
      directEventTypes: [],
    }),
  });
});

mock.module("expo/src/async-require/messageSocket", () => ({}));
mock.module("expo/src/async-require/messageSocket.native", () => ({}));
mock.module("expo/src/async-require/setupHMR", () => {
  try {
    require("expo/src/async-require/hmr").default.setup("ios", "index.bundle", "localhost", 8081, true);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("Cannot initialize hmrClient twice")) {
      throw error;
    }
  }
  return {};
});

mock.module("@react-native/assets-registry/registry", () => ({
  getAssetByID: jest.fn(() => ({
    exists: true,
    fileHashes: ["md5"],
    fileSystemLocation: "/full/path/to/directory",
    hash: "md5",
    height: 1,
    httpServerLocation: "/assets/full/path/to/directory",
    name: "name",
    scales: [1],
    type: "type",
    uri: "uri",
    width: 1,
  })),
  registerAsset: jest.fn(() => 1),
}));

mock.module("react-native/Libraries/BatchedBridge/NativeModules", () => ({
  __esModule: true,
  default: mockNativeModules,
}));

mock.module("react-native/Libraries/LogBox/LogBox", () => {
  const LogBox = {
    ignoreAllLogs: jest.fn(),
    ignoreLogs: jest.fn(),
    install: jest.fn(),
    uninstall: jest.fn(),
  };
  return {
    ...LogBox,
    default: LogBox,
  };
});

const lookupCache = new Map<string, unknown>();

const getStackFileNames = () =>
  (new Error().stack ?? "")
    .split("\n")
    .map((line) => line.match(/\((.*):\d+:\d+\)$/)?.[1] ?? line.match(/at (.*):\d+:\d+$/)?.[1])
    .filter((fileName): fileName is string => Boolean(fileName));

const attemptLookup = (moduleName) => {
  if (lookupCache.has(moduleName)) return lookupCache.get(moduleName);

  const fileName = getStackFileNames().find((stackFileName) => {
    if (stackFileName.includes(moduleName)) return true;
    if (!fs.existsSync(stackFileName)) return false;
    const fileContents = fs.readFileSync(stackFileName, "utf8");
    const regexPattern = new RegExp(
      `require(?:Optional)?NativeModule\\s*(?:<${moduleName}Module>)?\\s*\\(['"]${moduleName}['"]\\)`,
    );
    return regexPattern.test(fileContents);
  });
  if (!fileName) {
    lookupCache.set(moduleName, null);
    return null;
  }

  let modulePath = null;
  for (let dir = fileName; path.dirname(dir) !== dir; dir = path.dirname(dir)) {
    const packageJsonPath = path.resolve(dir, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      modulePath = packageJsonPath;
      break;
    }
  }
  if (!modulePath) return null;

  const moduleMockPath = path.join(modulePath, "..", "mocks", moduleName);
  try {
    const mockModule = require(moduleMockPath);
    lookupCache.set(moduleName, mockModule);
    return mockModule;
  } catch {
    for (const extension of [".ts", ".js", ".tsx", ".jsx"]) {
      try {
        const mockModule = require(`${moduleMockPath}${extension}`);
        lookupCache.set(moduleName, mockModule);
        return mockModule;
      } catch {}
    }
  }
  lookupCache.set(moduleName, null);
  return null;
};

const createExpoModulesCoreMock = () => {
  const ExpoModulesCore = getActualExpoModulesCore();
  const actualRequireOptionalNativeModule = ExpoModulesCore.requireOptionalNativeModule?.bind(ExpoModulesCore);
  const actualRequireNativeViewManager = ExpoModulesCore.requireNativeViewManager?.bind(ExpoModulesCore);
  const {
    EventEmitter = class EventEmitter {},
    NativeModule = class NativeModule {},
    SharedObject = class SharedObject {},
    SharedRef = class SharedRef {},
  } = globalThis.expo ?? {};
  const { NativeModulesProxy = {} } = ExpoModulesCore;

  for (const moduleName of Object.keys(NativeModulesProxy)) {
    const nativeModule = NativeModulesProxy[moduleName];
    for (const propertyName of Object.keys(nativeModule)) {
      if (typeof nativeModule[propertyName] === "function") {
        nativeModule[propertyName] = jest.fn(async () => {});
      }
    }
  }

  const requireMockModule = (name) => {
    const nativeModuleMock =
      attemptLookup(name) ??
      mockNativeModules[name] ??
      getExpoModuleMock(name) ??
      mockNativeModules.NativeUnimoduleProxy?.modulesConstants?.[name] ??
      actualRequireOptionalNativeModule?.(name);
    if (!nativeModuleMock) return null;

    const nativeModule = new NativeModule();
    for (const [key, value] of Object.entries(nativeModuleMock)) {
      if (typeof value === "function") {
        const isClass = Object.getOwnPropertyNames(value.prototype ?? {}).length > 1;
        nativeModule[key] = isClass ? value : jest.fn(value as (...args: any[]) => any);
      } else {
        nativeModule[key] = value;
      }
    }
    return nativeModule;
  };

  class CodedError extends Error {
    code: string;

    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  }

  class UnavailabilityError extends CodedError {
    constructor(moduleName: string, propertyName: string) {
      super("ERR_UNAVAILABLE", `${moduleName}.${propertyName} is unavailable`);
    }
  }

  const Platform = {
    OS: "ios",
    select: (specifics) => specifics.ios ?? specifics.native ?? specifics.default,
  };

  return {
    __esModule: true,
    ...ExpoModulesCore,
    CodedError,
    EventEmitter,
    LegacyEventEmitter: EventEmitter,
    NativeModule,
    NativeModulesProxy,
    PermissionStatus: {
      DENIED: "denied",
      GRANTED: "granted",
      UNDETERMINED: "undetermined",
    },
    Platform,
    SharedObject,
    SharedRef,
    UnavailabilityError,
    createPermissionHook: () => () => [null, jest.fn()],
    createSnapshotFriendlyRef: () => {
      const ref = { current: null };
      Object.defineProperty(ref, "toJSON", {
        value: () => "[React.ref]",
      });
      return ref;
    },
    installOnUIRuntime: jest.fn(),
    registerWebModule: jest.fn(),
    reloadAppAsync: jest.fn(() => Promise.resolve()),
    requireNativeModule(moduleName) {
      const module = requireMockModule(moduleName);
      if (!module) throw new Error(`Cannot find native module '${moduleName}'`);
      return module;
    },
    requireNativeViewManager: (name, viewName) => {
      const nativeModuleMock = attemptLookup(name);
      if (!nativeModuleMock?.View) {
        if (name === "ExpoUI") {
          return createExpoUIViewMock(viewName ?? name);
        }
        try {
          return actualRequireNativeViewManager?.(name, viewName) ?? createNativeViewMock(viewName ?? name);
        } catch {
          return createNativeViewMock(viewName ?? name);
        }
      }
      return nativeModuleMock.View;
    },
    requireOptionalNativeModule: requireMockModule,
    useReleasingSharedObject: (factory, deps) => require("react").useMemo(factory, deps),
    uuid: ExpoModulesCore.uuid ?? {
      v4: jest.fn(() => "00000000-0000-4000-8000-000000000000"),
    },
  };
};

let expoModulesCoreMock: any;
const getExpoModulesCoreMock = () => (expoModulesCoreMock ??= createExpoModulesCoreMock());

mock.module("expo-modules-core", () => getExpoModulesCoreMock());

mock.module("expo", () => {
  const Expo = require("actual:expo");
  const ExpoModulesCore = getExpoModulesCoreMock();
  return {
    __esModule: true,
    ...Expo,
    EventEmitter: ExpoModulesCore.EventEmitter,
    NativeModule: ExpoModulesCore.NativeModule,
    SharedObject: ExpoModulesCore.SharedObject,
    SharedRef: ExpoModulesCore.SharedRef,
    installOnUIRuntime: ExpoModulesCore.installOnUIRuntime,
    registerWebModule: ExpoModulesCore.registerWebModule,
    reloadAppAsync: ExpoModulesCore.reloadAppAsync,
    requireNativeModule: ExpoModulesCore.requireNativeModule,
    requireNativeView: ExpoModulesCore.requireNativeViewManager,
    requireNativeViewManager: ExpoModulesCore.requireNativeViewManager,
    requireOptionalNativeModule: ExpoModulesCore.requireOptionalNativeModule,
  };
});

installExpoFileSystemModuleMocks();
