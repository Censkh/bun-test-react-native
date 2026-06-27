import { jest } from "bun:test";
import path from "node:path";

const mediaLibraryPermission = {
  accessPrivileges: "all",
  canAskAgain: true,
  expires: "never",
  granted: true,
  status: "granted",
};

class MockMediaLibraryAsset {
  id: string;

  constructor(id = "mock-asset") {
    this.id = id;
  }

  static async create(filePath: string) {
    return new MockMediaLibraryAsset(filePath);
  }

  static async delete() {}

  async delete() {}

  async getAlbums() {
    return [];
  }

  async getCreationTime() {
    return null;
  }

  async getDuration() {
    return null;
  }

  async getExif() {
    return {};
  }

  async getFavorite() {
    return false;
  }

  async getFilename() {
    return `${this.id}.jpg`;
  }

  async getHeight() {
    return 1;
  }

  async getInfo() {
    return {
      id: this.id,
      filename: await this.getFilename(),
      mediaType: "image",
      uri: await this.getUri(),
      width: await this.getWidth(),
      height: await this.getHeight(),
      creationTime: Date.now(),
      modificationTime: Date.now(),
      duration: 0,
    };
  }

  async getIsInCloud() {
    return false;
  }

  async getLivePhotoVideoUri() {
    return null;
  }

  async getLocation() {
    return null;
  }

  async getMediaSubtypes() {
    return [];
  }

  async getMediaType() {
    return "image";
  }

  async getModificationTime() {
    return null;
  }

  async getOrientation() {
    return null;
  }

  async getShape() {
    return { height: 1, width: 1 };
  }

  async getUri() {
    return `file:///mock/media-library/${this.id}`;
  }

  async getWidth() {
    return 1;
  }

  async setFavorite() {}
}

class MockMediaLibraryAlbum {
  id: string;

  constructor(id = "mock-album") {
    this.id = id;
  }

  static async create(name: string) {
    return new MockMediaLibraryAlbum(name);
  }

  static async delete() {}

  static async get(title: string) {
    return new MockMediaLibraryAlbum(title);
  }

  static async getAll() {
    return [];
  }

  async add() {}

  async delete() {}

  async getAssets() {
    return [];
  }

  async getTitle() {
    return this.id;
  }

  async removeAssets() {}
}

class MockMediaLibraryQuery {
  album() {
    return this;
  }

  eq() {
    return this;
  }

  async exe() {
    return [];
  }

  gt() {
    return this;
  }

  gte() {
    return this;
  }

  limit() {
    return this;
  }

  lt() {
    return this;
  }

  lte() {
    return this;
  }

  offset() {
    return this;
  }

  orderBy() {
    return this;
  }

  within() {
    return this;
  }
}

export const getExpoMediaLibraryNextNativeModule = () => ({
  Album: MockMediaLibraryAlbum,
  Asset: MockMediaLibraryAsset,
  Query: MockMediaLibraryQuery,
  addListener: () => ({ remove: jest.fn() }),
  getPermissionsAsync: async () => mediaLibraryPermission,
  presentPermissionsPicker: async () => {},
  removeAllListeners: () => {},
  requestPermissionsAsync: async () => mediaLibraryPermission,
});

export const getExpoMediaLibraryNativeModule = () => ({
  CHANGE_LISTENER_NAME: "mediaLibraryDidChange",
  MediaType: {
    audio: "audio",
    pairedVideo: "pairedVideo",
    photo: "photo",
    unknown: "unknown",
    video: "video",
  },
  SortBy: {
    creationTime: "creationTime",
    default: "default",
    duration: "duration",
    height: "height",
    mediaType: "mediaType",
    modificationTime: "modificationTime",
    width: "width",
  },
  addAssetsToAlbumAsync: async () => true,
  addListener: () => ({ remove: jest.fn() }),
  albumNeedsMigrationAsync: async () => false,
  createAlbumAsync: async (albumName: string) => ({
    assetCount: 0,
    id: albumName,
    title: albumName,
  }),
  createAssetAsync: async (localUri: string) => ({
    creationTime: Date.now(),
    duration: 0,
    filename: path.basename(localUri),
    height: 1,
    id: localUri,
    mediaType: "photo",
    modificationTime: Date.now(),
    uri: localUri,
    width: 1,
  }),
  deleteAlbumsAsync: async () => true,
  deleteAssetsAsync: async () => true,
  getAlbumAsync: async (title: string) => ({
    assetCount: 0,
    id: title,
    title,
  }),
  getAlbumsAsync: async () => [],
  getAssetInfoAsync: async (id: string) => ({
    creationTime: Date.now(),
    duration: 0,
    filename: `${id}.jpg`,
    height: 1,
    id,
    mediaType: "photo",
    modificationTime: Date.now(),
    uri: `file:///mock/media-library/${id}`,
    width: 1,
  }),
  getAssetsAsync: async () => ({
    assets: [],
    endCursor: "",
    hasNextPage: false,
    totalCount: 0,
  }),
  getMomentsAsync: async () => [],
  getPermissionsAsync: async () => mediaLibraryPermission,
  migrateAlbumIfNeededAsync: async () => {},
  presentPermissionsPickerAsync: async () => {},
  removeAllListeners: () => {},
  removeAssetsFromAlbumAsync: async () => true,
  requestPermissionsAsync: async () => mediaLibraryPermission,
  saveToLibraryAsync: async () => {},
  setAssetFavoriteAsync: async () => true,
});
