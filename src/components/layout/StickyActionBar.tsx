import { ReactNode } from "react";
import { View } from "react-native";
import { colors } from "@/src/constants/colors";

export function StickyActionBar({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        paddingTop: 12,
        paddingBottom: 8,
        paddingHorizontal: 20,
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        backgroundColor: colors.surface
      }}
    >
      {children}
    </View>
  );
}