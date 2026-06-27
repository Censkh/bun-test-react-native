import { mock } from "bun:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const formDataModule = {
  installFormDataPatch: <T extends typeof FormData>(formData: T): T => formData,
};
const urlModule = {
  URL: globalThis.URL,
  URLSearchParams: globalThis.URLSearchParams,
};

mock.module("expo/src/winter/FormData", () => formDataModule);
mock.module(require.resolve("expo/src/winter/FormData"), () => formDataModule);
mock.module("expo/src/winter/url", () => urlModule);
mock.module(require.resolve("expo/src/winter/url"), () => urlModule);
