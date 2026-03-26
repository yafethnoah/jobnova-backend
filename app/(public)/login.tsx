import { useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppInput } from '@/src/components/ui/AppInput';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { colors } from '@/src/constants/colors';
import { useAuth } from '@/src/features/auth/useAuth';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleLogin() {
    setErrorMessage('');
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: '800', color: '#FFFFFF' }}>Sign in</Text>
      <Text style={{ fontSize: 16, lineHeight: 24, color: '#96A7DE' }}>
        Sign in to continue your guided job search journey, saved progress, and personalized tools.
      </Text>


      <AppCard>
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Welcome back</Text>
          <Text style={{ color: colors.muted, lineHeight: 22 }}>
            Your resume work, applications, and interview practice stay easier to manage when you sign in.
          </Text>
        </View>
      </AppCard>

      <AppCard>
        <View style={{ gap: 16 }}>
          <AppInput label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" />
          <AppInput label="Password" value={password} onChangeText={setPassword} placeholder="Enter your password" secureTextEntry autoCapitalize="none" />
          <AppButton label={submitting ? 'Signing in...' : 'Sign in'} onPress={() => void handleLogin()} disabled={submitting || !email.trim() || !password} />
          <AppButton label="Create account" variant="secondary" onPress={() => router.push('/(public)/register')} disabled={submitting} />
        </View>
      </AppCard>

      {errorMessage ? <ErrorState title="Could not sign in" message={errorMessage} /> : null}
    </AppScreen>
  );
}
