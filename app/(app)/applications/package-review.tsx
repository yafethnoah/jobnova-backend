import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { AppCard } from "@/src/components/ui/AppCard";
import { AppButton } from "@/src/components/ui/AppButton";
import { StatusChip } from "@/src/components/ui/StatusChip";
import { TimelineStep, TimelineStepItem } from "@/src/components/ui/TimelineStep";
import { useAuth } from "@/src/features/auth/useAuth";
import { jobsApi } from "@/src/api/jobs";
import { useAutopilotPackage } from "@/src/hooks/useAutopilotPackage";
import { colors } from "@/src/constants/colors";
import { textFromUnknown } from "@/src/lib/renderText";

function buildTimeline(item: any): TimelineStepItem[] {
  if (item?.timeline?.length) return item.timeline;
  return [
    { title: "ATS package generated", subtitle: "The package bundle exists and can be reviewed.", status: "done" },
    { title: "Human review checkpoint", subtitle: item?.approvedAt ? "A person approved the package." : "A human still needs to approve the package.", status: item?.approvedAt ? "done" : "active" },
    { title: "Export bundle linked", subtitle: item?.linkedExportJobId ? `Export job ${item.linkedExportJobId} linked.` : "Queue or retry export to attach recruiter-facing files.", status: item?.linkedExportJobId ? "done" : item?.approvedAt ? "active" : "pending" },
    { title: "Application ready", subtitle: "This package is ready to be attached to a real application dashboard.", status: item?.approvedAt && item?.linkedExportJobId ? "done" : "pending" }
  ];
}

function buildCheckpoints(item: any) {
  if (item?.checkpoints?.length) return item.checkpoints;
  return [
    { key: "ats", label: "ATS reviewed", completed: Boolean(item?.package?.ats?.overallScore) },
    { key: "resume", label: "Resume linked", completed: Boolean(item?.linkedResumeVersionId) },
    { key: "review", label: "Human approval", completed: Boolean(item?.approvedAt) },
    { key: "export", label: "Export attached", completed: Boolean(item?.linkedExportJobId) }
  ];
}


function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(/\r?\n|,|•/).map((item) => item.trim()).filter(Boolean);
  if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).map((item) => String(item).trim()).filter(Boolean);
  return [];
}

export default function PackageReviewScreen() {
  const params = useLocalSearchParams<{ packageId?: string }>();
  const packageId = Array.isArray(params.packageId) ? params.packageId[0] : params.packageId;
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const packageQuery = useAutopilotPackage(packageId);

  const approve = useMutation({
    mutationFn: () => jobsApi.approveAutopilotPackage(accessToken ?? null, packageId as string),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["autopilot-package", packageId] });
      void queryClient.invalidateQueries({ queryKey: ["autopilot-packages"] });
    }
  });

  const retryExport = useMutation({
    mutationFn: () => jobsApi.retryPackageExport(accessToken ?? null, packageId as string),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["autopilot-package", packageId] });
      void queryClient.invalidateQueries({ queryKey: ["autopilot-packages"] });
      router.push("/(app)/jobs");
    }
  });

  const item = packageQuery.data;
  const actions = useMemo(() => item?.package?.followUpPlan?.actions || [], [item]);
  const timeline = useMemo(() => buildTimeline(item), [item]);
  const checkpoints = useMemo(() => buildCheckpoints(item), [item]);

  return (
    <AppScreen>
      <AppCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: "900", color: colors.text }}>{item?.targetRole || "Application package"}</Text>
            <Text style={{ marginTop: 6, color: colors.muted }}>{item?.companyName || "Company pending"}</Text>
          </View>
          <StatusChip label={item?.status || "loading"} tone={item?.status === "approved" ? "success" : "warning"} />
        </View>
        <Text style={{ marginTop: 12, color: colors.muted, lineHeight: 22 }}>
          Review the package timeline, finish the human checkpoints, and link the recruiter-facing export bundle before you fire this into the application maze.
        </Text>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>Package timeline</Text>
        <View style={{ marginTop: 14, gap: 2 }}>
          {timeline.map((step, index) => (
            <TimelineStep key={`${index}-${step.title}`} item={step} isLast={index === timeline.length - 1} />
          ))}
        </View>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>Human checkpoints</Text>
        <View style={{ marginTop: 12, flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {checkpoints.map((checkpoint: any) => (
            <StatusChip
              key={checkpoint.key}
              label={checkpoint.completed ? `${checkpoint.label} done` : `${checkpoint.label} needed`}
              tone={checkpoint.completed ? "success" : "warning"}
            />
          ))}
        </View>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>Linked history</Text>
        <View style={{ marginTop: 12, gap: 10 }}>
          <Text style={{ color: colors.muted }}>Resume version: {item?.linkedResumeVersionId || "Not linked yet"}</Text>
          <Text style={{ color: colors.muted }}>Export job: {item?.linkedExportJobId || "Not linked yet"}</Text>
          <Text style={{ color: colors.muted }}>Created: {item?.createdAt || "—"}</Text>
          <Text style={{ color: colors.muted }}>Approved: {item?.approvedAt || "Awaiting human review"}</Text>
        </View>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>ATS snapshot</Text>
        <Text style={{ marginTop: 8, color: colors.muted }}>Overall score: {item?.package?.ats?.overallScore ?? "—"}</Text>
        <Text style={{ marginTop: 8, color: colors.muted }}>Matched keywords: {stringList(item?.package?.ats?.matchedKeywords).join(", ") || "None visible"}</Text>
        <Text style={{ marginTop: 8, color: colors.muted }}>Missing keywords: {stringList(item?.package?.ats?.missingKeywords).join(", ") || "None visible"}</Text>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>Recruiter package content</Text>
        <Text style={{ marginTop: 12, color: colors.text, fontWeight: "800" }}>Cover letter</Text>
        <Text style={{ marginTop: 8, color: colors.muted }}>{textFromUnknown(item?.package?.coverLetter) || "No cover letter available."}</Text>
        <Text style={{ marginTop: 16, color: colors.text, fontWeight: "800" }}>Recruiter email</Text>
        <Text style={{ marginTop: 8, color: colors.muted }}>{textFromUnknown(item?.package?.recruiterEmail) || "No recruiter email available."}</Text>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>Follow-up plan</Text>
        {actions.length ? actions.map((action, index) => (
          <Text key={`${index}-${action}`} style={{ marginTop: 8, color: colors.muted }}>• {action}</Text>
        )) : <Text style={{ marginTop: 8, color: colors.muted }}>No follow-up plan available.</Text>}
      </AppCard>

      <View style={{ gap: 10, paddingBottom: 10 }}>
        <AppButton
          label={approve.isPending ? "Approving..." : item?.status === "approved" ? "Approved" : "Approve package"}
          onPress={() => approve.mutate()}
          disabled={!packageId || approve.isPending || item?.status === "approved"}
        />
        <AppButton
          label={retryExport.isPending ? "Queueing export..." : "Retry export bundle"}
          variant="secondary"
          onPress={() => retryExport.mutate()}
          disabled={!packageId || retryExport.isPending}
        />
        <AppButton
          label="Open apply dashboard"
          variant="secondary"
          onPress={() => router.push("/(app)/applications/apply-dashboard")}
        />
      </View>
    </AppScreen>
  );
}
