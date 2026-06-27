import { useRouter, useSegments } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useEffect } from "react";
import { Platform, View } from "react-native";
import Icon, { resolveIconData } from "src/components/common/Icon/Icon";
import { usePaginatedProjectList } from "src/lib/hooks/ProjectHooks";
import { useBrandColors } from "src/lib/hooks/ThemeHooks";

export default function TabLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { empty: noProjects, isLoading } = usePaginatedProjectList({});
  const brandColors = Object.values(useBrandColors());

  useEffect(() => {
    if (noProjects) return;
    const lastSegment = segments[segments.length - 1] as string;
    if (lastSegment === "index") {
      router.replace("/(tabs)/create");
    }
  }, [segments, router, isLoading, noProjects]);

  return (
    <View className="flex-1">
      <NativeTabs
        backgroundColor="rgba(0,0,0,0.5)"
        rippleColor="rgba(255,255,255,0.2)"
        tintColor={brandColors[0]}
      >
        <NativeTabs.Trigger name="index" hidden={noProjects}>
          <NativeTabs.Trigger.Icon
            sf={resolveIconData("gallery-tab").sfSymbol}
            md={resolveIconData("gallery-tab").androidMd}
            selectedColor={brandColors[0]}
            src={Platform.OS === "web" ? <Icon name="gallery-tab" /> : undefined}
          />
          <NativeTabs.Trigger.Label selectedStyle={{ color: brandColors[0] }}>
            Gallery
          </NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="create">
          <NativeTabs.Trigger.Icon
            sf={resolveIconData("create-tab").sfSymbol}
            md={resolveIconData("create-tab").androidMd}
            selectedColor={brandColors[1]}
            src={Platform.OS === "web" ? <Icon name="create-tab" /> : undefined}
          />
          <NativeTabs.Trigger.Label selectedStyle={{ color: brandColors[1] }}>
            Create
          </NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </View>
  );
}
