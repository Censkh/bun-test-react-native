import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react-native";
import { Text } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";

const AnimatedStyleProbe = () => {
  const opacity = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Text>Animated style probe</Text>
    </Animated.View>
  );
};

describe("react-native-reanimated useAnimatedStyle", () => {
  test("renders without requiring a dependency array or Babel plugin in Bun tests", async () => {
    const result = await render(<AnimatedStyleProbe />);

    expect(result.getByText("Animated style probe")).toBeTruthy();
  });
});
