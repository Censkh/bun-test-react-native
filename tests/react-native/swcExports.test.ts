import { afterEach, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { transpile } from "../../src/transpile";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

test("preserves SWC getter exports and nested star exports without treating dead hints as assignments", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "swc-exports-"));
  roots.push(root);
  const leaf = path.join(root, "leaf.js");
  fs.writeFileSync(
    leaf,
    `
    Object.defineProperty(exports, "__esModule", { value: true });
    0 && (module.exports = { read: null, default: null });
    function _export(target, definitions) {
      for (const name in definitions) Object.defineProperty(target, name, {
        enumerable: true, get: Object.getOwnPropertyDescriptor(definitions, name).get,
      });
    }
    _export(exports, { get read() { return () => 42; }, get default() { return "default-value"; } });
  `,
  );
  const contextPath = path.join(root, "context.mjs");
  fs.writeFileSync(
    contextPath,
    transpile({
      filePath: contextPath,
      source: `
    const ExampleContext = { $$typeof: Symbol.for("react.context"), value: 17 };
    Object.defineProperty(exports, "ExampleContext", { get() { return ExampleContext; } });
  `,
    }),
  );
  const index = path.join(root, "index.mjs");
  fs.writeFileSync(
    index,
    transpile({
      filePath: index,
      source: `
    Object.defineProperty(exports, "__esModule", { value: true });
    const wrapped = identity(_export_star(require("./leaf.js"), exports));
    Object.defineProperty(exports, "default", { get() { return wrapped.default; } });
    function identity(value) { return value; }
    function _export_star(from, to) {
      for (const name of Object.keys(from)) {
        if (name !== "default" && name !== "__esModule") Object.defineProperty(to, name, {
          enumerable: true, get() { return from[name]; },
        });
      }
      return from;
    }
  `,
    }),
  );
  const transformedLeaf = path.join(root, "leaf.mjs");
  fs.writeFileSync(transformedLeaf, transpile({ filePath: transformedLeaf, source: fs.readFileSync(leaf, "utf8") }));
  const result = await import(pathToFileURL(index).href);
  expect(result.read()).toBe(42);
  expect(result.default).toBe("default-value");
  const leafResult = await import(pathToFileURL(transformedLeaf).href);
  expect(leafResult.read()).toBe(42);
  expect(leafResult.default).toBe("default-value");
  const { ExampleContext } = await import(pathToFileURL(contextPath).href);
  expect(typeof ExampleContext).toBe("object");
  expect(ExampleContext.$$typeof).toBe(Symbol.for("react.context"));
});
