import { useState } from "react";
import { router } from "expo-router";
import { Text } from "react-native";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppInput } from "@/src/components/ui/AppInput";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { useOnboardingStore } from "@/src/features/onboarding/onboardingStore";
import { useAuth } from "@/src/features/auth/useAuth";
import { onboardingApi } from "@/src/api/onboarding";

export default function Step2BackgroundScreen() {
  const { accessToken } = useAuth();
  const { answers, setAnswer } = useOnboardingStore();
  const [profession, setProfession] = useState(answers.profession ?? "");

  async function handleNext() {
    if (!profession.trim()) return;

    const value = profession.trim();
    setAnswer("profession", value);

    if (accessToken) {
      try {
        await onboardingApi.saveAnswers(accessToken, { profession: value });
      } catch {
        // keep moving with local state
      }
    }

    router.push("/(onboarding)/results");
  }

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: "800", color: "#FFFFFF" }}>
        What is your professional background?
      </Text>

      <Text style={{ fontSize: 16, lineHeight: 24, color: "#96A7DE" }}>
        Use your closest field, role, or industry. Precision helps. Fog does not.
      </Text>

      <AppInput
        label="Profession or field"
        value={profession}
        onChangeText={setProfession}
        placeholder="Example: Human Resources, Administration, Nursing"
        autoCapitalize="words"
      />

      <AppButton label="Continue" onPress={() => void handleNext()} disabled={!profession.trim()} />
    </AppScreen>
  );
}
