import { Redirect } from "expo-router";
import { useAuth } from "@/src/features/auth/useAuth";
import { LoadingView } from "@/src/components/ui/LoadingView";

export default function IndexScreen() {
  const { status, onboardingCompleted } = useAuth();

  if (status === "loading") {
    return <LoadingView label="Loading JobNova..." />;
  }

  if (status === "signed_out") {
    return <Redirect href="/(public)/welcome" />;
  }

  if (!onboardingCompleted) {
    return <Redirect href="/(onboarding)/step-1-life-stage" />;
  }

  return <Redirect href="/(app)/home" />;
}
