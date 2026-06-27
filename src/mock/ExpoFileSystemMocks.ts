import { jest, mock } from "bun:test";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const expoFileSystemPackageRoot = path.dirname(require.resolve("expo-file-system/package.json"));
const expoFileSystemMockPath = path.join(expoFileSystemPackageRoot, "mocks/FileSystem.ts");
const expoFileSystemMockPathWithoutExtension = expoFileSystemMockPath.replace(/\.ts$/, "");

let expoFileSystemNativeModule: any;
let exponentFileSystemNativeModule: any;

const createFileBackedFileSystemModule = (fileSystem: any) => {
  const OriginalFileSystemFile = fileSystem.FileSystemFile;

  class FileBackedFileSystemFile extends File {
    private readonly file: any;

    uri: string;

    constructor(uri: string) {
      const file = new OriginalFileSystemFile(uri);
      const bytes = file.exists ? file.bytesSync() : new Uint8Array();
      super([bytes], path.basename(uri), { type: file.type });
      this.file = file;
      this.uri = file.uri;
    }

    private syncUri() {
      this.uri = this.file.uri;
    }

    validatePath() {
      return this.file.validatePath();
    }

    get exists() {
      return this.file.exists;
    }

    get md5() {
      return this.file.md5;
    }

    get modificationTime() {
      return this.file.modificationTime;
    }

    get creationTime() {
      return this.file.creationTime;
    }

    get contentUri() {
      return this.file.contentUri;
    }

    create(options?: unknown) {
      const result = this.file.create(options);
      this.syncUri();
      return result;
    }

    write(content: string | Uint8Array, options?: unknown) {
      const result = this.file.write(content, options);
      this.syncUri();
      return result;
    }

    textSync() {
      return this.file.textSync();
    }

    base64Sync() {
      return this.file.base64Sync();
    }

    bytesSync() {
      return this.file.bytesSync();
    }

    async base64() {
      return this.file.base64();
    }

    async bytes() {
      return this.file.bytes();
    }

    info(options?: unknown) {
      return this.file.info(options);
    }

    open(mode?: unknown) {
      return this.file.open(mode);
    }

    delete() {
      return this.file.delete();
    }

    copySync(destination: unknown, options?: unknown) {
      return this.file.copySync(destination, options);
    }

    async copy(destination: unknown, options?: unknown) {
      return this.file.copy(destination, options);
    }

    moveSync(destination: unknown, options?: unknown) {
      const result = this.file.moveSync(destination, options);
      this.syncUri();
      return result;
    }

    async move(destination: unknown, options?: unknown) {
      const result = await this.file.move(destination, options);
      this.syncUri();
      return result;
    }

    rename(newName: string) {
      const result = this.file.rename(newName);
      this.syncUri();
      return result;
    }

    watch(callback: unknown, options?: unknown) {
      return this.file.watch(callback, options);
    }
  }

  return {
    ...fileSystem,
    FileSystemFile: FileBackedFileSystemFile,
  };
};

export const getExpoFileSystemNativeModule = () => {
  expoFileSystemNativeModule ??= createFileBackedFileSystemModule(
    require(`actual:${expoFileSystemMockPath}`),
  );
  return expoFileSystemNativeModule;
};

mock.module(expoFileSystemMockPath, () => getExpoFileSystemNativeModule());
mock.module(expoFileSystemMockPathWithoutExtension, () => getExpoFileSystemNativeModule());

type DeletingOptions = {
  idempotent?: boolean;
};

type DirectoryCreateOptions = {
  idempotent?: boolean;
  intermediates?: boolean;
  overwrite?: boolean;
};

type DownloadOptions = {
  md5?: boolean;
};

const getFileInfo = (uri: string, options?: { md5?: boolean }) =>
  new (getExpoFileSystemNativeModule().FileSystemFile)(uri).info(options);

const getDirectoryInfo = (uri: string) =>
  new (getExpoFileSystemNativeModule().FileSystemDirectory)(uri).info();

export const resetExpoFileSystemMock = () => {
  getExpoFileSystemNativeModule().__resetMockFileSystem?.();
};

export const getExponentFileSystemNativeModule = () => {
  const fileSystem = getExpoFileSystemNativeModule();
  exponentFileSystemNativeModule ??= {
    addListener: fileSystem.addListener,
    availableDiskSpace: fileSystem.availableDiskSpace,
    bundleDirectory: fileSystem.bundleDirectory,
    cacheDirectory: fileSystem.cacheDirectory,
    deleteAsync: jest.fn(async (uri: string, options: DeletingOptions = {}) => {
      const info = fileSystem.info(uri);
      if (!info.exists) {
        if (options.idempotent) return;
        throw new Error(`Path does not exist: ${uri}`);
      }
      if (info.isDirectory) {
        new fileSystem.FileSystemDirectory(uri).delete();
        return;
      }
      new fileSystem.FileSystemFile(uri).delete();
    }),
    documentDirectory: fileSystem.documentDirectory,
    downloadAsync: jest.fn(async (url: string, fileUri: string, options: DownloadOptions = {}) => {
      const uri = await fileSystem.downloadFileAsync(url, { uri: fileUri }, options);
      const fileInfo = getFileInfo(uri, options);
      return {
        headers: {},
        md5: options.md5 ? fileInfo.md5 : undefined,
        mimeType: null,
        status: 200,
        uri,
      };
    }),
    getContentUriAsync: jest.fn(async (uri: string) => uri),
    getFreeDiskStorageAsync: jest.fn(async () => fileSystem.availableDiskSpace),
    getInfoAsync: jest.fn(async (uri: string, options: { md5?: boolean } = {}) => {
      const info = fileSystem.info(uri);
      if (!info.exists) return { exists: false, isDirectory: false, uri };
      return info.isDirectory ? getDirectoryInfo(uri) : getFileInfo(uri, options);
    }),
    getTotalDiskCapacityAsync: jest.fn(async () => fileSystem.totalDiskSpace),
    makeDirectoryAsync: jest.fn(async (uri: string, options: DirectoryCreateOptions = {}) => {
      new fileSystem.FileSystemDirectory(uri).create(options);
    }),
    readAsStringAsync: jest.fn(async (uri: string) =>
      new fileSystem.FileSystemFile(uri).textSync(),
    ),
    readDirectoryAsync: jest.fn(async (uri: string) =>
      new fileSystem.FileSystemDirectory(uri)
        .listAsRecords()
        .map((record: { uri: string }) => path.basename(record.uri)),
    ),
    uploadAsync: jest.fn(async () => ({
      body: "",
      headers: {},
      mimeType: null,
      status: 200,
    })),
    writeAsStringAsync: jest.fn(async (uri: string, contents: string) => {
      new fileSystem.FileSystemFile(uri).write(contents);
    }),
  };
  return exponentFileSystemNativeModule;
};

export const installExpoFileSystemModuleMocks = () => {
  mock.module("expo-file-system", () => ({
    ...require("actual:expo-file-system"),
    __esModule: true,
    __reset: resetExpoFileSystemMock,
  }));
  mock.module("expo-file-system/legacy", () => {
    const actual = require("actual:expo-file-system/legacy");
    const legacyNativeModule = getExponentFileSystemNativeModule();
    return {
      ...actual,
      __esModule: true,
      ...legacyNativeModule,
    };
  });
};
