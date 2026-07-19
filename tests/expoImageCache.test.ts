import { describe, expect, test } from "bun:test";
import "../src/setup";
import { File, Paths } from "expo-file-system";
import { getImageLoaderNativeModule } from "../src/mock/ExpoImageMocks";

describe("Expo Image cache mock", () => {
  test("writes and reads cache entries by key", async () => {
    const image = getImageLoaderNativeModule();
    const source = new File(Paths.cache, "expo-image-source.png");
    source.write(new Uint8Array([1]));
    await image.writeToCacheAsync(source.uri, "asset:1");
    const cachePath = await image.getCachePathAsync("asset:1");
    expect(cachePath).not.toBe(source.uri);
    expect(await new File(cachePath as string).bytes()).toEqual(new Uint8Array([1]));
    expect(await image.readFromCacheAsync("asset:1")).toEqual({ uri: cachePath });
  });

  test("clears cache entries", async () => {
    const image = getImageLoaderNativeModule();
    const source = new File(Paths.cache, "expo-image-source-clear.png");
    source.write(new Uint8Array([1]));
    await image.writeToCacheAsync(source.uri, "asset:2");
    await image.clearDiskCache();
    expect(await image.getCachePathAsync("asset:2")).toBeNull();
  });
});
