const mockStores = new Map();

jest.mock("react-native-mmkv", () => ({
  createMMKV: jest.fn(({ id = "default" } = {}) => {
    if (!mockStores.has(id)) {
      mockStores.set(id, new Map());
    }
    const store = mockStores.get(id);
    return {
      clearAll: jest.fn(() => store.clear()),
      getString: jest.fn((key) => store.get(key)),
      remove: jest.fn((key) => store.delete(key)),
      set: jest.fn((key, value) => store.set(key, String(value))),
    };
  }),
}));
