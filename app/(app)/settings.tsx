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
import { profileApi } from '@/src/api/profile';
import { useAuth } from '@/src/features/auth/useAuth';
import { useProfile } from '@/src/hooks/useProfile';
import { env } from '@/src/lib/env';

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

  if (profileQuery.isLoading) return <LoadingView label="Loading settings..." />;
  if (profileQuery.isError) {
    return (
      <AppScreen>
        <ErrorState title="Could not load settings" message={profileQuery.error instanceof Error ? profileQuery.error.message : 'Unknown error'} />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: '800', color: '#FFFFFF' }}>Settings</Text>
      <Text style={{ color: '#C8D3F5', lineHeight: 22 }}>
        Keep your account details tidy, manage your subscription plan privately inside the app, and sign out safely from here.
      </Text>

      <AppCard>
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Account</Text>
          <Text style={{ color: '#C8D3F5' }}>Signed in as: {profileQuery.data?.email ?? user?.email ?? 'Unknown user'}</Text>
          <Text style={{ color: '#C8D3F5' }}>Onboarding: {user?.onboardingCompleted ? 'Completed' : 'Pending'}</Text>
        </View>
      </AppCard>

      <AppCard>
        <View style={{ gap: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Profile details</Text>
          <AppInput label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your full name" autoCapitalize="words" />
          <AppInput label="Target role" value={targetRole} onChangeText={setTargetRole} placeholder="Example: HR Coordinator" autoCapitalize="words" />
          <AppInput label="Location" value={location} onChangeText={setLocation} placeholder="Example: Mississauga, ON" autoCapitalize="words" />
          <AppInput label="Professional summary" value={summary} onChangeText={setSummary} placeholder="Write a short profile summary" multiline autoCapitalize="sentences" />
          {saveMutation.isError ? <Text style={{ color: '#F87171' }}>{saveMutation.error instanceof Error ? saveMutation.error.message : 'Could not save profile changes.'}</Text> : null}
          {saveMutation.isSuccess ? <Text style={{ color: '#34D399' }}>Profile saved successfully.</Text> : null}
          <AppButton label={saveMutation.isPending ? 'Saving...' : 'Save profile'} onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending} />
        </View>
      </AppCard>

      <AppCard>
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Subscription</Text>
          <Text style={{ color: '#C8D3F5', lineHeight: 22 }}>Your plan choices stay inside the app. Product identifiers are hidden from the public UI.</Text>
          <Text style={{ color: '#C8D3F5' }}>Weekly Pro • {env.subscriptionPriceWeekly || '$1.99/week'}</Text>
          <Text style={{ color: '#C8D3F5' }}>Monthly Pro • {env.subscriptionPriceMonthly || '$9.99/month'}</Text>
          <Text style={{ color: '#C8D3F5' }}>Annual Pro • {env.subscriptionPriceAnnual || '$59.99/year'}</Text>
          <AppButton label="Open subscription plans" variant="secondary" onPress={() => router.push('/(app)/subscriptions')} />
        </View>
      </AppCard>

      <AppCard>
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Session</Text>
          <AppButton label="Optimize LinkedIn" variant="secondary" onPress={() => router.push('/(app)/profile/linkedin')} />
          <AppButton label="Sign out" onPress={handleSignOut} />
        </View>
      </AppCard>
    </AppScreen>
  );
}
