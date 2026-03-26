import { Stack } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { AuthProvider, useAuthContext } from "@/src/features/auth/AuthProvider";

function RootNavigator() {
  const { status } = useAuthContext();

  if (status === "loading") {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}