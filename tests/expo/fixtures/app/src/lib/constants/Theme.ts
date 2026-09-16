export const useThemeVariable = (names: string[]) =>
  names.map((name) => {
    if (name.includes("color") || name.includes("background") || name.includes("border")) {
      return "#000000";
    }
    return "System";
  });
