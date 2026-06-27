import { beforeEach, describe, expect, jest, test } from "bun:test";
import { configureAppEventsBaseUrl } from "src/lib/AppEventsManager";
import { queryClient } from "src/lib/queryClient";
import { useAuthStore } from "src/lib/stores/AuthStore";
import { useEditorStore } from "src/lib/stores/EditorStore";
import { useUserStore } from "src/lib/stores/UserStore";
import { renderApp } from "src/TestUtils";

jest.mock("src/lib/hooks/InitialLoadHooks", () => ({
  useInitialLoad: () => ({
    initialLoadError: null,
    loaded: true,
    retryInitialLoad: jest.fn(),
  }),
}));

describe("@backpackapp-io/react-native-toast with Expo Router", () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    queryClient.clear();
    configureAppEventsBaseUrl(undefined);
    useAuthStore.setState({
      isLoading: false,
      session: undefined,
    });
    useEditorStore.getState().clearEditorState();
    useUserStore.setState({
      isMeFetched: false,
      remoteData: {
        filters: [],
        savedFilters: [],
        showcaseCards: [],
        user: null,
      },
    });
  });

  test("renders through the app ExpoRoot path", async () => {
    const screen = await renderApp({
      initialUrl: "/login",
      queryIdleTimeoutMs: 5_000,
    });

    expect(screen.getByText("auth.signInTitle")).toBeTruthy();
    expect(queryClient.isFetching()).toBe(0);
    expect(queryClient.isMutating()).toBe(0);
  }, 15_000);
});
