import { ScrollView, Text, View } from "react-native";
import { useProfile } from "@/src/hooks/useProfile";

export default function HomeScreen() {
  const { data, isLoading } = useProfile();

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        padding: 20,
        backgroundColor: "#F8FAFC",
      }}
    >
      <Text
        style={{
          fontSize: 28,
          fontWeight: "800",
          color: "#0F172A",
          marginBottom: 8,
        }}
      >
        Home
      </Text>

      <Text
        style={{
          fontSize: 16,
          color: "#475569",
          marginBottom: 20,
        }}
      >
        Welcome back.
      </Text>

      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          padding: 16,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: "#0F172A",
            marginBottom: 8,
          }}
        >
          Profile status
        </Text>

        <Text style={{ color: "#475569" }}>
          {isLoading
            ? "Loading..."
            : data?.fullName
              ? `Your dashboard is ready, ${data.fullName}.`
              : "Your dashboard is ready."}
        </Text>
      </View>
    </ScrollView>
  );
}