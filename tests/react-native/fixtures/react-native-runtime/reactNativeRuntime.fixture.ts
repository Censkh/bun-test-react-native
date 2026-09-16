import { describe, expect, test } from "bun:test";
import { pathToFileURL } from "node:url";

describe("real react-native package runtime compatibility", () => {
  test("loads static named imports from react-native in Bun test runtime", async () => {
    const { platformOS, useWindowDimensionsType } = await import("./src/staticNamedImport");

    expect(platformOS).toBe("ios");
    expect(useWindowDimensionsType).toBe("function");
  });

  test("loads named imports from react-native in ESM consumers", async () => {
    const module = await import("./src/namedImport");
    expect(module.default).toBe("ios");
  });

  test("runs StyleSheet.create for CommonJS consumers", async () => {
    const module = await import("./src/styleSheet");
    expect(module.default).toBe(1);
  });

  test("runs TurboModuleRegistry.getEnforcing for CommonJS consumers", async () => {
    const module = await import("./src/turboModuleRegistry");
    expect(module.default).toBe("function");
  });

  test("loads Image for CommonJS consumers", async () => {
    const module = await import("./src/image");
    expect(module.default).toBe("function");
  });

  test("uses the mocked renderer node handle", async () => {
    const renderer = await import("react-native/Libraries/ReactNative/RendererProxy");

    expect(renderer.findNodeHandle({})).toBe(1);
  });

  test("uses the mocked renderer node handle through a resolved file URL", async () => {
    const renderer = await import(
      pathToFileURL(require.resolve("react-native/Libraries/ReactNative/RendererProxy")).href
    );

    expect(renderer.findNodeHandle({})).toBe(1);
  });
});
