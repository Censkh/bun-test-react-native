require("./mock/UndiciMocks");
const nativeModules = require("./mock/NativeModules").default as Record<string, unknown>;
const testGlobal = globalThis as typeof globalThis & {
  nativeModuleProxy?: Record<string, unknown>;
  __turboModuleProxy?: (name: string) => unknown;
};
testGlobal.nativeModuleProxy = nativeModules;
testGlobal.__turboModuleProxy = (name: string) => nativeModules[name] ?? null;
require("./plugin-entry");
require("bun-jest-require-actual/setup");

process.env.EXPO_PUBLIC_USE_RN_FETCH ??= "true";
require("./mock/ReactNativeMocks");
require("./mock/ReanimatedMocks");
require("./mock/ExpoWinterMocks");
require("./mock/ExpoMocks");
require("./mock/FirebaseMocks");
require("./mock/CommunityMocks");
