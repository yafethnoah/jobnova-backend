import { Text, View } from "react-native";
import { AppCard } from "@/src/components/ui/AppCard";
import { colors } from "@/src/constants/colors";

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <AppCard>
      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.text, fontWeight: "800", fontSize: 16 }}>{title}</Text>
        {message ? <Text style={{ color: colors.muted, lineHeight: 22 }}>{message}</Text> : null}
      </View>
    </AppCard>
  );
}
