require("./mock/UndiciMocks");
require("./plugin-entry");
require("bun-jest-require-actual/setup");

process.env.EXPO_PUBLIC_USE_RN_FETCH ??= "true";
require("./mock/ReactNativeMocks");
require("./mock/ReanimatedMocks");
require("./mock/ExpoWinterMocks");
require("./mock/ExpoMocks");
require("./mock/FirebaseMocks");
require("./mock/CommunityMocks");
