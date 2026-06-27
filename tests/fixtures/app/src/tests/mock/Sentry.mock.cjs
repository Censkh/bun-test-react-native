jest.mock("@sentry/react-native", () => ({
  feedbackIntegration: jest.fn(() => ({})),
  init: jest.fn(),
  mobileReplayIntegration: jest.fn(() => ({})),
  wrap: (Component) => Component,
}));
