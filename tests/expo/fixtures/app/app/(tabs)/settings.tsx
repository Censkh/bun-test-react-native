import { Pressable, View } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import { toast } from "src/components/app/Toasts";
import AnimatedGradientBackground from "src/components/common/AnimatedGradientBackground/AnimatedGradientBackground";
import Text from "src/components/common/Text/Text";

export default function SettingsScreen() {
  void Gesture;
  return (
    <AnimatedGradientBackground>
      <Pressable onPress={() => toast.success("Dev Mode Enabled")}>
        <View>
          <Text>settings</Text>
        </View>
      </Pressable>
    </AnimatedGradientBackground>
  );
}
