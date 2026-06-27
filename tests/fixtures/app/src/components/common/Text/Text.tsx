import type { PropsWithChildren } from "react";
import { Text as NativeText, type TextProps } from "react-native";

type CascadingStylesProviderProps = PropsWithChildren<{
  className?: string;
  style?: TextProps["style"];
}>;

function Text(props: TextProps) {
  return <NativeText {...props} />;
}

Text.CascadingStylesProvider = function CascadingStylesProvider({ children }: CascadingStylesProviderProps) {
  return <>{children}</>;
};

export default Text;
