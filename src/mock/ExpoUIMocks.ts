import { jest } from "bun:test";
import { createRequire } from "node:module";
import path from "node:path";

const cwdRequire = createRequire(path.join(process.cwd(), "__bun_test_react_native__.js"));

const textPropsByViewName: Record<string, string[]> = {
  Button: ["label"],
  ContentUnavailable: ["title", "description"],
  Label: ["title"],
  SyncToggle: ["label"],
  Text: ["text"],
  TextField: ["text", "placeholder"],
};

const reactNodePropsByViewName: Record<string, string[]> = {
  ListItem: ["headlineContent", "overlineContent", "supportingContent"],
};

const textFromSpan = (span: unknown): string[] => {
  if (!span || typeof span !== "object") return [];
  const record = span as { children?: unknown[]; text?: unknown };
  return [
    ...(typeof record.text === "string" ? [record.text] : []),
    ...(Array.isArray(record.children) ? record.children.flatMap(textFromSpan) : []),
  ];
};

export const createExpoUIViewMock = (displayName: string) => {
  const React = cwdRequire("react");
  const { Text } = cwdRequire("react-native");
  const viewName = displayName.replace(/^ViewManagerAdapter_ExpoUI_/, "").replace(/View$/, "");
  const textPropNames = textPropsByViewName[viewName] ?? [];
  const reactNodePropNames = reactNodePropsByViewName[viewName] ?? [];

  const component = ({ children, ...props }) =>
    React.createElement(
      React.Fragment,
      null,
      React.createElement(displayName, props, children),
      ...textPropNames
        .map((propName) => props[propName])
        .filter((value) => typeof value === "string")
        .map((value) => React.createElement(Text, { key: String(value) }, value)),
      ...(Array.isArray(props.spans) ? props.spans.flatMap(textFromSpan) : []).map((value) =>
        React.createElement(Text, { key: value }, value),
      ),
      ...reactNodePropNames.map((propName) => props[propName]).filter((value) => React.isValidElement(value)),
    );

  Object.defineProperty(component, "displayName", {
    configurable: true,
    value: displayName,
  });
  return component;
};

export const getExpoUINativeModule = () => ({
  ViewPrototypes: {},
  SwitchDefaultIconSize: 24,
  ObservableState: class ObservableState {
    _value: unknown;
    _onChange: ((value: unknown) => void) | null = null;

    constructor({ value }: { value: unknown }) {
      this._value = value;
    }

    getValue() {
      return this._value;
    }

    setOnChange(callback: ((value: unknown) => void) | null) {
      this._onChange = callback;
    }

    setValue({ value }: { value: unknown }) {
      this._value = value;
      this._onChange?.(value);
    }
  },
  WorkletCallback: class WorkletCallback {
    callback: unknown;

    constructor(callback: unknown) {
      this.callback = callback;
    }
  },
  completeRefresh: jest.fn(async () => {}),
  getMaterialColors: jest.fn(() => ({})),
  isDynamicColorAvailable: false,
});
