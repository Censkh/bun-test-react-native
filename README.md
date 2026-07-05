# bun-test-react-native

[![npm version](https://img.shields.io/npm/v/bun-test-react-native.svg)](https://www.npmjs.com/package/bun-test-react-native)

Run React Native and Expo tests in Bun

## Usage

Preload the package test setup before app-specific test setup:

```toml
[test]
preload = ["bun-test-react-native/setup"]
```

## What It Does

React Native packages assume Metro, Jest, native modules, platform-specific files, and Flow syntax. Bun does not provide those behaviors by default, so this package adds the missing compatibility layer in two parts.


- **Platform resolution**: resolves `.ios.*`, `.native.*`, then base files, so imports like `./View` can land on `View.ios.tsx` or `View.native.tsx`.
- **React Native package fields**: prefers React Native-specific package entry fields before generic package entries.
- **Flow stripping**: transpiles Flow-typed React Native package source before Bun parses it.
- **React Native root exports**: rewrites `react-native/index.js` CommonJS export definitions into usable static named exports for ESM consumers.
- **NativeModules shim**: redirects React Native's internal `NativeModules` import to a test/build-safe mock module.
- **Empty module shims**: returns empty modules for platform files that React Native conventionally treats as unavailable.
- **Asset imports**: maps images, fonts, audio, and other React Native asset imports to lightweight JS modules.
- **React Native test globals**: sets `__DEV__`, React act flags, animation frame timers, `window`, `document`, `performance`, and `regeneratorRuntime`.
- **Jest compatibility global**: uses `bun-jest-require-actual` to provide `globalThis.jest.requireActual` on top of Bun test globals.

## Supported Packages

Supports Expo SDK 56+ and React Native 0.57+ test environments.

`bun-test-react-native/setup` includes built-in test support for:

- `react-native`
- `@react-native/assets-registry`
- `@react-native-community/netinfo`
- `react-native-reanimated`
- `react-native-gesture-handler`
- `react-native-keyboard-controller`
- `expo`
- `expo-modules-core`
- `expo-file-system`
- `expo-media-library`
- `@expo/ui`
- `expo-font`
- `expo-constants`
- `@react-native-firebase/app`
- `@react-native-firebase/auth`
- `@react-native-firebase/messaging`
- `prettier`, when available for packages that require it during test-time module evaluation
