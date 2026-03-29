import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppInput } from '@/src/components/ui/AppInput';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { LoadingView } from '@/src/components/ui/LoadingView';
import { StatusChip } from '@/src/components/ui/StatusChip';
import { profileApi } from '@/src/api/profile';
import { useAuth } from '@/src/features/auth/useAuth';
import { useProfile } from '@/src/hooks/useProfile';
import { env } from '@/src/lib/env';
import { colors } from '@/src/constants/colors';

export default function SettingsScreen() {
  const { accessToken, signOut, user } = useAuth();
  const queryClient = useQueryClient();
  const profileQuery = useProfile();

  const [fullName, setFullName] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [location, setLocation] = useState('');
  const [summary, setSummary] = useState('');

  useEffect(() => {
    if (!profileQuery.data) return;
    setFullName(profileQuery.data.fullName ?? '');
    setTargetRole(profileQuery.data.targetRole ?? '');
    setLocation(profileQuery.data.location ?? '');
    setSummary(profileQuery.data.summary ?? '');
  }, [profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      profileApi.updateMe(accessToken, {
        fullName: fullName.trim() || undefined,
        targetRole: targetRole.trim() || undefined,
        location: location.trim() || undefined,
        summary: summary.trim() || undefined
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
    }
  });

  async function handleSignOut() {
    await signOut();
    router.replace('/(public)/welcome');
  }

  if (profileQuery.isLoading) return <LoadingView label="Loading account..." />;
  if (profileQuery.isError) {
    return (
      <AppScreen>
        <ErrorState title="Could not load account" message={profileQuery.error instanceof Error ? profileQuery.error.message : 'Unknown error'} />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: '800', color: colors.text }}>Account</Text>
      <Text style={{ color: colors.muted, lineHeight: 22 }}>
        Manage your profile, saved work, subscription, and preferences from one clean place.
      </Text>


      <AppCard>
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Profile</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <StatusChip label={profileQuery.data?.email ?? user?.email ?? 'Signed in'} tone="neutral" />
            <StatusChip label={user?.onboardingCompleted ? 'Onboarding complete' : 'Onboarding pending'} tone={user?.onboardingCompleted ? 'success' : 'warning'} />
          </View>
          <AppInput label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your full name" autoCapitalize="words" />
          <AppInput label="Target role" value={targetRole} onChangeText={setTargetRole} placeholder="Example: HR Coordinator" autoCapitalize="words" />
          <AppInput label="Location" value={location} onChangeText={setLocation} placeholder="Example: Mississauga, ON" autoCapitalize="words" />
          <AppInput label="Professional summary" value={summary} onChangeText={setSummary} placeholder="Write a short profile summary" multiline autoCapitalize="sentences" />
          {saveMutation.isError ? <Text style={{ color: colors.danger }}>{saveMutation.error instanceof Error ? saveMutation.error.message : 'Could not save profile changes.'}</Text> : null}
          {saveMutation.isSuccess ? <Text style={{ color: colors.success }}>Profile saved successfully.</Text> : null}
          <AppButton label={saveMutation.isPending ? 'Saving...' : 'Save profile'} onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending} />
        </View>
      </AppCard>

      <AppCard>
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Resume library</Text>
          <Text style={{ color: colors.muted, lineHeight: 22 }}>Open your saved export library, revisit package outputs, or continue LinkedIn optimization.</Text>
          <AppButton label="Open saved export library" variant="secondary" onPress={() => router.push('/(app)/resume/export-library')} />
          <AppButton label="Optimize LinkedIn" variant="secondary" onPress={() => router.push('/(app)/profile/linkedin')} />
        </View>
      </AppCard>

      <AppCard>
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Subscription</Text>
          <Text style={{ color: colors.muted, lineHeight: 22 }}>Plan choices stay inside the app and product identifiers stay out of the public interface.</Text>
          <Text style={{ color: colors.text }}>Weekly Pro • {env.subscriptionPriceWeekly || '$1.99/week'}</Text>
          <Text style={{ color: colors.text }}>Monthly Pro • {env.subscriptionPriceMonthly || '$9.99/month'}</Text>
          <Text style={{ color: colors.text }}>Annual Pro • {env.subscriptionPriceAnnual || '$59.99/year'}</Text>
          <AppButton label="Open subscription plans" variant="secondary" onPress={() => router.push('/(app)/subscriptions')} />
        </View>
      </AppCard>

      <AppCard>
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Preferences</Text>
          <Text style={{ color: colors.muted, lineHeight: 22 }}>Use resources, update your path, or sign out safely from here.</Text>
          <AppButton label="Open resources" variant="secondary" onPress={() => router.push('/(app)/resources')} />
          <AppButton label="Revisit career path" variant="secondary" onPress={() => router.push('/(app)/career-path')} />
          <AppButton label="Sign out" onPress={handleSignOut} />
        </View>
      </AppCard>
    </AppScreen>
  );
}
