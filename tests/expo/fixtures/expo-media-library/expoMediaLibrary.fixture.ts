import { describe, expect, test } from "bun:test";
import * as MediaLibrary from "expo-media-library";
import * as LegacyMediaLibrary from "expo-media-library/legacy";

describe("expo-media-library", () => {
  test("loads constructable next API classes from native module mocks", async () => {
    const asset = new MediaLibrary.Asset("asset-1");
    const album = new MediaLibrary.Album("album-1");
    const query = new MediaLibrary.Query();

    expect(asset).toBeInstanceOf(MediaLibrary.Asset);
    expect(album).toBeInstanceOf(MediaLibrary.Album);
    expect(query.limit(1)).toBe(query);
    expect(await query.exe()).toEqual([]);
    expect(await asset.getMediaSubtypes()).toEqual([]);
    expect(await asset.getLivePhotoVideoUri()).toBeNull();
    expect(await asset.getIsInCloud()).toBe(false);
    expect(await asset.getOrientation()).toBeNull();
    expect(await album.getAssets()).toEqual([]);
  });

  test("exposes permission and listener helpers", async () => {
    await expect(MediaLibrary.getPermissionsAsync()).resolves.toMatchObject({
      accessPrivileges: "all",
      granted: true,
      status: "granted",
    });
    await expect(MediaLibrary.requestPermissionsAsync()).resolves.toMatchObject({
      accessPrivileges: "all",
      granted: true,
      status: "granted",
    });
    await expect(MediaLibrary.presentPermissionsPicker()).resolves.toBeUndefined();

    const subscription = MediaLibrary.addListener(() => {});
    expect(typeof subscription.remove).toBe("function");
    expect(() => MediaLibrary.removeAllListeners()).not.toThrow();
  });

  test("loads legacy API without an app-level native module mock", async () => {
    expect(LegacyMediaLibrary.MediaType.photo).toBe("photo");
    expect(LegacyMediaLibrary.SortBy.creationTime).toBe("creationTime");
    await expect(LegacyMediaLibrary.isAvailableAsync()).resolves.toBe(true);
    await expect(LegacyMediaLibrary.getAssetsAsync()).resolves.toEqual({
      assets: [],
      endCursor: "",
      hasNextPage: false,
      totalCount: 0,
    });
    await expect(LegacyMediaLibrary.createAssetAsync("file:///photo.jpg")).resolves.toMatchObject({
      id: "file:///photo.jpg",
      uri: "file:///photo.jpg",
    });
  });
});
