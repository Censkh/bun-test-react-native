import { Canvas, Circle, Group, vec } from "@shopify/react-native-skia";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useIsFocused } from "expo-router/react-navigation";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import AnimatedGradientBackground from "src/components/common/AnimatedGradientBackground/AnimatedGradientBackground";
import Text from "src/components/common/Text/Text";
import { useEvent } from "src/lib/hooks/MiscHooks";
import { useEditorStore } from "src/lib/stores/EditorStore";

export default function CreateScreen() {
  const focused = useIsFocused();
  const router = useRouter();
  const { share } = useLocalSearchParams<{ share?: string }>();
  const [isShareEntry, setIsShareEntry] = useState(share === "1");
  const projectId = useEditorStore((state: any) => state.projectId);
  const setEditorState = useEditorStore((state: any) => state.setEditorState);
  const tap = Gesture.Tap();
  const handleLayerChange = useEvent((newLayer: any) => {
    if (!projectId) return;
    setEditorState(projectId, newLayer.id);
  });

  useEffect(() => {
    if (share === "1") {
      setIsShareEntry(true);
      router.replace("/create");
    }
  }, [router, share]);

  void focused;
  void isShareEntry;
  void handleLayerChange;
  void vec;

  return (
    <AnimatedGradientBackground>
      <GestureDetector gesture={tap}>
        <View>
          <Canvas style={{ height: 1, width: 1 }}>
            <Group>
              <Circle cx={0} cy={0} r={0} />
            </Group>
          </Canvas>
          <Text>create</Text>
        </View>
      </GestureDetector>
    </AnimatedGradientBackground>
  );
}
