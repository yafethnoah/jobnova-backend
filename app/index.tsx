import { Redirect } from 'expo-router';
import { Text, View } from 'react-native';

import { useAuth } from '@/src/features/auth/useAuth';

function BareLoadingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#08111F', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#F8FAFF', fontSize: 16, fontWeight: '600' }}>Loading JobNova...</Text>
    </View>
  );
}

export default function IndexScreen() {
  const { status, onboardingCompleted } = useAuth();

  if (status === 'loading') {
    return <BareLoadingScreen />;
  }

  if (status === 'signed_out') {
    return <Redirect href="/(public)/welcome" />;
  }

  if (!onboardingCompleted) {
    return <Redirect href="/(onboarding)/step-1-life-stage" />;
  }

  return <Redirect href="/(app)/home" />;
}
