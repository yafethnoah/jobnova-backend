import { Text, TextProps } from "react-native";
import { colors } from "@/src/constants/colors";

type Variant = "title" | "subtitle" | "body" | "label";

type AppTextProps = TextProps & { variant?: Variant; children: React.ReactNode; };

export function AppText({ variant = "body", style, children, ...rest }: AppTextProps) {
  const stylesByVariant = {
    title: { fontSize: 30, fontWeight: "800" as const, color: colors.text },
    subtitle: { fontSize: 18, fontWeight: "700" as const, color: colors.text },
    body: { fontSize: 16, lineHeight: 24, color: colors.muted },
    label: { fontSize: 14, fontWeight: "600" as const, color: colors.muted }
  };
  return <Text style={[stylesByVariant[variant], style]} {...rest}>{children}</Text>;
}
