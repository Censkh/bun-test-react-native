import { jest } from "bun:test";

export const getImageLoaderNativeModule = () => ({
  getSize: jest.fn((_uri, success) => process.nextTick(() => success(320, 240))),
  prefetchImage: jest.fn(),
});
