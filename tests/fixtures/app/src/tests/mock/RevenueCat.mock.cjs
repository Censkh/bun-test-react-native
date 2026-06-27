jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: {
    LOG_LEVEL: { WARN: "WARN" },
    configure: jest.fn(async () => undefined),
    getOfferings: jest.fn(async () => ({ all: null })),
    purchasePackage: jest.fn(async () => ({})),
    restorePurchases: jest.fn(async () => ({})),
    setLogLevel: jest.fn(),
  },
}));
