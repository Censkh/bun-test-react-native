import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { render } from "@testing-library/react";
import { Window } from "happy-dom";
import React from "react";
import { transpile } from "../src/plugin";

const require = createRequire(import.meta.url);
const testRoots: string[] = [];

const createTestRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bun-rn-lazy-export-"));
  testRoots.push(root);
  return root;
};

afterEach(() => {
  for (const root of testRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("lazy CommonJS getter export runtime shape", () => {
  test("keeps lowercase getter exports lazy with function-target proxies", async () => {
    const root = createTestRoot();
    const valuesPath = path.join(root, "values.cjs");
    const indexPath = path.join(root, "index.mjs");

    fs.writeFileSync(
      valuesPath,
      `
        const React = require(${JSON.stringify(require.resolve("react"))});

        exports.callable = function callable(value) {
          return value + 1;
        };
        exports.plainObject = { nested: { value: 2 } };
        exports.arrayValue = [1, 2, 3];
        exports.mapValue = new Map([["value", 4]]);
        exports.dateValue = new Date("2024-01-02T03:04:05.000Z");
        exports.reactElement = React.createElement("div", { testID: "example" });
      `,
    );

    const transformed = transpile({
      filePath: indexPath,
      source: `
        Object.defineProperty(exports, "callable", {
          enumerable: true,
          get: function () {
            return require("./values.cjs").callable;
          },
        });
        Object.defineProperty(exports, "plainObject", {
          enumerable: true,
          get: function () {
            return require("./values.cjs").plainObject;
          },
        });
        Object.defineProperty(exports, "arrayValue", {
          enumerable: true,
          get: function () {
            return require("./values.cjs").arrayValue;
          },
        });
        Object.defineProperty(exports, "mapValue", {
          enumerable: true,
          get: function () {
            return require("./values.cjs").mapValue;
          },
        });
        Object.defineProperty(exports, "dateValue", {
          enumerable: true,
          get: function () {
            return require("./values.cjs").dateValue;
          },
        });
        Object.defineProperty(exports, "reactElement", {
            enumerable: true,
            get: function () {
              return require("./values.cjs").reactElement;
            },
        });
      `,
    });
    fs.writeFileSync(indexPath, transformed);

    const module = await import(`${pathToFileURL(indexPath).href}?${Date.now()}`);

    expect(typeof module.callable).toBe("function");
    expect(module.callable(1)).toBe(2);
    expect(typeof module.plainObject).toBe("function");
    expect(module.plainObject.nested.value).toBe(2);
    expect(Array.isArray(module.arrayValue)).toBe(false);
    expect(module.arrayValue.length).toBe(3);
    expect(module.mapValue instanceof Map).toBe(false);
    expect(module.mapValue.get("value")).toBe(4);
    expect(module.dateValue instanceof Date).toBe(false);
    expect(module.dateValue.toISOString()).toBe("2024-01-02T03:04:05.000Z");
    expect(typeof module.reactElement).toBe("function");
    expect(module.reactElement.$$typeof).toBeDefined();
    expect(module.reactElement.props.testID).toBe("example");
  });

  test("uses function-target proxies for uppercase getter exports so React can render them", async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const window = new Window();
    Object.assign(window, {
      Error,
      SyntaxError,
      TypeError,
    });
    Object.assign(globalThis, {
      document: window.document,
      HTMLElement: window.HTMLElement,
      Node: window.Node,
      window,
    });

    const root = createTestRoot();
    const valuesPath = path.join(root, "values.cjs");
    const indexPath = path.join(root, "index.mjs");

    fs.writeFileSync(
      valuesPath,
      `
        const React = require(${JSON.stringify(require.resolve("react"))});

        exports.FunctionComponent = function FunctionComponent(props) {
          return React.createElement("div", { ...props });
        };
        exports.ClassComponent = class ClassComponent extends React.Component {
          render() {
            return React.createElement("div", { ...this.props });
          }
        };
        exports.UppercaseComponent = React.forwardRef(function UppercaseComponent(props, ref) {
          return React.createElement("div", { ...props, ref });
        });
      `,
    );

    const transformed = transpile({
      filePath: indexPath,
      source: `
        Object.defineProperty(exports, "UppercaseComponent", {
          enumerable: true,
          get: function () {
            return require("./values.cjs").UppercaseComponent;
          },
        });
        Object.defineProperty(exports, "FunctionComponent", {
          enumerable: true,
          get: function () {
            return require("./values.cjs").FunctionComponent;
          },
        });
        Object.defineProperty(exports, "ClassComponent", {
          enumerable: true,
          get: function () {
            return require("./values.cjs").ClassComponent;
          },
        });
      `,
    });
    fs.writeFileSync(indexPath, transformed);

    const module = await import(`${pathToFileURL(indexPath).href}?${Date.now()}`);

    expect(typeof module.UppercaseComponent).toBe("function");
    expect(module.UppercaseComponent.$$typeof).toBeDefined();
    expect(typeof module.FunctionComponent).toBe("function");
    expect(module.FunctionComponent.$$typeof).toBe(Symbol.for("react.forward_ref"));
    expect(typeof module.ClassComponent).toBe("function");
    expect(module.ClassComponent.prototype?.isReactComponent).toBeDefined();

    const screen = render(
      React.createElement(React.Fragment, null, [
        React.createElement(module.UppercaseComponent, {
          "data-testid": "lazy-uppercase-component",
          key: "forward-ref",
        }),
        React.createElement(module.FunctionComponent, {
          "data-testid": "lazy-function-component",
          key: "function",
        }),
        React.createElement(module.ClassComponent, {
          "data-testid": "lazy-class-component",
          key: "class",
        }),
      ]),
    );

    expect(screen.getByTestId("lazy-uppercase-component").tagName).toBe("DIV");
    expect(screen.getByTestId("lazy-function-component").tagName).toBe("DIV");
    expect(screen.getByTestId("lazy-class-component").tagName).toBe("DIV");
  });

  test("renders React.memo uppercase getter exports through function-target proxies", async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const window = new Window();
    Object.assign(window, {
      Error,
      SyntaxError,
      TypeError,
    });
    Object.assign(globalThis, {
      document: window.document,
      HTMLElement: window.HTMLElement,
      Node: window.Node,
      window,
    });

    const root = createTestRoot();
    const valuesPath = path.join(root, "values.cjs");
    const indexPath = path.join(root, "index.mjs");

    fs.writeFileSync(
      valuesPath,
      `
        const React = require(${JSON.stringify(require.resolve("react"))});

        exports.MemoComponent = React.memo(function MemoComponent(props) {
          return React.createElement("div", { ...props });
        });
      `,
    );

    const transformed = transpile({
      filePath: indexPath,
      source: `
        Object.defineProperty(exports, "MemoComponent", {
          enumerable: true,
          get: function () {
            return require("./values.cjs").MemoComponent;
          },
        });
      `,
    });
    fs.writeFileSync(indexPath, transformed);

    const module = await import(`${pathToFileURL(indexPath).href}?${Date.now()}`);

    expect(typeof module.MemoComponent).toBe("function");
    expect(module.MemoComponent.$$typeof).toBe(Symbol.for("react.memo"));
    const screen = render(React.createElement(module.MemoComponent, { "data-testid": "lazy-memo-component" }));

    expect(screen.getByTestId("lazy-memo-component").tagName).toBe("DIV");
  });
});
