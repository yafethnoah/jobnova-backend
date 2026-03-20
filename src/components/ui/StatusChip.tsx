import { Text, View } from "react-native";
import { colors } from "@/src/constants/colors";

const toneMap = {
  neutral: { bg: colors.surfaceElevated, border: colors.border, text: colors.muted },
  success: { bg: "rgba(52,211,153,0.14)", border: colors.success, text: colors.success },
  warning: { bg: "rgba(251,191,36,0.14)", border: colors.warning, text: colors.warning },
  danger: { bg: "rgba(248,113,113,0.14)", border: colors.danger, text: colors.danger },
  primary: { bg: "rgba(46,164,255,0.14)", border: colors.primary, text: colors.primary }
} as const;

export function StatusChip({ label, tone = "neutral" }: { label: string; tone?: keyof typeof toneMap }) {
  const palette = toneMap[tone] ?? toneMap.neutral;
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.bg,
        alignSelf: "flex-start"
      }}
    >
      <Text style={{ color: palette.text, fontSize: 12, fontWeight: "800" }}>{label}</Text>
    </View>
  );
}
