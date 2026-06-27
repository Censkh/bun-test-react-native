import { ExpoRoot } from "expo-router/build/ExpoRoot";
import { store } from "expo-router/build/global-state/router-store";
import { getMockContext, render, waitFor } from "expo-router/testing-library";
import { createElement } from "react";
import { queryClient } from "src/lib/queryClient";

type RenderOptions = Parameters<typeof render>[1] & {
  initialUrl?: string;
  linking?: Partial<Parameters<typeof ExpoRoot>[0]["linking"]>;
  queryIdleTimeoutMs?: number;
};

const getQueryClientState = () => ({
  isFetching: queryClient.isFetching(),
  isMutating: queryClient.isMutating(),
  mutations: queryClient
    .getMutationCache()
    .getAll()
    .map((mutation) => ({
      error:
        mutation.state.error instanceof Error ? mutation.state.error.message : mutation.state.error,
      key: mutation.options.mutationKey,
      status: mutation.state.status,
    })),
  queries: queryClient
    .getQueryCache()
    .findAll()
    .map((query) => ({
      error: query.state.error instanceof Error ? query.state.error.message : query.state.error,
      fetchStatus: query.state.fetchStatus,
      key: query.queryKey,
      status: query.state.status,
    })),
});

export const waitForQueryIdle = async (label: string, timeoutMs = 10_000) => {
  try {
    await waitFor(
      () => {
        expect(queryClient.isFetching()).toBe(0);
        expect(queryClient.isMutating()).toBe(0);
      },
      { interval: 50, timeout: timeoutMs },
    );
  } catch (error) {
    throw new Error(
      `Timed out waiting for query idle: ${label}\n${JSON.stringify(getQueryClientState(), null, 2)}`,
      { cause: error },
    );
  }
};

export const renderApp = async ({
  initialUrl = "/",
  linking,
  queryIdleTimeoutMs = 10_000,
  ...options
}: RenderOptions = {}) => {
  const mockContext = getMockContext("./app");

  process.env.EXPO_ROUTER_IMPORT_MODE = "sync";

  const result = render(
    createElement(ExpoRoot, {
      context: mockContext,
      location: initialUrl,
      linking,
    }),
    options,
  );

  const screen = await result;

  const extendedScreen = Object.assign(screen, {
    getPathname() {
      return store.getRouteInfo().pathname;
    },
    getSegments() {
      return store.getRouteInfo().segments;
    },
    getSearchParams() {
      return store.getRouteInfo().params;
    },
    getPathnameWithParams() {
      return store.getRouteInfo().pathnameWithParams;
    },
    getRouterState() {
      return store.state;
    },
  });

  if (queryIdleTimeoutMs > 0) {
    await waitForQueryIdle("after-render", queryIdleTimeoutMs);
  }

  return extendedScreen;
};
