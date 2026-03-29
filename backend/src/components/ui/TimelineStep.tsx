import { Text, View } from "react-native";
import { colors } from "@/src/constants/colors";
import { StatusChip } from "@/src/components/ui/StatusChip";

export type TimelineStepItem = {
  title: string;
  subtitle?: string;
  status: "done" | "active" | "pending";
};

function toneForStatus(status: TimelineStepItem["status"]) {
  if (status === "done") return "success" as const;
  if (status === "active") return "primary" as const;
  return "neutral" as const;
}

export function TimelineStep({ item, isLast = false }: { item: TimelineStepItem; isLast?: boolean }) {
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <View style={{ alignItems: "center" }}>
        <View
          style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            marginTop: 4,
            backgroundColor: item.status === "done" ? colors.success : item.status === "active" ? colors.primary : colors.border
          }}
        />
        {!isLast ? <View style={{ width: 2, flex: 1, minHeight: 24, marginTop: 6, backgroundColor: colors.border }} /> : null}
      </View>
      <View style={{ flex: 1, paddingBottom: isLast ? 0 : 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800", flex: 1 }}>{item.title}</Text>
          <StatusChip label={item.status === "done" ? "done" : item.status === "active" ? "current" : "next"} tone={toneForStatus(item.status)} />
        </View>
        {item.subtitle ? <Text style={{ marginTop: 6, color: colors.muted, lineHeight: 20 }}>{item.subtitle}</Text> : null}
      </View>
    </View>
  );
}
