import { Text, View } from "react-native";
import { colors } from "@/src/constants/colors";

export function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 30, fontWeight: "800", color: colors.text }}>{title}</Text>
      {subtitle ? <Text style={{ fontSize: 16, lineHeight: 24, color: colors.muted }}>{subtitle}</Text> : null}
    </View>
  );
}
