import { mock } from "bun:test";
import { projectRequire } from "../ProjectRequire";

// Newer react-native-worklets releases throw from their web implementations (e.g. `createShareable`),
// which reanimated reaches while loading its own mock. Layer the package's official mock over the real
// exports, so mocked functions stop throwing while anything the mock lacks keeps its real implementation.
const installWorkletsMocks = () => {
  let workletsPath: string;
  let workletsMockPath: string;
  try {
    workletsPath = projectRequire.resolve("react-native-worklets");
    workletsMockPath = projectRequire.resolve("react-native-worklets/lib/module/mock");
  } catch {
    return;
  }

  mock.module(workletsPath, () => ({
    ...require(`actual:${workletsPath}`),
    ...require(`actual:${workletsMockPath}`),
  }));
};

installWorkletsMocks();
