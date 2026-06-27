import { Text } from "react-native";

export default function Icon({ name }: { color?: string; name: string; size?: number }) {
  return <Text>{name}</Text>;
}

export const resolveIconData = (_name: string) => ({
  androidMd: "add",
  sfSymbol: "plus",
});
