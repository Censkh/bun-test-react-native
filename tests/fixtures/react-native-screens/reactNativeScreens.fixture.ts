import { describe, expect, test } from "bun:test";

describe("react-native-screens platform resolution", () => {
  test("loads platform-specific CJS internals without a module mock", () => {
    const { TabsHost } = require("react-native-screens/lib/commonjs/components/tabs/host");

    expect(typeof TabsHost).toBe("function");
    expect(TabsHost.$$typeof).toBe(Symbol.for("react.forward_ref"));
    expect(typeof TabsHost.render).toBe("function");
  });
});
