import { swcBackend } from "./swcBackend";
import type { TranspileBackend } from "./types";

export type { TranspileBackend, TranspileOptions } from "./types";

export const getTranspileBackend = (): TranspileBackend => {
  return swcBackend;
};
