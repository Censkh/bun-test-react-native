import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { hasExtensionlessPlatformSpecifier, rewriteExtensionlessPlatformSpecifiers, transpile } from "../src/plugin";


describe("react-native-screens transpile", () => {
  test("rewrites extensionless CJS requires to platform files", () => {
    const packageRoot = path.dirname(require.resolve("react-native-screens/package.json"));
    const hostIndexPath = path.join(packageRoot, "lib/commonjs/components/tabs/host/index.js");
    const source = fs.readFileSync(hostIndexPath, "utf8");
    const transpiled = transpile({ source, filePath: hostIndexPath });

    expect(hasExtensionlessPlatformSpecifier(transpiled)).toBe(false);

    const rewritten = rewriteExtensionlessPlatformSpecifiers(transpiled, hostIndexPath, {
      platform: "ios",
      projectRoot: path.dirname(packageRoot),
    });

    expect(rewritten).toContain('require("./TabsHost.ios.js")');
    expect(rewritten).not.toContain('require("./TabsHost")');
    expect(rewritten).toMatch(/__lazyExport\(\s*\(\)\s*=>\s*module\.exports\.TabsHost,\s*true\s*\)/);
    expect(rewritten).toContain("as TabsHost");
  });

  test("transpiles platform implementation without changing react-native member access", () => {
    const tabsHostPath = require.resolve("react-native-screens/lib/commonjs/components/tabs/host/TabsHost.ios.js");
    const source = fs.readFileSync(tabsHostPath, "utf8");
    const output = transpile({ source, filePath: tabsHostPath });

    expect(output).toContain("exports.default = TabsHost");
    expect(output).toContain("export default module.exports.default");
    expect(output).toContain("_reactNative.StyleSheet.create");
    expect(output).not.toContain("import type");
    expect(output).not.toContain("@flow");
  });
});
