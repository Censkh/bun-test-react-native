import { describe, expect, test } from "bun:test";
import { Directory, File, Paths } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";

describe("expo-file-system", () => {
  test("legacy namespace exports expected file operations", () => {
    expect(Object.keys(FileSystem).sort()).toContain("deleteAsync");
    expect(typeof FileSystem.deleteAsync).toBe("function");
    expect(typeof FileSystem.downloadAsync).toBe("function");
  });

  test("modern File and Directory APIs use the shared native mock", async () => {
    const directory = new Directory(Paths.cache, "fixture-cache");
    directory.create({ idempotent: true, intermediates: true });

    const file = new File(directory, "asset.png");
    file.write(new Uint8Array([1, 2, 3]));

    expect(Paths.info(file.uri).exists).toBe(true);
    expect(file.bytesSync()).toEqual(new Uint8Array([1, 2, 3]));

    await FileSystem.deleteAsync(directory.uri, { idempotent: true });
    expect(Paths.info(file.uri).exists).toBe(false);
  });

  test("modern File is Blob-compatible", () => {
    const directory = new Directory(Paths.cache, "fixture-cache");
    directory.create({ idempotent: true, intermediates: true });

    const file = new File(directory, "asset.jpg");
    file.write(new Uint8Array([1, 2, 3]));

    const cachedFile = new File(directory, "asset.jpg");

    expect(cachedFile).toBeInstanceOf(globalThis.File);
    expect(cachedFile).toBeInstanceOf(Blob);
    expect(cachedFile.name).toBe("asset.jpg");
    expect(cachedFile.bytesSync()).toEqual(new Uint8Array([1, 2, 3]));
  });
});
