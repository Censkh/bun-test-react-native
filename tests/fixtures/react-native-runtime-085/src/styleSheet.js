globalThis.__DEV__ = false;

const reactNative = require("react-native");
const styles = reactNative.StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default styles.container.flex;
