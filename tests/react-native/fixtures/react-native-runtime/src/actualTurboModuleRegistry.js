const TurboModuleRegistry = require("actual:react-native/Libraries/TurboModule/TurboModuleRegistry");

const appStateModule = TurboModuleRegistry.getEnforcing("AppState");
const linkingManagerModule = TurboModuleRegistry.get("LinkingManager");

export const appState = appStateModule.getConstants().initialAppState;
export const linkingManager = typeof linkingManagerModule?.openURL;
