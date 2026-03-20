import { useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppInput } from '@/src/components/ui/AppInput';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { StatusChip } from '@/src/components/ui/StatusChip';
import { colors } from '@/src/constants/colors';
import { env } from '@/src/lib/env';
import { useAuth } from '@/src/features/auth/useAuth';

export default function LoginScreen() {
  const { signInLocal } = useAuth();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [submitting, setSubmitting] = useState(false); const [errorMessage, setErrorMessage] = useState('');
  async function handleLogin() { setErrorMessage(''); setSubmitting(true); try { await signInLocal(email.trim(), password); router.replace('/(app)'); } catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Login failed.'); } finally { setSubmitting(false); } }
  return <AppScreen><Text style={{ fontSize: 30, fontWeight: '800', color: '#FFFFFF' }}>Sign in</Text><Text style={{ fontSize: 16, lineHeight: 24, color: '#96A7DE' }}>Sign in with your JobNova account. This screen reflects local-auth availability on the backend.</Text><AppCard><View style={{ gap: 12 }}><Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Auth runtime</Text><View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}><StatusChip label={env.useMockApi ? 'mock mode' : 'live backend mode'} tone={env.useMockApi ? 'warning' : 'success'} /><StatusChip label="local auth form" tone="primary" /></View><Text style={{ color: colors.muted, lineHeight: 22 }}>In live mode, this form depends on backend local-auth availability.</Text></View></AppCard><AppCard><View style={{ gap: 16 }}><AppInput label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" /><AppInput label="Password" value={password} onChangeText={setPassword} placeholder="Enter your password" secureTextEntry autoCapitalize="none" /><AppButton label={submitting ? 'Signing in...' : 'Sign in'} onPress={() => void handleLogin()} disabled={submitting || !email.trim() || !password} /><AppButton label="Create account" variant="secondary" onPress={() => router.push('/(public)/register')} disabled={submitting} /></View></AppCard>{errorMessage ? <ErrorState title="Could not sign in" message={errorMessage} /> : null}</AppScreen>;
}
