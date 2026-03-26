import { Redirect, Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/src/features/auth/useAuth';
import { LoadingView } from '@/src/components/ui/LoadingView';
import { colors } from '@/src/constants/colors';

const HIDDEN_ROUTES = [
  'edit-profile',
  'profile',
  'profile/linkedin',
  'settings',
  'subscriptions',
  'resume/rewrite',
  'resume/ats-check',
  'resume/ats-result',
  'resume/job-ready',
  'resume/design-studio',
  'resume/export-center',
  'resume/export-library',
  'resume/export-center-v7',
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
  'resources',
  'career-coach',
  'growth/index',
  'growth/first-90',
  'growth/financial-wellness'
] as const;

export default function AppTabsLayout() {
  const { status, onboardingCompleted } = useAuth();
  const insets = useSafeAreaInsets();

  if (status === 'loading') {
    return <LoadingView label="Loading your workspace..." />;
  }

  if (status === 'signed_out') {
    return <Redirect href="/(public)/welcome" />;
  }

  if (!onboardingCompleted) {
    return <Redirect href="/(onboarding)/step-1-life-stage" />;
  }

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 10 : 8);
  const tabBarHeight = 62 + bottomInset;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryText,
        tabBarInactiveTintColor: colors.subtle,
        tabBarHideOnKeyboard: true,
        sceneStyle: {
          backgroundColor: colors.bg
        },
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: tabBarHeight,
          paddingTop: 8,
          paddingBottom: bottomInset,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          shadowOpacity: 0
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700'
        },
        tabBarBackground: () => <View style={{ flex: 1, backgroundColor: colors.surface }} />
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="career-path"
        options={{
          title: 'Path',
          tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="resume/index"
        options={{
          title: 'Resume',
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="tracker/index"
        options={{
          title: 'Tracker',
          tabBarIcon: ({ color, size }) => <Ionicons name="briefcase-outline" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="interview/index"
        options={{
          title: 'Practice',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses-outline" color={color} size={size} />
        }}
      />

      {HIDDEN_ROUTES.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
