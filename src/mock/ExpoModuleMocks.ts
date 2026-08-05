export const expoModuleMocks = {
  ExpoGlassEffect: {
    addListener: () => undefined,
    removeListeners: () => undefined,
  },
  NativeUnimoduleProxy: {
    callMethod: () => Promise.resolve(),
    exportedMethods: {},
    modulesConstants: {},
    viewManagersMetadata: {},
  },
} as const;

export const getExpoModuleMock = (moduleName: string) => expoModuleMocks[moduleName as keyof typeof expoModuleMocks];
