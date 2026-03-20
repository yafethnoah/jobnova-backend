import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/src/features/auth/useAuth";
import { LoadingView } from "@/src/components/ui/LoadingView";
import { useOnboardingBootstrap } from "@/src/hooks/useOnboardingBootstrap";

export default function OnboardingLayout() {
  const { status, onboardingCompleted } = useAuth();

  useOnboardingBootstrap();

  if (status === "loading") {
    return <LoadingView label="Preparing onboarding..." />;
  }

  if (status === "signed_out") {
    return <Redirect href="/(public)/welcome" />;
  }

  if (onboardingCompleted) {
    return <Redirect href="/(app)/home" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
