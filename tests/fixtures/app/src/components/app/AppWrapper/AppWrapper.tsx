import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { type PropsWithChildren, useEffect, useMemo } from "react";
import { View } from "react-native";
import Text from "src/components/common/Text/Text";
import { useThemeVariable } from "src/lib/constants/Theme";
import { queryClient } from "src/lib/queryClient";
import { MmkvStorage } from "src/lib/storage/mmkvStorage";

export default function AppWrapper({ children }: PropsWithChildren) {
  const [fontText] = useThemeVariable(["fonts.text"]);
  const persister = useMemo(
    () =>
      createSyncStoragePersister({
        storage: MmkvStorage as any,
      }),
    [],
  );

  useEffect(() => {
    persistQueryClient({
      persister,
      queryClient,
    });
  }, [persister]);

  return (
    <QueryClientProvider client={queryClient}>
      <Text.CascadingStylesProvider className="text-text" style={{ fontFamily: fontText }}>
        <View className="flex-1">{children}</View>
      </Text.CascadingStylesProvider>
    </QueryClientProvider>
  );
}
