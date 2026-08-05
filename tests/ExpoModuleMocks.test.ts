import { describe, expect, test } from "bun:test";
import { expoModuleMocks, getExpoModuleMock } from "../src/mock/ExpoModuleMocks";

describe("explicit Expo module replacements", () => {
  test("keeps the fallback NativeUnimoduleProxy contract", async () => {
    const proxy = expoModuleMocks.NativeUnimoduleProxy;

    expect(proxy.exportedMethods).toEqual({});
    expect(proxy.modulesConstants).toEqual({});
    expect(proxy.viewManagersMetadata).toEqual({});
    await expect(proxy.callMethod()).resolves.toBeUndefined();
  });

  test("only resolves explicitly supported fallback modules", () => {
    expect(getExpoModuleMock("ExpoGlassEffect")).toBe(expoModuleMocks.ExpoGlassEffect);
    expect(getExpoModuleMock("MissingExpoModule")).toBeUndefined();
  });
});
