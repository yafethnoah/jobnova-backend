import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect } from "react";
import { AuthProvider } from "@/src/features/auth/AuthProvider";
import { ToastProvider } from "@/src/features/feedback/ToastProvider";
import { initializeAds } from "@/src/lib/ads";
import { assertRuntimeEnv, env } from "@/src/lib/env";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: 0
    }
  }
});

export default function RootLayout() {
  useEffect(() => {
    try {
      assertRuntimeEnv();
      if (env.adsEnabled) {
        void initializeAds();
      }
    } catch (error) {
      console.error("Startup configuration error:", error);
    }
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0A1124" } }} />
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
