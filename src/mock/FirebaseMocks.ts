import { jest, mock } from "bun:test";

const appMock = {
  getApp: jest.fn(() => ({})),
  initializeApp: jest.fn(() => ({})),
};

const authMock = {
  AppleAuthProvider: {
    credential: jest.fn((identityToken: string) => ({ identityToken, providerId: "apple.com" })),
  },
  GoogleAuthProvider: {
    credential: jest.fn((idToken: string, accessToken?: string) => ({
      accessToken,
      idToken,
      providerId: "google.com",
    })),
  },
  getAuth: jest.fn(() => ({})),
  getIdTokenResult: jest.fn(),
  isSignInWithEmailLink: jest.fn(),
  sendSignInLinkToEmail: jest.fn(),
  signInWithCredential: jest.fn(async (_auth: unknown, credential: unknown) => ({
    user: {
      credential,
    },
  })),
  signInWithEmailLink: jest.fn(),
  signOut: jest.fn(),
};

const messagingMock = {
  AuthorizationStatus: {},
  getInitialNotification: jest.fn(async () => null),
  getMessaging: jest.fn(() => ({
    setBackgroundMessageHandler: jest.fn(),
  })),
  getToken: jest.fn(),
  onNotificationOpenedApp: jest.fn(() => jest.fn()),
  onTokenRefresh: jest.fn(() => jest.fn()),
  requestPermission: jest.fn(async () => ({})),
  setBackgroundMessageHandler: jest.fn(),
};

mock.module("@react-native-firebase/app", () => appMock);
mock.module("@react-native-firebase/auth", () => authMock);
mock.module("@react-native-firebase/messaging", () => messagingMock);
