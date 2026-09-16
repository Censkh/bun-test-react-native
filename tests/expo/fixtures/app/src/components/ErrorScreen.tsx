import type { PropsWithChildren } from "react";
import { View } from "react-native";
import Text from "src/components/common/Text/Text";

export default function ErrorScreen({
  children,
  message,
}: PropsWithChildren<{ message: string; onRetry: () => void; retryLabel: string }>) {
  return (
    <View>
      {children}
      <Text>{message}</Text>
    </View>
  );
}
