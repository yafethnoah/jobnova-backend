import { View, Text } from "react-native";

export function ScreenHeader({ title, subtitle }: { title?: string; subtitle?: string }) {
  if (!title && !subtitle) return null;
  return (
    <View style={{ gap: 6, marginBottom: 16 }}>
      {title ? (
        <Text style={{ fontSize: 28, fontWeight: "800", color: "#0F172A" }}>{title}</Text>
      ) : null}
      {subtitle ? (
        <Text style={{ fontSize: 15, lineHeight: 22, color: "#475569" }}>{subtitle}</Text>
      ) : null}
    </View>
  );
}
