export const expoModuleMocks = {
  ExponentImagePicker: {
    getCameraPermissionsAsync: () => Promise.resolve({ granted: true, status: "granted" }),
    getMediaLibraryPermissionsAsync: () => Promise.resolve({ granted: true, status: "granted" }),
    getPendingResultAsync: () => Promise.resolve(null),
    launchCameraAsync: () => Promise.resolve({ assets: null, canceled: true }),
    launchImageLibraryAsync: () => Promise.resolve({ assets: null, canceled: true }),
    requestCameraPermissionsAsync: () => Promise.resolve({ granted: true, status: "granted" }),
    requestMediaLibraryPermissionsAsync: () => Promise.resolve({ granted: true, status: "granted" }),
  },
  ExpoFontLoader: {
    getLoadedFonts: () => [],
    isLoaded: () => false,
    loadAsync: () => Promise.resolve(),
    loadFontFamilyAsync: () => Promise.resolve(),
    unloadAllAsync: () => Promise.resolve(),
    unloadAsync: () => Promise.resolve(),
  },
  ExpoWebBrowser: {
    coolDownAsync: () => Promise.resolve({}),
    dismissAuthSession: () => undefined,
    dismissBrowser: () => undefined,
    getCustomTabsSupportingBrowsersAsync: () => Promise.resolve({ browserPackages: [], servicePackages: [] }),
    mayInitWithUrlAsync: () => Promise.resolve({}),
    openAuthSessionAsync: () => Promise.resolve({ type: "cancel" }),
    openBrowserAsync: () => Promise.resolve({ type: "cancel" }),
    warmUpAsync: () => Promise.resolve({}),
  },
  ExpoSharing: {
    clearSharedPayloads: () => undefined,
    getResolvedSharedPayloadsAsync: () => Promise.resolve([]),
    getSharedPayloads: () => [],
    isAvailableAsync: () => Promise.resolve(true),
    shareAsync: () => Promise.resolve(),
  },
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
