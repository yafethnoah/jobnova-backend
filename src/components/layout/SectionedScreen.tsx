import { ReactNode, useMemo } from "react";
import { SectionList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/src/components/layout/ScreenHeader";
import { StickyActionBar } from "@/src/components/layout/StickyActionBar";
import { SectionNavigator } from "@/src/components/navigation/SectionNavigator";
import { useSectionNavigator } from "@/src/hooks/useSectionNavigator";
import { colors } from "@/src/constants/colors";

export type SectionItem = {
  key: string;
  label: string;
  content: ReactNode;
};

export function SectionedScreen({
  title,
  subtitle,
  summary,
  sections,
  stickyAction
}: {
  title: string;
  subtitle?: string;
  summary?: ReactNode;
  sections: SectionItem[];
  stickyAction?: ReactNode;
}) {
  const { activeKey, onSelect, onViewableItemsChanged, sectionListRef } = useSectionNavigator(sections);
  const data = useMemo(
    () => sections.map((section) => ({ title: section.label, key: section.key, data: [section] })),
    [sections]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "left", "right"]}>
      <View style={{ flex: 1 }}>
        <View style={{ padding: 20, paddingBottom: 8, gap: 14 }}>
          <ScreenHeader title={title} subtitle={subtitle} />
          {summary}
        </View>
        <SectionNavigator
          sections={sections.map(({ key, label }) => ({ key, label }))}
          activeKey={activeKey}
          onSelect={(key) => onSelect(key)}
        />
        <SectionList
          ref={sectionListRef}
          sections={data}
          keyExtractor={(item) => item.key}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          renderSectionHeader={({ section }) => (
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#0F172A", marginTop: 14, marginBottom: 10 }}>
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 18,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border
              }}
            >
              {item.content}
            </View>
          )}
        />
        {stickyAction ? <StickyActionBar>{stickyAction}</StickyActionBar> : null}
      </View>
    </SafeAreaView>
  );
}