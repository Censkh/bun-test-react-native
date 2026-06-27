import { useCallback } from "react";

export const useEvent = <T extends (...args: any[]) => any>(callback: T) =>
  useCallback(callback, [callback]);
