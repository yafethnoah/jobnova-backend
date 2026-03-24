import { Text, View } from "react-native";
import { colors } from "@/src/constants/colors";
import { AppCard } from "@/src/components/ui/AppCard";

export function ErrorState({ title, message }: { title: string; message?: string }) {
  return (
    <AppCard>
      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.danger, fontWeight: "800", fontSize: 16 }}>{title}</Text>
        {message ? <Text style={{ color: colors.muted, lineHeight: 22 }}>{message}</Text> : null}
      </View>
    </AppCard>
  );
}
