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

export default function OnboardingResultsScreen() {
  const { accessToken, signOut, markOnboardingComplete } = useAuth();
  const { answers } = useOnboardingStore();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleFinish() {
    try {
      setSubmitting(true);
      setError("");

      console.log("[ONBOARDING] accessToken exists:", Boolean(accessToken));
      console.log("[ONBOARDING] answers:", answers);

      if (!accessToken) {
        throw new Error("Your session expired. Please sign in again.");
      }

      const payload = {
        lifeStage: answers.lifeStage || "",
        profession: answers.profession || "",
        yearsExperience: answers.yearsExperience || "",
        educationLevel: answers.educationLevel || "",
        englishLevel: answers.englishLevel || "",
        frenchLevel: answers.frenchLevel || "",
        hasCanadianExperience: answers.hasCanadianExperience || false,
        targetGoal: answers.targetGoal || "",
        urgencyLevel: answers.urgencyLevel || "medium",
      };

      const saveResult = await onboardingApi.saveAnswers(payload);
      if ((saveResult as any)?.error === "unauthorized") {
        throw new Error("Unauthorized");
      }

      const pathResult = await onboardingApi.generateCareerPath();
      if ((pathResult as any)?.error === "unauthorized") {
        throw new Error("Unauthorized");
      }

      markOnboardingComplete();
      router.replace("/(app)/home");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not complete onboarding";

      console.log("[ONBOARDING] failed:", message);

      if (/auth|token|401|unauthorized/i.test(message)) {
        await signOut();
        router.replace("/(public)/login");
        return;
      }

      setError(message);
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
        This is your starter map, not destiny carved into marble.
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
          Begin with bridge-friendly roles that build Canadian experience while
          targeting your longer-term professional path.
        </Text>
      </AppCard>

      {error ? (
        <ErrorState title="Could not complete onboarding" message={error} />
      ) : null}

      <AppButton
        label={submitting ? "Finishing..." : "Go to my dashboard"}
        onPress={() => {
          void handleFinish();
        }}
        disabled={submitting}
      />
    </AppScreen>
  );
}