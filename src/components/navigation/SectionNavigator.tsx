import { ScrollView, Pressable, Text } from "react-native";
import { colors } from "@/src/constants/colors";

export type SectionNavItem = { key: string; label: string };

export function SectionNavigator({
  sections,
  activeKey,
  onSelect
}: {
  sections: SectionNavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 10 }}
    >
      {sections.map((section) => {
        const active = section.key === activeKey;
        return (
          <Pressable
            key={section.key}
            onPress={() => onSelect(section.key)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 999,
              backgroundColor: active ? colors.primary : colors.surfaceElevated
            }}
          >
            <Text style={{ color: active ? colors.primaryText : colors.text, fontWeight: "700" }}>
              {section.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}