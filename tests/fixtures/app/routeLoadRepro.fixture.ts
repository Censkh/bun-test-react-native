import { describe, expect, test } from "bun:test";
import { getRoutes } from "expo-router/build/getRoutes";
import { getMockContext } from "expo-router/testing-library";

const loadRoutes = (route: any) => {
  route.loadRoute?.();
  for (const child of route.children ?? []) {
    loadRoutes(child);
  }
};

describe("Expo Router route loading", () => {
  test("loads the app route graph synchronously", () => {
    process.env.EXPO_ROUTER_IMPORT_MODE = "sync";

    const routes = getRoutes(getMockContext("./app"));
    if (routes) {
      loadRoutes(routes);
    }

    expect(routes).toBeDefined();
  });
});
