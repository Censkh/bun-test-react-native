import { describe, expect, test } from "bun:test";

describe("@shopify/react-native-skia Jest setup compatibility", () => {
  test("loads Skia's mock with root named exports", async () => {
    const skia = await import("@shopify/react-native-skia");

    expect(typeof skia.vec).toBe("function");
    expect(typeof skia.Skia).toBe("object");
    expect(skia.vec(1, 2)).toBeDefined();
  });

  test("initializes CanvasKit enough for Skia path factories", async () => {
    const { Skia } = await import("@shopify/react-native-skia");

    const path = Skia.Path.Make();

    expect(path).toBeDefined();
    expect(typeof path.addCircle).toBe("function");
  });

  test("supports static named imports from the package root", async () => {
    const module = await import("./src/staticSkiaImport");

    expect(module.vecType).toBe("function");
    expect(module.skiaType).toBe("object");
    expect(module.vecResult).toBeDefined();
  });
});
