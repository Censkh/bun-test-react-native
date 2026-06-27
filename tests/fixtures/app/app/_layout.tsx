/// <reference types="react-native-css/types" />
import "react-native-get-random-values";

import { Stack } from "expo-router";
import { DarkTheme, ThemeProvider } from "expo-router/react-navigation";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { LogBox } from "react-native";
import "react-native-reanimated";
import "../src/lib/i18n";
import "../global.css";
import * as Sentry from "@sentry/react-native";
import { Blob } from "expo-blob";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { APP_ENVIRONMENT } from "shared/SharedConstants";
import AppWrapper from "src/components/app/AppWrapper/AppWrapper";
import AuthHandler from "src/components/app/AuthHandler";
import { KeyboardProvider } from "src/components/app/KeyboardController/KeyboardController";
import ProjectEventListener from "src/components/app/ProjectEventListener";
import Toasts from "src/components/app/Toasts";
import WebSocketDebugOverlay from "src/components/app/WebSocketDebugOverlay";
import Logo from "src/components/common/Logo/Logo";
import ErrorScreen from "src/components/ErrorScreen";
import { setupAppApi } from "src/lib/AppApiSetup";
import { markAppReady } from "src/lib/AppReady";
import { useThemeVariable } from "src/lib/constants/Theme";
import { useConnectivityMonitor } from "src/lib/hooks/ConnectivityHooks";
import { useInitialLoad } from "src/lib/hooks/InitialLoadHooks";
import { usePushNotifications } from "src/lib/hooks/PushNotificationsHooks";
import { useAuthStore } from "src/lib/stores/AuthStore";

globalThis.Blob = Blob;
LogBox.ignoreAllLogs();
Sentry.init({
  enabled: APP_ENVIRONMENT === "main",
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],
});
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({
  duration: 1000,
  fade: true,
});

export const unstable_settings = {
  anchor: "(tabs)",
};

function App() {
  setupAppApi();
  usePushNotifications();
  useConnectivityMonitor();
  const { loaded, initialLoadError, retryInitialLoad } = useInitialLoad();
  const { session } = useAuthStore();
  const [colorBackground, fontText, fontTextMedium, fontTextSemiBold, fontTextBold] =
    useThemeVariable([
      "colors.background",
      "fonts.header",
      "fonts.headerMedium",
      "fonts.headerSemiBold",
      "fonts.headerBold",
    ]);

  useEffect(() => {
    if (loaded) {
      Promise.resolve(SplashScreen.hideAsync()).finally(() => {
        markAppReady("splash_hidden");
      });
    }
  }, [loaded]);

  const theme = useMemo(
    () => ({
      ...DarkTheme,
      colors: { ...DarkTheme.colors, background: colorBackground },
      fonts: {
        bold: { fontFamily: fontTextSemiBold, fontWeight: "600" },
        heavy: { fontFamily: fontTextBold, fontWeight: "700" },
        medium: { fontFamily: fontTextMedium, fontWeight: "500" },
        regular: { fontFamily: fontText, fontWeight: "400" },
      },
    }),
    [colorBackground, fontText, fontTextMedium, fontTextSemiBold, fontTextBold],
  );

  return (
    <KeyboardProvider>
      <ThemeProvider value={theme}>
        <GestureHandlerRootView className="flex-1">
          {initialLoadError ? (
            <ErrorScreen
              message={initialLoadError}
              onRetry={retryInitialLoad}
              retryLabel="Try Again"
            >
              <Logo />
            </ErrorScreen>
          ) : loaded ? (
            <>
              <Stack screenOptions={{}}>
                <Stack.Screen
                  name="(tabs)"
                  options={{ headerShown: false }}
                  redirect={!session?.idToken}
                />
                <Stack.Screen
                  name="login"
                  options={{ gestureEnabled: false, headerShown: false }}
                  redirect={Boolean(session?.idToken)}
                />
              </Stack>
              <ProjectEventListener />
              <AuthHandler />
              <Toasts />
              <WebSocketDebugOverlay />
              <StatusBar style="light" />
            </>
          ) : null}
        </GestureHandlerRootView>
      </ThemeProvider>
    </KeyboardProvider>
  );
}

export default Sentry.wrap(function RootLayout() {
  return (
    <AppWrapper>
      <App />
    </AppWrapper>
  );
});
