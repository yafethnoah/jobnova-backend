import { Redirect, Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/src/features/auth/useAuth';
import { LoadingView } from '@/src/components/ui/LoadingView';
import { colors } from '@/src/constants/colors';

const HIDDEN_ROUTES = [
  'edit-profile',
  'profile',
  'profile/linkedin',
  'subscriptions',
  'resume/rewrite',
  'resume/ats-check',
  'resume/ats-result',
  'resume/job-ready',
  'resume/design-studio',
  'resume/export-center',
  'resume/export-center-v7',
  'resume/export-library',
  'interview/live',
  'interview/live-lobby',
  'interview/live-session',
  'interview/live-report',
  'interview/session',
  'interview/feedback',
  'interview/feedback-v7',
  'tracker/add-application',
  'tracker/edit-application',
  'tracker/[id]',
  'jobs/index',
  'jobs/[id]',
  'applications/index',
  'applications/package-review',
  'applications/apply-dashboard',
  'resources'
] as const;

export default function AppTabsLayout() {
  const { status, onboardingCompleted } = useAuth();

  if (status === 'loading') return <LoadingView label="Loading your workspace..." />;
  if (status === 'signed_out') return <Redirect href="/(public)/welcome" />;
  if (!onboardingCompleted) return <Redirect href="/(onboarding)/step-1-life-stage" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subtle,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 66,
          paddingTop: 6,
          paddingBottom: 8
        },
        tabBarItemStyle: { paddingVertical: 2 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: colors.bg }
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="career-path" options={{ title: 'Path', tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="resume/index" options={{ title: 'Resume', tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="interview/index" options={{ title: 'Coach', tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="tracker/index" options={{ title: 'Tracker', tabBarIcon: ({ color, size }) => <Ionicons name="briefcase-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Account', tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} /> }} />
      {HIDDEN_ROUTES.map((name) => <Tabs.Screen key={name} name={name} options={{ href: null }} />)}
    </Tabs>
  );
}
