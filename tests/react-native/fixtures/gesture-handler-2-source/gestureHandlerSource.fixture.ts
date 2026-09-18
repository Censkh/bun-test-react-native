import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import { hasCjsDynamicExport } from "../../../../src/plugin";

describe("CommonJS dynamic export detection on react-native-gesture-handler 2", () => {
  test("does not treat react-native-gesture-handler literal getter exports as dynamic", () => {
    const gestureHandlerIndexPath = require.resolve("react-native-gesture-handler/lib/commonjs/index.js");
    const source = fs.readFileSync(gestureHandlerIndexPath, "utf8");

    expect(source).toContain('Object.defineProperty(exports, "GestureHandlerRootView"');
    expect(hasCjsDynamicExport(source)).toBe(false);
  });
});
