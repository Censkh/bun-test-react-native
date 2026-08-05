import { describe, expect, test } from "bun:test";
import { createNativeComponent } from "../src/mock/ReactNativeComponentMocks";

describe("React Native component replacements", () => {
  test("renders native host components with native instance methods", () => {
    const View: any = createNativeComponent("RCTView");
    const instance = new View({ accessibilityLabel: "example", children: "content" });
    const rendered = instance.render();

    expect(View.displayName).toBe("View");
    expect(rendered.type).toBe("RCTView");
    expect(rendered.props.accessibilityLabel).toBe("example");
    expect(rendered.props.children).toBe("content");
    expect(typeof instance.focus).toBe("function");
    expect(typeof instance.blur).toBe("function");
    expect(typeof instance.measure).toBe("function");
    expect(typeof instance.measureInWindow).toBe("function");
    expect(typeof instance.measureLayout).toBe("function");
    expect(typeof instance.setNativeProps).toBe("function");
  });

  test("assigns a distinct native tag to each component instance", () => {
    const View: any = createNativeComponent("RCTView");

    expect(new View({})._nativeTag).not.toBe(new View({})._nativeTag);
  });
});
