import type { ReactNativeResolverOptions } from "../platformResolver";

export type JavaScriptLoader = "js" | "jsx" | "ts" | "tsx";

export type TranspileTransformId =
  | "flow"
  | "typescript"
  | "commonjs-exports"
  | "rewrite-extensionless-specifiers";

export type ReactNativeTransformation = TranspileTransformId;

export type TranspileTransformContext = {
  filePath: string;
  loader: JavaScriptLoader;
  resolverOptions?: ReactNativeResolverOptions;
  source: string;
};

export type TranspileTransform = {
  id: TranspileTransformId;
  predicate: (context: TranspileTransformContext) => boolean;
};

export type TranspileOptions = {
  filename: string;
  resolverOptions?: ReactNativeResolverOptions;
  transforms: readonly TranspileTransformId[];
};

export type TranspileBackend = {
  name: "swc";
  transform: (source: string, options: TranspileOptions) => string;
};
