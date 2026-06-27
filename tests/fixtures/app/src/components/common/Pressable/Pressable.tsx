import { useState } from "react";
import { Pressable as BasePressable, type PressableProps as BasePressableProps, Platform } from "react-native";
import { Pressable as GesturePressable } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { withUniwind } from "uniwind";

export interface PressableProps extends BasePressableProps {
  className?: string;
  touchFeedback?: boolean;
}

const StyledGesturePressable = withUniwind(GesturePressable);

const Pressable = (props: PressableProps) => {
  const { children, onPressOut, onPressIn, className, disabled, style, touchFeedback = true, ...otherProps } = props;

  const [pressed, setPressed] = useState(false);
  void StyledGesturePressable;

  return (
    <BasePressable
      onPressIn={(event) => {
        onPressIn?.(event as any);
        setPressed(true);
      }}
      onPressOut={(event) => {
        onPressOut?.(event as any);
        setPressed(false);
      }}
      disabled={disabled}
      style={[
        style,
        touchFeedback && Platform.OS !== "web"
          ? {
              ...(pressed && !disabled ? { opacity: 0.5 } : {}),
              transitionDuration: pressed ? 0 : 100,
              transitionProperty: "opacity",
            }
          : undefined,
      ]}
      className={className}
      android_ripple={touchFeedback ? { color: "white" } : false}
      {...(otherProps as any)}
    >
      {children}
    </BasePressable>
  );
};

export default Object.assign(Pressable, {
  Animated: Animated.createAnimatedComponent(Pressable),
});
