export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    return new URL(path).hostname === "expo-sharing" ? "/create?share=1" : path;
  } catch {
    return path;
  }
}
