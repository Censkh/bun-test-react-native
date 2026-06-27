import { Text } from "react-native";
import Pressable from "src/components/common/Pressable/Pressable";

export default function Button({
  label,
  onPress,
}: {
  color?: string;
  label?: string;
  onPress?: () => void;
  size?: string;
  variant?: string;
}) {
  return (
    <Pressable onPress={onPress}>
      <Text>{label}</Text>
    </Pressable>
  );
}
