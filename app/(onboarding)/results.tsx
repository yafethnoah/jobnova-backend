import { useState } from "react";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppCard } from "@/src/components/ui/AppCard";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { ErrorState } from "@/src/components/ui/ErrorState";
import { useAuth } from "@/src/features/auth/useAuth";
import { useOnboardingStore } from "@/src/features/onboarding/onboardingStore";
import { onboardingApi } from "@/src/api/onboarding";
import { saveJson } from "@/src/lib/localCache";

const CAREER_PATH_CACHE_KEY = "northpath_career_path_result";

export default function OnboardingResultsScreen() {
  const { accessToken, markOnboardingComplete } = useAuth();
  const { answers } = useOnboardingStore();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = Boolean(answers.lifeStage && answers.profession);

  async function handleFinish() {
    if (!accessToken || !answers.lifeStage || !answers.profession) {
      setError("Missing onboarding data.");
      return;
    }

    try {
      setError("");
      setSubmitting(true);

      const fullAnswers = {
        lifeStage: answers.lifeStage,
        profession: answers.profession,
        yearsExperience: answers.yearsExperience ?? "",
        educationLevel: answers.educationLevel ?? "",
        englishLevel: answers.englishLevel ?? "",
        frenchLevel: answers.frenchLevel,
        hasCanadianExperience: answers.hasCanadianExperience ?? false,
        targetGoal: answers.targetGoal ?? "",
        urgencyLevel: answers.urgencyLevel ?? "medium"
      };

      await onboardingApi.saveAnswers(accessToken, fullAnswers);
      const pathResult = await onboardingApi.generateCareerPath(accessToken, fullAnswers);
      await saveJson(CAREER_PATH_CACHE_KEY, pathResult);

      markOnboardingComplete();
      router.replace("/(app)/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finish onboarding");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: "800", color: "#FFFFFF" }}>
        Your first path is ready
      </Text>

      <Text style={{ fontSize: 16, lineHeight: 24, color: "#96A7DE" }}>
        This is your starter map, not destiny carved into marble by dramatic owls.
      </Text>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#FFFFFF" }}>
          Starting profile
        </Text>

        <View style={{ marginTop: 12, gap: 8 }}>
          <Text style={{ color: "#C8D3F5" }}>
            Life stage: {answers.lifeStage ?? "Not set"}
          </Text>
          <Text style={{ color: "#C8D3F5" }}>
            Background: {answers.profession ?? "Not set"}
          </Text>
        </View>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#FFFFFF" }}>
          Suggested direction
        </Text>
        <Text style={{ marginTop: 10, lineHeight: 24, color: "#C8D3F5" }}>
          Begin with bridge-friendly roles that build Canadian experience while targeting your longer-term professional path.
        </Text>
      </AppCard>

      {error ? <ErrorState title="Could not complete onboarding" message={error} /> : null}

      <AppButton
        label={submitting ? "Finishing..." : "Enter JobNova"}
        onPress={() => void handleFinish()}
        disabled={submitting || !canSubmit}
      />
    </AppScreen>
  );
}
