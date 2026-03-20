import { useState } from "react";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppInput } from "@/src/components/ui/AppInput";
import { AppCard } from "@/src/components/ui/AppCard";
import { BrandHero } from "@/src/components/ui/BrandHero";
import { useAuth } from "@/src/features/auth/useAuth";
import { signInSchema } from "@/src/lib/validators";
import { colors } from "@/src/constants/colors";

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; form?: string; }>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setFieldErrors({});
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      setFieldErrors({ email: flattened.email?.[0], password: flattened.password?.[0] });
      return;
    }

    try {
      setSubmitting(true);
      await signIn(email.trim(), password);
      router.replace("/");
    } catch (error) {
      setFieldErrors({ form: error instanceof Error ? error.message : "Unable to sign in" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 20 }}>
        <BrandHero subtitle="Sign in to continue your application workflow." />
        <AppCard>
          <View style={{ gap: 16 }}>
            <AppInput label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" error={fieldErrors.email} />
            <AppInput label="Password" value={password} onChangeText={setPassword} placeholder="Enter your password" secureTextEntry error={fieldErrors.password} />
            {fieldErrors.form ? <Text style={{ color: colors.danger, fontSize: 14 }}>{fieldErrors.form}</Text> : null}
            <AppButton label={submitting ? "Signing in..." : "Sign in"} onPress={() => void handleSubmit()} disabled={submitting} />
          </View>
        </AppCard>
        <AppButton label="Create a new account" variant="secondary" onPress={() => router.push("/(public)/sign-up")} />
      </View>
    </SafeAreaView>
  );
}
