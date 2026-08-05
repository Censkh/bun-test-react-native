import { jest } from "bun:test";
import { projectRequire } from "../ProjectRequire";
import { expoModuleMocks } from "./ExpoModuleMocks";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const mergeDefinitions = (target: Record<string, unknown>, source: Record<string, unknown>) => {
  for (const [key, value] of Object.entries(source)) {
    const existing = target[key];
    target[key] = isPlainObject(existing) && isPlainObject(value) ? mergeDefinitions({ ...existing }, value) : value;
  }
  return target;
};

let presetDefinitions: Record<string, unknown> | null | undefined;

const getPresetDefinitions = () => {
  if (presetDefinitions !== undefined) return presetDefinitions;
  try {
    presetDefinitions = mergeDefinitions(
      mergeDefinitions(
        projectRequire("jest-expo/src/preset/moduleMocks/expoModules"),
        projectRequire("jest-expo/src/preset/moduleMocks/thirdPartyModules"),
      ),
      projectRequire("jest-expo/src/preset/moduleMocks/internalExpoModules"),
    );
  } catch {
    presetDefinitions = null;
  }
  return presetDefinitions;
};

const mockProperty = (property: any) => {
  if (property.type === "function") {
    return property.functionType === "promise" ? jest.fn(() => Promise.resolve()) : jest.fn();
  }
  if (property.type === "number") return 1;
  if (property.type === "string") return "mock";
  if (property.type === "array") return [];
  if (property.type === "mock") return mockProperties(property.mockDefinition);
  return property.mock ?? {};
};

const mockProperties = (properties: Record<string, any>) =>
  Object.fromEntries(Object.entries(properties).map(([name, property]) => [name, mockProperty(property)]));

const moduleMocks = new Map<string, unknown>();
const explicitModuleMocks = {
  ExpoModulesCoreJSLogger: {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  },
};

export const getExpoModuleMock = (moduleName: string) => {
  if (moduleMocks.has(moduleName)) return moduleMocks.get(moduleName);
  const explicitModuleMock = explicitModuleMocks[moduleName as keyof typeof explicitModuleMocks];
  if (explicitModuleMock) return explicitModuleMock;
  const definitions = getPresetDefinitions();
  if (!definitions) return expoModuleMocks[moduleName as keyof typeof expoModuleMocks];
  const definition = definitions[moduleName] as Record<string, any> | undefined;
  if (!definition) return undefined;
  const moduleMock = mockProperties(definition);
  moduleMocks.set(moduleName, moduleMock);
  return moduleMock;
};
