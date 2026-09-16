globalThis.__DEV__ = false;

const reactNative = require("react-native");
const module = reactNative.TurboModuleRegistry.getEnforcing("RNGestureHandlerModule");

export default typeof module.createGestureHandler;
