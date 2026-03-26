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

export default function RegisterScreen() {
  const { registerLocal } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleRegister() {
    setErrorMessage('');
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    try {
      await registerLocal(fullName.trim(), email.trim(), password);
      router.replace('/');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: '800', color: '#FFFFFF' }}>Create account</Text>
      <Text style={{ fontSize: 16, lineHeight: 24, color: '#96A7DE' }}>
        Create your account to save your progress, tailored documents, and interview practice history.
      </Text>


      <AppCard>
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Create your workspace</Text>
          <Text style={{ color: colors.muted, lineHeight: 22 }}>
            Once your account is ready, JobNova can keep your path, resume work, and application activity together in one place.
          </Text>
        </View>
      </AppCard>

      <AppCard>
        <View style={{ gap: 16 }}>
          <AppInput label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your full name" autoCapitalize="words" />
          <AppInput label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" />
          <AppInput label="Password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry autoCapitalize="none" />
          <AppInput label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Re-enter password" secureTextEntry autoCapitalize="none" />
          <AppButton label={submitting ? 'Creating account...' : 'Create account'} onPress={() => void handleRegister()} disabled={submitting || !fullName.trim() || !email.trim() || !password || !confirmPassword} />
          <AppButton label="Back to sign in" variant="secondary" onPress={() => router.push('/(public)/login')} disabled={submitting} />
        </View>
      </AppCard>

      {errorMessage ? <ErrorState title="Could not create account" message={errorMessage} /> : null}
    </AppScreen>
  );
}
