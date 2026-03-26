import { Text, View } from "react-native";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppCard } from "@/src/components/ui/AppCard";
import { colors } from "@/src/constants/colors";

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction
}: {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <AppCard>
      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.text, fontWeight: "800", fontSize: 16 }}>{title}</Text>
        {message ? <Text style={{ color: colors.muted, lineHeight: 22 }}>{message}</Text> : null}
        {actionLabel && onAction ? (
          <View style={{ marginTop: 4, alignSelf: "flex-start" }}>
            <AppButton label={actionLabel} variant="secondary" onPress={onAction} />
          </View>
        ) : null}
      </View>
    </AppCard>
  );
}
