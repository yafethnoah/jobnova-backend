import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/src/constants/colors";

export function LoadingView({ label = "Loading..." }: { label?: string }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>{label}</Text>
      </View>
    </SafeAreaView>
  );
}
