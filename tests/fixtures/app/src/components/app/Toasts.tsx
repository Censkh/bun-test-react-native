import {
  type ToastOptions as BaseToastOptions,
  toast as originalToast,
  ToastPosition,
  Toasts,
} from "@backpackapp-io/react-native-toast";
import { View } from "react-native";
import { FullWindowOverlay } from "react-native-screens";
import Button from "src/components/common/Button/Button";
import Icon from "src/components/common/Icon/Icon";
import Text from "src/components/common/Text/Text";
import { useThemeVariable } from "src/lib/constants/Theme";

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export type ToastOptions = BaseToastOptions & {
  actions?: ToastAction[];
};

const ToastMessage = ({ message, actions }: { message: string; actions?: ToastAction[] }) => {
  const [fontTextMedium] = useThemeVariable(["fonts.headerMedium"]);

  return (
    <View className="w-full gap-gap pr-4">
      <View className="flex-row items-center gap-gap">
        <Text
          style={{
            color: "#FFFFFF",
            flex: 1,
            fontFamily: fontTextMedium,
            fontSize: 16,
            fontWeight: "600",
          }}
        >
          {message}
        </Text>
      </View>
      {actions && actions.length > 0 && (
        <View className="flex-row justify-start gap-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              label={action.label}
              onPress={action.onPress}
              size="small"
              variant="outline"
              color="secondary"
            />
          ))}
        </View>
      )}
    </View>
  );
};

const createToastMessageComponent = (message: string, options?: ToastOptions) => (
  <ToastMessage message={message} actions={options?.actions} />
);

export const toast = {
  ...originalToast,
  success: (message: string, options?: ToastOptions) =>
    originalToast.success(createToastMessageComponent(message, options), {
      ...options,
      icon: <Icon name="success" size={24} color="success" />,
    }),
  error: (message: string, options?: ToastOptions) =>
    originalToast.error(createToastMessageComponent(message, options), {
      ...options,
      icon: <Icon name="error" size={24} color="danger" />,
    }),
  info: (message: string, options?: ToastOptions) =>
    originalToast.success(createToastMessageComponent(message, options), {
      ...options,
      icon: <Icon name="info" size={24} color="info" />,
    }),
};

export default function GlobalToasts() {
  const [colorBackground, colorBorder, fontTextMedium] = useThemeVariable([
    "colors.cardBackground",
    "colors.border",
    "fonts.headerMedium",
  ]);

  return (
    <FullWindowOverlay>
      <Toasts
        defaultPosition={ToastPosition.BOTTOM}
        globalAnimationType="spring"
        defaultDuration={8000}
        defaultStyle={{
          indicator: {
            display: "none",
          },
          pressable: {
            backgroundColor: colorBackground,
            borderColor: colorBorder,
            borderRadius: 64,
            borderWidth: 1,
          },
          text: {
            color: "#FFFFFF",
            fontFamily: fontTextMedium,
            fontSize: 16,
            fontWeight: "600",
          },
          view: {
            gap: 12,
            paddingHorizontal: 20,
            paddingVertical: 16,
          },
        }}
      />
    </FullWindowOverlay>
  );
}
