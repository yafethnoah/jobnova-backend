import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { LoadingView } from '@/src/components/ui/LoadingView';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { useAuth } from '@/src/features/auth/useAuth';
import { useProfile } from '@/src/hooks/useProfile';

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const profileQuery = useProfile();

  async function handleSignOut() {
    await signOut();
    router.replace('/(public)/welcome');
  }

  if (profileQuery.isLoading) return <LoadingView label="Loading profile..." />;

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: '800', color: '#FFFFFF' }}>Profile</Text>
      {profileQuery.isError ? <ErrorState title="Could not load profile" message={profileQuery.error instanceof Error ? profileQuery.error.message : 'Unknown error'} /> : null}
      {profileQuery.data ? (
        <AppCard>
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Account</Text>
            <Text style={{ color: '#C8D3F5' }}>Name: {profileQuery.data.fullName ?? 'Not provided'}</Text>
            <Text style={{ color: '#C8D3F5' }}>Email: {profileQuery.data.email}</Text>
            <Text style={{ color: '#C8D3F5' }}>Target role: {profileQuery.data.targetRole ?? 'Not set'}</Text>
            <Text style={{ color: '#C8D3F5' }}>Location: {profileQuery.data.location ?? 'Not set'}</Text>
          </View>
        </AppCard>
      ) : null}
      <AppButton label="Open settings" variant="secondary" onPress={() => router.push('/(app)/settings')} />
      <AppButton label="Subscriptions" variant="secondary" onPress={() => router.push('/(app)/subscriptions')} />
      <AppButton label="Optimize LinkedIn" variant="secondary" onPress={() => router.push('/(app)/profile/linkedin')} />
      <AppButton label="Sign out" onPress={handleSignOut} />
    </AppScreen>
  );
}
