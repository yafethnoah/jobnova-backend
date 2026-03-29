import { Text, View } from 'react-native';
import { router } from 'expo-router';

import { useProfile } from '@/src/hooks/useProfile';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { StatusChip } from '@/src/components/ui/StatusChip';
import { colors } from '@/src/constants/colors';

function MetricCard({ label, value, tone }: { label: string; value: string; tone: 'success' | 'primary' | 'warning' | 'neutral' }) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 150,
        backgroundColor: '#172644',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#27385F',
        gap: 6,
      }}
    >
      <StatusChip label={label} tone={tone} />
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>{value}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { data, isLoading } = useProfile();
  const firstName = data?.fullName?.split(' ')[0]?.trim() || 'there';

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: '800', color: colors.text }}>Home</Text>
      <Text style={{ fontSize: 16, lineHeight: 24, color: colors.muted }}>
        {isLoading
          ? 'Loading your dashboard...'
          : `Welcome back, ${firstName}. Your next best actions are ready.`}
      </Text>

      <AppCard>
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>Profile status</Text>
          <Text style={{ color: colors.muted, lineHeight: 22 }}>
            {data?.targetRole
              ? `You are currently targeting ${data.targetRole}. Keep momentum high by improving one asset and completing one practice session today.`
              : 'Your dashboard is ready. Add your target role and location to unlock stronger guidance.'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <StatusChip label={data?.location || 'Location not set'} tone='neutral' />
            <StatusChip label={data?.targetRole || 'Target role missing'} tone={data?.targetRole ? 'success' : 'warning'} />
          </View>
        </View>
      </AppCard>

      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        <MetricCard label='Resume match' value='Improve today' tone='primary' />
        <MetricCard label='Applications' value='Track follow-ups' tone='warning' />
      </View>

      <AppCard>
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>Today’s mission</Text>
          <Text style={{ color: colors.muted, lineHeight: 22 }}>
            Strong job search momentum comes from doing the next smart thing, not from staring at a blank dashboard.
          </Text>
          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.text }}>• Review your latest ATS match</Text>
            <Text style={{ color: colors.text }}>• Tailor one resume version to a real role</Text>
            <Text style={{ color: colors.text }}>• Complete one voice interview round</Text>
          </View>
          <AppButton label='Open Resume Match Lab' onPress={() => router.push('/(app)/resume')} />
          <AppButton label='Start voice interview' variant='secondary' onPress={() => router.push('/(app)/interview/live-lobby')} />
        </View>
      </AppCard>
    </AppScreen>
  );
}
