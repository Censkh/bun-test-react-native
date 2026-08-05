import { jest } from "bun:test";

const React = require("react");

export const nativeMethods = {
  blur: jest.fn(),
  focus: jest.fn(),
  measure: jest.fn(),
  measureInWindow: jest.fn(),
  measureLayout: jest.fn(),
  setNativeProps: jest.fn(),
};

let nativeTag = 1;

export const createNativeComponent = (viewName: string) => {
  class NativeComponent extends React.Component<any> {
    _nativeTag = nativeTag++;

    render() {
      return React.createElement(viewName, this.props, this.props.children);
    }

    blur = jest.fn();
    focus = jest.fn();
    measure = jest.fn();
    measureInWindow = jest.fn();
    measureLayout = jest.fn();
    setNativeProps = jest.fn();
  }

  NativeComponent.displayName = viewName === "RCTView" ? "View" : viewName;
  return NativeComponent;
};

export const createComponentMock = (viewName: string, instanceMethods: Record<string, unknown> | null) => {
  const actualModule = (jest as any).requireActual(viewName);
  const RealComponent = actualModule.default ?? actualModule;
  const SuperClass =
    typeof RealComponent === "function" && RealComponent.prototype?.constructor instanceof React.Component
      ? RealComponent
      : React.Component;
  const name =
    RealComponent.displayName ??
    RealComponent.name ??
    (RealComponent.render == null ? "Unknown" : (RealComponent.render.displayName ?? RealComponent.render.name));
  const nameWithoutPrefix = name.replace(/^(RCT|RK)/, "");

  const Component: any = class extends SuperClass {
    render() {
      const props = { ...RealComponent.defaultProps } as Record<string, unknown>;
      for (const [key, value] of Object.entries(this.props ?? {})) {
        if (value !== undefined) props[key] = value;
      }
      return React.createElement(nameWithoutPrefix, props, this.props.children);
    }
  };

  Object.defineProperty(Component, "name", {
    configurable: true,
    enumerable: false,
    value: name,
    writable: false,
  });
  Component.displayName = nameWithoutPrefix;
  Object.assign(Component, RealComponent);
  if (instanceMethods) Object.assign(Component.prototype, instanceMethods);
  return Component;
};

export const createScrollViewMock = () => {
  const BaseComponent = createComponentMock("react-native/Libraries/Components/ScrollView/ScrollView", {
    ...nativeMethods,
    flashScrollIndicators: jest.fn(),
    getInnerViewNode: jest.fn(),
    getInnerViewRef: jest.fn(),
    getNativeScrollRef: jest.fn(),
    getScrollResponder: jest.fn(),
    getScrollableNode: jest.fn(),
    scrollResponderScrollNativeHandleToKeyboard: jest.fn(),
    scrollResponderZoomTo: jest.fn(),
    scrollTo: jest.fn(),
    scrollToEnd: jest.fn(),
  });

  return class ScrollViewMock extends BaseComponent {
    declare props: any;

    render() {
      return React.createElement(
        "RCTScrollView",
        this.props,
        this.props.refreshControl,
        React.createElement("View", null, this.props.children),
      );
    }
  };
};

export const createModalMock = () => {
  const BaseComponent = createComponentMock("react-native/Libraries/Modal/Modal", null);
  return class ModalMock extends BaseComponent {
    declare props: any;

    render() {
      return this.props.visible === false ? null : React.createElement(BaseComponent, this.props, this.props.children);
    }
  };
};

export const createRefreshControlMock = () => {
  return class RefreshControlMock extends React.Component<any> {
    static latestRef: unknown;

    componentDidMount() {
      RefreshControlMock.latestRef = this;
    }

    render() {
      return React.createElement("RCTRefreshControl");
    }
  };
};
