import { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/src/constants/colors";

export function StickyActionBar({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: 12,
        paddingBottom: Math.max(insets.bottom + 12, 20),
        paddingHorizontal: 20,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.surfaceElevated
      }}
    >
      {children}
    </View>
  );
}
