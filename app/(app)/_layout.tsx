import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthContext } from "@/src/features/auth/AuthProvider";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

function TabBarIcon({
  name,
  color,
  size,
}: {
  name: IconName;
  color: string;
  size: number;
}) {
  return <Ionicons name={name} color={color} size={size} />;
}

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
        sceneStyle: {
          backgroundColor: "#08111F",
        },
        tabBarActiveTintColor: "#FFFFFF",
        tabBarInactiveTintColor: "#90A0C7",
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          position: "absolute",
          left: 12,
          right: 12,
          bottom: 12,
          height: 78,
          paddingTop: 8,
          paddingBottom: 10,
          backgroundColor: "#111C33",
          borderTopWidth: 1,
          borderTopColor: "#27385F",
          borderRadius: 22,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="home-outline" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="career-path"
        options={{
          title: "Path",
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="map-outline" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="resume/index"
        options={{
          title: "Resume",
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon
              name="document-text-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="interview/index"
        options={{
          title: "Interview",
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="mic-outline" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="tracker/index"
        options={{
          title: "Tracker",
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="briefcase-outline" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="person-outline" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen name="resources" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="subscriptions" options={{ href: null }} />
      <Tabs.Screen name="applications/index" options={{ href: null }} />
      <Tabs.Screen name="applications/apply-dashboard" options={{ href: null }} />
      <Tabs.Screen name="applications/package-review" options={{ href: null }} />
      <Tabs.Screen name="growth/index" options={{ href: null }} />
      <Tabs.Screen name="growth/first-90" options={{ href: null }} />
      <Tabs.Screen name="growth/financial-wellness" options={{ href: null }} />
      <Tabs.Screen name="interview/live" options={{ href: null }} />
      <Tabs.Screen name="interview/live-lobby" options={{ href: null }} />
      <Tabs.Screen name="interview/live-session" options={{ href: null }} />
      <Tabs.Screen name="interview/session" options={{ href: null }} />
      <Tabs.Screen name="interview/feedback" options={{ href: null }} />
      <Tabs.Screen name="interview/feedback-v7" options={{ href: null }} />
      <Tabs.Screen name="interview/live-report" options={{ href: null }} />
      <Tabs.Screen name="jobs/index" options={{ href: null }} />
      <Tabs.Screen name="jobs/[id]" options={{ href: null }} />
      <Tabs.Screen name="tracker/add-application" options={{ href: null }} />
      <Tabs.Screen name="tracker/edit-application" options={{ href: null }} />
      <Tabs.Screen name="tracker/[id]" options={{ href: null }} />
      <Tabs.Screen name="resume/ats-check" options={{ href: null }} />
      <Tabs.Screen name="resume/ats-result" options={{ href: null }} />
      <Tabs.Screen name="resume/design-studio" options={{ href: null }} />
      <Tabs.Screen name="resume/export-center" options={{ href: null }} />
      <Tabs.Screen name="resume/export-center-v7" options={{ href: null }} />
      <Tabs.Screen name="resume/export-library" options={{ href: null }} />
      <Tabs.Screen name="resume/job-ready" options={{ href: null }} />
      <Tabs.Screen name="resume/rewrite" options={{ href: null }} />
      <Tabs.Screen name="profile/linkedin" options={{ href: null }} />
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
      <Tabs.Screen name="career-coach" options={{ href: null }} />
    </Tabs>
  );
}
