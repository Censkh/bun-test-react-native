import { projectRequire } from "./ProjectRequire";

const warnWhenExpoJestDefinitionsAreMissing = () => {
  try {
    projectRequire.resolve("expo/package.json");
  } catch {
    return;
  }

  try {
    projectRequire.resolve("jest-expo/package.json");
  } catch {
    console.warn(
      "[bun-test-react-native] Expo is installed but jest-expo is not. Install jest-expo at the matching Expo SDK version to provide native-module definitions.",
    );
  }
};

warnWhenExpoJestDefinitionsAreMissing();

require("./mock/MiniflareWorkerdPatch");
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
