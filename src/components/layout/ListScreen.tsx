import { ReactNode } from "react";
import { FlatList, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenHeader } from "@/src/components/layout/ScreenHeader";
import { colors } from "@/src/constants/colors";

export function ListScreen<T>({
  title,
  subtitle,
  data,
  keyExtractor,
  renderItem,
  filters,
  onRefresh,
  refreshing,
  emptyState
}: {
  title: string;
  subtitle?: string;
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: ({ item }: { item: T }) => React.ReactElement;
  filters?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  emptyState?: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "left", "right"]}>
      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onRefresh={onRefresh}
        refreshing={refreshing}
        contentContainerStyle={{ padding: 20, paddingBottom: Math.max(120, insets.bottom + 112), gap: 12 }}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 6 }}>
            <ScreenHeader title={title} subtitle={subtitle} />
            {filters}
          </View>
        }
        ListEmptyComponent={emptyState ? (() => <>{emptyState}</>) : null}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
