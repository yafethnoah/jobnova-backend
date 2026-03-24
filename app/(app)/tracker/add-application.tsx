import { useState } from "react";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppCard } from "@/src/components/ui/AppCard";
import { AppInput } from "@/src/components/ui/AppInput";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { applicationsApi } from "@/src/api/applications";
import { useAuth } from "@/src/features/auth/useAuth";
import type { ApplicationStatus } from "@/src/features/tracker/tracker.types";
import { applicationSchema } from "@/src/lib/validators";
import { useToast } from "@/src/features/feedback/ToastProvider";

const statuses: ApplicationStatus[] = ["saved", "applied", "interview", "offer", "rejected"];

export default function AddApplicationScreen() {
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();
  const { showToast } = useToast();
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<ApplicationStatus>("saved");
  const [followUpDate, setFollowUpDate] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");

  const mutation = useMutation({
    mutationFn: () => applicationsApi.create(accessToken, { company: company.trim(), role: role.trim(), status, followUpDate: followUpDate.trim() || undefined, notes: notes.trim() || undefined }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["applications"] });
      showToast("Application saved.", "success");
      router.back();
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "Could not save application");
    }
  });

  function handleSave() {
    setFormError("");
    const parsed = applicationSchema.safeParse({ company, role, followUpDate, notes });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setFormError(issue?.message ?? "Invalid form");
      return;
    }
    mutation.mutate();
  }

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: "800", color: "#FFFFFF" }}>Add application</Text>
      <AppCard>
        <View style={{ gap: 16 }}>
          <AppInput label="Company" value={company} onChangeText={setCompany} placeholder="Example: RBC" autoCapitalize="words" />
          <AppInput label="Role" value={role} onChangeText={setRole} placeholder="Example: HR Coordinator" autoCapitalize="words" />
          <AppInput label="Follow-up date" value={followUpDate} onChangeText={setFollowUpDate} placeholder="YYYY-MM-DD" />
          <AppInput label="Notes" value={notes} onChangeText={setNotes} placeholder="Any notes about this application" multiline autoCapitalize="sentences" />
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#C8D3F5" }}>Status</Text>
            <View style={{ gap: 8 }}>{statuses.map((item) => <AppButton key={item} label={item} variant={status === item ? "primary" : "secondary"} onPress={() => setStatus(item)} />)}</View>
          </View>
          {formError ? <Text style={{ color: "#B91C1C", fontSize: 14 }}>{formError}</Text> : null}
          <AppButton label={mutation.isPending ? "Saving..." : "Save application"} onPress={handleSave} disabled={mutation.isPending} />
        </View>
      </AppCard>
    </AppScreen>
  );
}
