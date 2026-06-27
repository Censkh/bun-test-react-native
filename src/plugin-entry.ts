import { plugin } from "bun";
import { reactNativePlatformResolverPlugin } from "./plugin";

export * from "./plugin";

if ((globalThis as { BLOCK_BTRN_INSTALL?: boolean }).BLOCK_BTRN_INSTALL) {
  throw new Error("bun-test-react-native/plugin was imported while BLOCK_BTRN_INSTALL is true");
}

plugin(reactNativePlatformResolverPlugin);
