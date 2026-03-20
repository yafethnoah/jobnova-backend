import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { DailyEncouragement } from '@/src/components/ui/DailyEncouragement';

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#08111F' }}>
      <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 20 }}>
        <DailyEncouragement />

        <Text style={{ fontSize: 34, fontWeight: '800', color: '#F8FAFF' }}>
          JobNova
        </Text>

        <Text style={{ fontSize: 18, lineHeight: 28, color: '#B8C4E4' }}>
          A calmer, smarter way to move from job searching to job readiness.
        </Text>

        <AppCard>
          <Text style={{ fontSize: 16, lineHeight: 24, color: '#D7E2FF' }}>
            Career guidance, resume support, interview coaching, and job tracking — all in one place.
          </Text>
        </AppCard>

        <View style={{ gap: 12 }}>
          <AppButton label="Create account" onPress={() => router.push('/(public)/sign-up')} />
          <AppButton label="Sign in" variant="secondary" onPress={() => router.push('/(public)/sign-in')} />
        </View>
      </View>
    </SafeAreaView>
  );
}
