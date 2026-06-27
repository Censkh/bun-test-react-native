import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { reactNativePlatformResolverPlugin, transpile } from "../src/plugin";

const testRoots: string[] = [];

const createTestRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bun-rn-flow-"));
  testRoots.push(root);
  return root;
};

const writeFile = (root: string, relativePath: string, contents = "") => {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
  return filePath;
};

afterEach(() => {
  for (const root of testRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("Flow stripping", () => {
  test("strips Flow syntax from source text", () => {
    expect(
      transpile({
        filePath: "unknown.js",
        source: `
        // @flow
        import type { Node } from "react";
        type Props = { value: number };
        export const value = (props: Props): number => props.value;
      `,
      }),
    ).not.toContain("Props");
  });

  test("strips React Native Flow component syntax", () => {
    const output = transpile({
      filePath: "unknown.js",
      source: `
      // @flow
      import * as React from "react";

      component View(
        ref?: React.RefSetter<HTMLElement>,
        ...props: { children?: React.Node }
      ) {
        return <div {...props} ref={ref} />;
      }
    `,
    });

    expect(output).toMatch(/(?:const View = React\.forwardRef|function View)/);
    expect(output).toMatch(/(?:return <div|return (?:\/\*#__PURE__\*\/ )?_jsx\("div")/);
    expect(output).toContain('import * as React from "react"');
    expect(output).not.toContain("component View");
  });

  test("preserves named react-native imports while stripping Flow", () => {
    const output = transpile({
      filePath: "unknown.js",
      source: `
      // @flow
      import { TurboModuleRegistry } from "react-native";

      export default TurboModuleRegistry.getEnforcing("ExampleModule");
    `,
    });

    expect(output).toContain('import { TurboModuleRegistry } from "react-native"');
    expect(output).toContain('TurboModuleRegistry.getEnforcing("ExampleModule")');
    expect(output).not.toContain("// @flow");
  });

  test("lets Bun build Flow-typed JavaScript from react-native package files", async () => {
    const root = createTestRoot();
    const entry = writeFile(
      root,
      "src/App.js",
      `
        import { double } from "react-native/Libraries/math";
        export default double(2);
      `,
    );
    writeFile(root, "node_modules/react-native/package.json", JSON.stringify({ main: "./index" }));
    writeFile(
      root,
      "node_modules/react-native/Libraries/math.ios.js",
      `
        // @flow
        type Value = number;
        export function double(value: Value): Value {
          return value * 2;
        }
      `,
    );

    const buildConfig = {
      entrypoints: [entry],
      plugins: [reactNativePlatformResolverPlugin],
      write: false,
    };

    const result = await Bun.build(buildConfig);

    expect(result.success).toBe(true);
    const output = await result.outputs[0].text();
    expect(output).toContain("return value * 2");
    expect(output).not.toContain(": Value");
  });

  test("lets Bun handle JavaScript files without a Flow pragma", async () => {
    const root = createTestRoot();
    const entry = writeFile(
      root,
      "src/App.js",
      `
        import { double } from "./math";
        export default double(2);
      `,
    );
    writeFile(
      root,
      "src/math.ios.js",
      `
        type Value = number;
        export function double(value: Value): Value {
          return value * 2;
        }
      `,
    );

    const buildConfig = {
      entrypoints: [entry],
      plugins: [reactNativePlatformResolverPlugin],
      write: false,
    };

    let buildError: unknown;
    try {
      await Bun.build(buildConfig);
    } catch (error) {
      buildError = error;
    }

    expect(buildError).toBeDefined();
  });
});
