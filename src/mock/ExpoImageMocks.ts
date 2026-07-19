import { jest } from "bun:test";

const imageCache = new Map<string, string>();

export const getImageLoaderNativeModule = () => ({
  getSize: jest.fn((_uri, success) => process.nextTick(() => success(320, 240))),
  prefetchImage: jest.fn(),
  getCachePathAsync: jest.fn(async (key: string) => imageCache.get(key) ?? null),
  writeToCacheAsync: jest.fn(async (source: string, key: string) => {
    const { File, Paths } = require("expo-file-system");
    const cacheFile = new File(Paths.cache, `expo-image-${encodeURIComponent(key)}`);
    cacheFile.write(await new File(source).bytes());
    imageCache.set(key, cacheFile.uri);
  }),
  readFromCacheAsync: jest.fn(async (key: string) => {
    const uri = imageCache.get(key);
    return uri ? { uri } : null;
  }),
  clearDiskCache: jest.fn(async () => {
    imageCache.clear();
    return true;
  }),
  generateThumbhashAsync: jest.fn(async () => "mock-thumbhash"),
});

export const getExpoImageNativeModule = () => ({
  ...getImageLoaderNativeModule(),
  clearMemoryCache: jest.fn(async () => true),
  configureCache: jest.fn(),
  prefetch: jest.fn(async () => true),
});
