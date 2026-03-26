import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthContext } from "@/src/features/auth/AuthProvider";

export default function AppLayout() {
  const { status } = useAuthContext();

  if (status === "loading") {
    return null;
  }

  if (status !== "signed_in") {
    return <Redirect href="/(public)/welcome" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#4F46E5",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarShowLabel: true,
        tabBarStyle: {
          height: 72,
          paddingTop: 8,
          paddingBottom: 10,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E2E8F0",
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          href: "/(app)/home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="career-path"
        options={{
          title: "Path",
          href: "/(app)/career-path",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="resume/index"
        options={{
          title: "Resume",
          href: "/(app)/resume",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="tracker/index"
        options={{
          title: "Tracker",
          href: "/(app)/tracker",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          href: "/(app)/profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen name="resources" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="subscriptions" options={{ href: null }} />
      <Tabs.Screen name="applications/index" options={{ href: null }} />
      <Tabs.Screen name="career-coach" options={{ href: null }} />
      <Tabs.Screen name="growth/index" options={{ href: null }} />
      <Tabs.Screen name="interview/index" options={{ href: null }} />
      <Tabs.Screen name="jobs/index" options={{ href: null }} />
    </Tabs>
  );
}