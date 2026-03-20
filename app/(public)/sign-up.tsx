import { useState } from "react";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppCard } from "@/src/components/ui/AppCard";
import { AppInput } from "@/src/components/ui/AppInput";
import { BrandHero } from "@/src/components/ui/BrandHero";
import { useAuth } from "@/src/features/auth/useAuth";
import { signUpSchema } from "@/src/lib/validators";
import { colors } from "@/src/constants/colors";

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setFieldErrors({});
    const parsed = signUpSchema.safeParse({ fullName, email, password, confirmPassword });
    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        fullName: flattened.fullName?.[0],
        email: flattened.email?.[0],
        password: flattened.password?.[0],
        confirmPassword: flattened.confirmPassword?.[0]
      });
      return;
    }

    try {
      setSubmitting(true);
      await signUp({ fullName: fullName.trim(), email: email.trim(), password });
      router.replace("/");
    } catch (error) {
      setFieldErrors({ form: error instanceof Error ? error.message : "Unable to create account" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 20 }}>
        <BrandHero subtitle="Build your profile and launch a sharper job search." />
        <AppCard>
          <View style={{ gap: 16 }}>
            <AppInput label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your full name" autoCapitalize="words" error={fieldErrors.fullName} />
            <AppInput label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" error={fieldErrors.email} />
            <AppInput label="Password" value={password} onChangeText={setPassword} placeholder="Create a password" secureTextEntry error={fieldErrors.password} />
            <AppInput label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Re-enter your password" secureTextEntry error={fieldErrors.confirmPassword} />
            {fieldErrors.form ? <Text style={{ color: colors.danger, fontSize: 14 }}>{fieldErrors.form}</Text> : null}
            <AppButton label={submitting ? "Creating account..." : "Create account"} onPress={() => void handleSubmit()} disabled={submitting} />
          </View>
        </AppCard>
        <AppButton label="Already have an account? Sign in" variant="secondary" onPress={() => router.push("/(public)/sign-in")} />
      </View>
    </SafeAreaView>
  );
}
