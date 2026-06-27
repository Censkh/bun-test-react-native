const noop = () => undefined;

const UIManager = {
  genericDirectEventTypes: {},
  clearJSResponder: noop,
  createView: noop,
  dispatchViewManagerCommand: noop,
  getConstants: () => ({
    ViewManagerNames: [],
    genericDirectEventTypes: {},
  }),
  getDefaultEventTypes: () => ({}),
  getViewManagerConfig: () => ({
    Constants: {},
    Commands: {},
    NativeProps: {},
    bubblingEventTypes: {},
    directEventTypes: {},
    genericDirectEventTypes: {},
  }),
  hasViewManagerConfig: () => true,
  measure: noop,
  measureInWindow: noop,
  measureLayout: noop,
  setChildren: noop,
  setJSResponder: noop,
  updateView: noop,
};

const RNGestureHandlerModule = {
  attachGestureHandler: noop,
  createGestureHandler: noop,
  dropGestureHandler: noop,
  flushOperations: noop,
  handleClearJSResponder: noop,
  handleSetJSResponder: noop,
  install: noop,
  installUIRuntimeBindings: noop,
  updateGestureHandler: noop,
};

const ImageLoader = {
  getConstants: () => ({}),
  getSize: () => Promise.resolve([1, 1]),
  getSizeWithHeaders: () => Promise.resolve({ height: 1, width: 1 }),
  prefetchImage: () => Promise.resolve(true),
  prefetchImageWithMetadata: () => Promise.resolve(true),
  queryCache: () => Promise.resolve({}),
};

const AppState = {
  addListener: noop,
  getConstants: () => ({
    initialAppState: "active",
  }),
  getCurrentAppState: (success?: (state: { app_state: string }) => void) => success?.({ app_state: "active" }),
  removeListeners: noop,
};

const NativeAnimatedModule = {
  addAnimatedEventToView: noop,
  addListener: noop,
  connectAnimatedNodeToView: noop,
  connectAnimatedNodes: noop,
  createAnimatedNode: noop,
  disconnectAnimatedNodeFromView: noop,
  disconnectAnimatedNodes: noop,
  dropAnimatedNode: noop,
  flattenAnimatedNodeOffset: noop,
  getValue: noop,
  removeAnimatedEventFromView: noop,
  removeListener: noop,
  removeListeners: noop,
  restoreDefaultValues: noop,
  setAnimatedNodeOffset: noop,
  setAnimatedNodeValue: noop,
  startAnimatingNode: (
    _animationId: unknown,
    _nodeTag: unknown,
    _config: unknown,
    callback?: (result: { finished: boolean }) => void,
  ) => callback?.({ finished: true }),
  startListeningToAnimatedNodeValue: noop,
  stopAnimation: noop,
  stopListeningToAnimatedNodeValue: noop,
  updateAnimatedNodeConfig: noop,
};

const NativeModules = {
  AppState,
  Clipboard: {
    getString: () => Promise.resolve(""),
    hasString: () => Promise.resolve(false),
    setString: noop,
  },
  DevMenu: {
    debugRemotely: noop,
    reload: noop,
    setProfilingEnabled: noop,
    show: noop,
  },
  DevSettings: {
    addMenuItem: noop,
    reload: noop,
    setHotLoadingEnabled: noop,
    setIsDebuggingRemotely: noop,
    setProfilingEnabled: noop,
    toggleElementInspector: noop,
  },
  DeviceInfo: {
    getConstants: () => ({
      Dimensions: {
        screen: { fontScale: 1, height: 812, scale: 2, width: 375 },
        window: { fontScale: 1, height: 812, scale: 2, width: 375 },
      },
    }),
  },
  ExponentConstants: {
    appOwnership: "expo",
    expoConfig: {
      name: "Bun",
      slug: "bun",
    },
    isDevice: false,
    manifest: {
      name: "Bun",
      slug: "bun",
    },
    statusBarHeight: 0,
    systemFonts: [],
  },
  ImageLoader,
  ImageViewManager: ImageLoader,
  KeyboardObserver: {
    addListener: noop,
    removeListeners: noop,
  },
  LinkingManager: {
    canOpenURL: () => Promise.resolve(true),
    getInitialURL: () => Promise.resolve(null),
    openURL: () => Promise.resolve(),
  },
  NativeAnimatedModule,
  Networking: {
    abortRequest: noop,
    addListener: noop,
    clearCookies: (callback?: (result: boolean) => void) => callback?.(true),
    removeListeners: noop,
    sendRequest: noop,
  },
  PlatformConstants: {
    forceTouchAvailable: false,
    getConstants: () => ({
      forceTouchAvailable: false,
      interfaceIdiom: "phone",
      isTesting: true,
      osVersion: "1",
      reactNativeVersion: { major: 0, minor: 0, patch: 0 },
      systemName: "iOS",
    }),
  },
  PushNotificationManager: {
    abandonPermissions: noop,
    addListener: noop,
    checkPermissions: (callback?: (permissions: object) => void) => callback?.({}),
    getApplicationIconBadgeNumber: (callback?: (count: number) => void) => callback?.(0),
    getDeliveredNotifications: (callback?: (notifications: unknown[]) => void) => callback?.([]),
    getInitialNotification: () => Promise.resolve(null),
    getScheduledLocalNotifications: (callback?: (notifications: unknown[]) => void) => callback?.([]),
    presentLocalNotification: noop,
    removeAllDeliveredNotifications: noop,
    removeAllPendingNotificationRequests: noop,
    removeDeliveredNotifications: noop,
    removeListeners: noop,
    requestPermissions: () => Promise.resolve({}),
    scheduleLocalNotification: noop,
    setApplicationIconBadgeNumber: noop,
  },
  RNGestureHandlerModule,
  SettingsManager: {
    getConstants: () => ({
      settings: {},
    }),
    setValues: noop,
    settings: {},
  },
  SourceCode: {
    getConstants: () => ({
      scriptURL: "http://localhost:8081/index.bundle?platform=ios",
    }),
  },
  KeyboardController: {},
  StatusBarManager: {
    HEIGHT: 0,
    getConstants: () => ({
      HEIGHT: 0,
      height: 0,
    }),
    getHeight: (callback?: (height: { height: number }) => void) => callback?.({ height: 0 }),
    setColor: noop,
    setHidden: noop,
    setNetworkActivityIndicatorVisible: noop,
    setStyle: noop,
    setTranslucent: noop,
  },
  UIManager,
  Vibration: {
    cancel: noop,
    vibrate: noop,
  },
};

export default NativeModules;
