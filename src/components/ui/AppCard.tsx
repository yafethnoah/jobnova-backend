import { View } from "react-native";

import { colors } from "@/src/constants/colors";
import { radii } from "@/src/constants/radii";

type AppCardProps = {
  children: React.ReactNode;
  style?: any;
};

export function AppCard({ children, style }: AppCardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: "rgba(17, 28, 51, 0.72)",
          borderRadius: radii.lg,
          padding: 16,
          borderWidth: 1,
          borderColor: "rgba(175, 192, 255, 0.14)",
          shadowColor: "#020617",
          shadowOpacity: 0.28,
          shadowRadius: 22,
          shadowOffset: { width: 0, height: 14 },
          elevation: 8,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -40,
          right: -10,
          width: 150,
          height: 110,
          borderRadius: 999,
          backgroundColor: "rgba(143, 161, 204, 0.08)",
          transform: [{ rotate: "-14deg" }],
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          bottom: -44,
          left: -18,
          width: 120,
          height: 82,
          borderRadius: 999,
          backgroundColor: "rgba(111, 134, 255, 0.1)",
        }}
      />
      {children}
    </View>
  );
}
