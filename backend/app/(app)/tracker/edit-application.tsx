import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppCard } from "@/src/components/ui/AppCard";
import { AppInput } from "@/src/components/ui/AppInput";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { LoadingView } from "@/src/components/ui/LoadingView";
import { ErrorState } from "@/src/components/ui/ErrorState";
import { applicationsApi } from "@/src/api/applications";
import { useAuth } from "@/src/features/auth/useAuth";
import type { ApplicationStatus } from "@/src/features/tracker/tracker.types";
import { useApplication } from "@/src/hooks/useApplication";

const statuses: ApplicationStatus[] = ["saved", "applied", "interview", "offer", "rejected"];

export default function EditApplicationScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const applicationQuery = useApplication(params.id);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<ApplicationStatus>("saved");
  const [followUpDate, setFollowUpDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (applicationQuery.data) {
      setCompany(applicationQuery.data.company);
      setRole(applicationQuery.data.role);
      setStatus(applicationQuery.data.status);
      setFollowUpDate(applicationQuery.data.followUpDate ?? "");
      setNotes(applicationQuery.data.notes ?? "");
    }
  }, [applicationQuery.data]);

  const updateMutation = useMutation({
    mutationFn: () => applicationsApi.update(accessToken, params.id, { company: company.trim(), role: role.trim(), status, followUpDate: followUpDate.trim() || undefined, notes: notes.trim() || undefined }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["applications"] });
      await queryClient.invalidateQueries({ queryKey: ["applications", params.id] });
      router.back();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => applicationsApi.remove(accessToken, params.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["applications"] });
      router.replace("/(app)/tracker");
    }
  });

  if (applicationQuery.isLoading) return <LoadingView label="Loading application..." />;
  if (applicationQuery.isError) return <AppScreen><ErrorState title="Could not load application" message={applicationQuery.error instanceof Error ? applicationQuery.error.message : "Unknown error"} /></AppScreen>;

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: "800", color: "#FFFFFF" }}>Edit application</Text>
      <AppCard>
        <View style={{ gap: 16 }}>
          <AppInput label="Company" value={company} onChangeText={setCompany} placeholder="Company" autoCapitalize="words" />
          <AppInput label="Role" value={role} onChangeText={setRole} placeholder="Role" autoCapitalize="words" />
          <AppInput label="Follow-up date" value={followUpDate} onChangeText={setFollowUpDate} placeholder="YYYY-MM-DD" />
          <AppInput label="Notes" value={notes} onChangeText={setNotes} placeholder="Notes" multiline autoCapitalize="sentences" />
          <View style={{ gap: 8 }}>{statuses.map((item) => <AppButton key={item} label={item} variant={status === item ? "primary" : "secondary"} onPress={() => setStatus(item)} />)}</View>
          {updateMutation.isError ? <Text style={{ color: "#B91C1C" }}>{updateMutation.error instanceof Error ? updateMutation.error.message : "Could not save changes"}</Text> : null}
          <AppButton label={updateMutation.isPending ? "Saving..." : "Save changes"} onPress={() => updateMutation.mutate()} disabled={updateMutation.isPending} />
          <AppButton label={deleteMutation.isPending ? "Deleting..." : "Delete application"} variant="secondary" onPress={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} />
        </View>
      </AppCard>
    </AppScreen>
  );
}
