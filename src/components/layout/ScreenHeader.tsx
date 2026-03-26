import { View, Text } from "react-native";
import { colors } from "@/src/constants/colors";

export function ScreenHeader({ title, subtitle }: { title?: string; subtitle?: string }) {
  if (!title && !subtitle) return null;
  return (
    <View style={{ gap: 6, marginBottom: 16 }}>
      {title ? (
        <Text style={{ fontSize: 28, fontWeight: "800", color: colors.white }}>{title}</Text>
      ) : null}
      {subtitle ? (
        <Text style={{ fontSize: 15, lineHeight: 22, color: colors.muted }}>{subtitle}</Text>
      ) : null}
    </View>
  );
}
