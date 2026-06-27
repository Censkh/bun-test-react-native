import { useRouter } from "expo-router";
import { openBrowserAsync, WebBrowserPresentationStyle } from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Animated, Linking, Platform, View } from "react-native";
import { AuthService } from "react-native-nitro-auth";
import ReanimatedAnimated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import AnimatedGradientBackground from "src/components/common/AnimatedGradientBackground/AnimatedGradientBackground";
import AppleLoginButton from "src/components/common/AppleLoginButton/AppleLoginButton";
import Backdrop from "src/components/common/Backdrop/Backdrop";
import Button from "src/components/common/Button/Button";
import GoogleLoginButton from "src/components/common/GoogleLoginButton/GoogleLoginButton";
import LoadingSpinner from "src/components/common/LoadingSpinner/LoadingSpinner";
import Logo from "src/components/common/Logo/Logo";
import MagicLinkLoginButton from "src/components/common/MagicLinkLoginButton/MagicLinkLoginButton";
import MagicLinkLoginForm from "src/components/common/MagicLinkLoginForm/MagicLinkLoginForm";
import Page from "src/components/common/Page/Page";
import SignInButtonContainer from "src/components/common/SignInButtonContainer/SignInButtonContainer";
import Text from "src/components/common/Text/Text";
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from "src/lib/constants/AppConstants";
import { signInForToken } from "src/lib/FirebaseSignIn";
import { useAuthStore } from "src/lib/stores/AuthStore";

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session, signIn, lastUsedAuthMethod, setLastUsedAuthMethod } = useAuthStore() as any;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isMagicLinkState, setIsMagicLinkState] = useState(false);
  const signInProgress = useSharedValue(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        duration: 1000,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        friction: 8,
        tension: 40,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (session?.idToken) {
      router.replace("/(tabs)");
    }
  }, [session?.idToken, router]);

  useEffect(() => {
    if (isSigningIn) {
      signInProgress.value = 0;
      signInProgress.value = withRepeat(
        withSequence(withTiming(100, { duration: 1200 }), withTiming(0, { duration: 1200 })),
        -1,
      );
    }
  }, [isSigningIn, signInProgress]);

  useEffect(() => {
    AuthService.silentRestore();
  }, []);

  const handlePostSignIn = async (credential: unknown) => {
    setIsSigningIn(true);
    try {
      const result = await signInForToken(credential);
      if (result.token) {
        await signIn?.(result.token);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const openInAppBrowser = async (url: string) => {
    if (process.env.EXPO_OS !== "web") {
      await openBrowserAsync(url, {
        presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
      });
      return;
    }
    await Linking.openURL(url);
  };

  void router;
  void signIn;
  void lastUsedAuthMethod;
  void setLastUsedAuthMethod;
  void fadeAnim;
  void slideAnim;
  void isMagicLinkState;
  void signInProgress;
  void handlePostSignIn;
  void openInAppBrowser;
  void PRIVACY_POLICY_URL;
  void TERMS_OF_SERVICE_URL;
  void AnimatedGradientBackground;
  void AppleLoginButton;
  void Backdrop;
  void Button;
  void GoogleLoginButton;
  void LoadingSpinner;
  void Logo;
  void MagicLinkLoginButton;
  void MagicLinkLoginForm;
  void Page;
  void SignInButtonContainer;
  void ReanimatedAnimated;
  void FadeIn;
  void FadeOut;
  void View;
  void Platform;

  return <Text>{isSigningIn ? t("auth.signingIn") : t("auth.signInTitle")}</Text>;
}
