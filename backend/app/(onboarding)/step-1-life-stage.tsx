import { router } from "expo-router";
import { Text, View } from "react-native";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppCard } from "@/src/components/ui/AppCard";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { useOnboardingStore } from "@/src/features/onboarding/onboardingStore";
import { useAuth } from "@/src/features/auth/useAuth";
import { onboardingApi } from "@/src/api/onboarding";

const options = [
  "Newcomer to Canada",
  "Student or recent graduate",
  "Internationally experienced professional",
  "Career changer",
  "Returning to work",
];

export default function Step1LifeStageScreen() {
  const { accessToken } = useAuth();
  const { answers, setAnswer } = useOnboardingStore();

  async function selectOption(value: string) {
    setAnswer("lifeStage", value);

    if (accessToken) {
      try {
        await onboardingApi.saveAnswers({ lifeStage: value });
      } catch {
        // local state still preserved
      }
    }
  }

  function handleNext() {
    if (!answers.lifeStage) return;
    router.push("/(onboarding)/step-2-background");
  }

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: "800", color: "#FFFFFF" }}>
        Tell us where you are starting
      </Text>

      <Text style={{ fontSize: 16, lineHeight: 24, color: "#96A7DE" }}>
        This helps JobNova tailor your first steps instead of throwing generic advice at your face like a motivational brick.
      </Text>

      <View style={{ gap: 12 }}>
        {options.map((option) => {
          const selected = answers.lifeStage === option;

          return (
            <AppCard key={option}>
              <AppButton
                label={option}
                variant={selected ? "primary" : "secondary"}
                onPress={() => {
                  void selectOption(option);
                }}
              />
            </AppCard>
          );
        })}
      </View>

      <AppButton
        label="Continue"
        onPress={handleNext}
        disabled={!answers.lifeStage}
      />
    </AppScreen>
  );
}