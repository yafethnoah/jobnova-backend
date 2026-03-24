import { useEffect, useState } from "react";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppCard } from "@/src/components/ui/AppCard";
import { AppInput } from "@/src/components/ui/AppInput";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { ErrorState } from "@/src/components/ui/ErrorState";
import { LoadingView } from "@/src/components/ui/LoadingView";
import { profileApi } from "@/src/api/profile";
import { useAuth } from "@/src/features/auth/useAuth";
import { useProfile } from "@/src/hooks/useProfile";

export default function EditProfileScreen() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const profileQuery = useProfile();

  const [fullName, setFullName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [location, setLocation] = useState("");
  const [summary, setSummary] = useState("");

  useEffect(() => {
    if (profileQuery.data) {
      setFullName(profileQuery.data.fullName ?? "");
      setTargetRole(profileQuery.data.targetRole ?? "");
      setLocation(profileQuery.data.location ?? "");
      setSummary(profileQuery.data.summary ?? "");
    }
  }, [profileQuery.data]);

  const mutation = useMutation({
    mutationFn: () =>
      profileApi.updateMe(accessToken, {
        fullName: fullName.trim() || undefined,
        targetRole: targetRole.trim() || undefined,
        location: location.trim() || undefined,
        summary: summary.trim() || undefined
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      router.back();
    }
  });

  if (profileQuery.isLoading) {
    return <LoadingView label="Loading profile..." />;
  }

  if (profileQuery.isError) {
    return (
      <AppScreen>
        <ErrorState title="Could not load profile" message={profileQuery.error instanceof Error ? profileQuery.error.message : "Unknown error"} />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: "800", color: "#FFFFFF" }}>Edit profile</Text>
      <AppCard>
        <View style={{ gap: 16 }}>
          <AppInput label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your full name" autoCapitalize="words" />
          <AppInput label="Target role" value={targetRole} onChangeText={setTargetRole} placeholder="Example: HR Coordinator" autoCapitalize="words" />
          <AppInput label="Location" value={location} onChangeText={setLocation} placeholder="Example: Mississauga, ON" autoCapitalize="words" />
          <AppInput label="Professional summary" value={summary} onChangeText={setSummary} placeholder="Write a short profile summary" multiline autoCapitalize="sentences" />
          {mutation.isError ? <Text style={{ color: "#B91C1C" }}>{mutation.error instanceof Error ? mutation.error.message : "Could not save profile"}</Text> : null}
          <AppButton label={mutation.isPending ? "Saving..." : "Save changes"} onPress={() => mutation.mutate()} disabled={mutation.isPending} />
        </View>
      </AppCard>
    </AppScreen>
  );
}
