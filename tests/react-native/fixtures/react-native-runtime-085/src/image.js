globalThis.__DEV__ = false;

const reactNative = require("react-native");
const Image = reactNative.Image;

if (!Image) {
  throw new Error("missing Image export");
}

export default typeof Image.prefetch;
