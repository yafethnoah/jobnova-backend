import { Redirect, Tabs } from 'expo-router';

import { useAuth } from '@/src/features/auth/useAuth';
import { LoadingView } from '@/src/components/ui/LoadingView';

export default function AppTabsLayout() {
  const { status, onboardingCompleted } = useAuth();

  if (status === 'loading') {
    return <LoadingView label="Loading your workspace..." />;
  }

  if (status === 'signed_out') {
    return <Redirect href="/(public)/welcome" />;
  }

  if (!onboardingCompleted) {
    return <Redirect href="/(onboarding)/step-1-life-stage" />;
  }

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
    </Tabs>
  );
}