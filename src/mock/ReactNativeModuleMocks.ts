import { jest } from "bun:test";

const subscription = () => ({ remove: jest.fn() });

export const createAppStateMock = () => ({
  addEventListener: jest.fn(subscription),
  currentState: jest.fn(),
  removeEventListener: jest.fn(),
});

export const createAccessibilityInfoMock = () => ({
  addEventListener: jest.fn(subscription),
  announceForAccessibility: jest.fn(),
  announceForAccessibilityWithOptions: jest.fn(),
  getRecommendedTimeoutMillis: jest.fn(() => Promise.resolve(false)),
  isAccessibilityServiceEnabled: jest.fn(() => Promise.resolve(false)),
  isBoldTextEnabled: jest.fn(() => Promise.resolve(false)),
  isDarkerSystemColorsEnabled: jest.fn(() => Promise.resolve(false)),
  isGrayscaleEnabled: jest.fn(() => Promise.resolve(false)),
  isHighTextContrastEnabled: jest.fn(() => Promise.resolve(false)),
  isInvertColorsEnabled: jest.fn(() => Promise.resolve(false)),
  isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
  isReduceTransparencyEnabled: jest.fn(() => Promise.resolve(false)),
  isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
  prefersCrossFadeTransitions: jest.fn(() => Promise.resolve(false)),
  sendAccessibilityEvent: jest.fn(),
  setAccessibilityFocus: jest.fn(),
});

export const createClipboardMock = () => ({
  getString: jest.fn(async () => ""),
  setString: jest.fn(),
});

export const createLinkingMock = () => ({
  addEventListener: jest.fn(subscription),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  getInitialURL: jest.fn(() => Promise.resolve()),
  openSettings: jest.fn(),
  openURL: jest.fn(),
  sendIntent: jest.fn(),
});

export const createVibrationMock = () => ({
  cancel: jest.fn(),
  vibrate: jest.fn(),
});
