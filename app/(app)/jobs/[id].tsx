import { useMemo } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { AppCard } from "@/src/components/ui/AppCard";
import { AppButton } from "@/src/components/ui/AppButton";
import { StatusChip } from "@/src/components/ui/StatusChip";
import { TimelineStep } from "@/src/components/ui/TimelineStep";
import { useBackgroundJob } from "@/src/hooks/useBackgroundJob";
import { jobsApi } from "@/src/api/jobs";
import { useAuth } from "@/src/features/auth/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@/src/constants/colors";

export default function JobStatusDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const jobId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const statusQuery = useBackgroundJob(jobId);

  const resultQuery = useQuery({
    queryKey: ["background-job-result", jobId, statusQuery.data?.status],
    queryFn: () => jobsApi.getResult(accessToken ?? null, jobId as string),
    enabled: Boolean(jobId) && statusQuery.data?.status === "completed"
  });

  const persistPackage = useMutation({
    mutationFn: () => jobsApi.persistPackageFromJob(accessToken ?? null, jobId as string),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["autopilot-packages"] });
      router.push({ pathname: "/(app)/applications/package-review", params: { packageId: data.id } });
    }
  });

  const prettyResult = useMemo(() => {
    if (!resultQuery.data?.result) return null;
    try {
      return JSON.stringify(resultQuery.data.result, null, 2);
    } catch {
      return String(resultQuery.data.result);
    }
  }, [resultQuery.data]);

  const job = statusQuery.data;
  const packageId = resultQuery.data?.packageId || null;
  const isApplicationPackage = job?.kind === "application-package";
  const timeline = [
    { title: "Queued", subtitle: "The background worker has accepted the job.", status: job?.status === "queued" ? "active" : ["processing", "completed"].includes(job?.status || "") ? "done" : "pending" },
    { title: "Processing", subtitle: "ATS, rewrite, and package generation are running.", status: job?.status === "processing" ? "active" : job?.status === "completed" ? "done" : "pending" },
    { title: "Completed", subtitle: job?.status === "completed" ? "Result payload is available." : "Waiting for worker completion.", status: job?.status === "completed" ? "done" : job?.status === "failed" ? "pending" : "pending" },
    { title: "Human review", subtitle: packageId ? "A reviewable package record exists." : "Persist the completed package into the review flow.", status: packageId ? "done" : job?.status === "completed" ? "active" : "pending" }
  ];

  return (
    <AppScreen>
      <AppCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: "900", color: colors.text }}>{job?.kind || "Background job"}</Text>
            <Text style={{ marginTop: 8, color: colors.muted }}>Track async orchestration without crossing your fingers and whispering at the server.</Text>
          </View>
          <StatusChip label={job?.status || "unknown"} tone={job?.status === "completed" ? "success" : job?.status === "failed" ? "danger" : job?.status === "processing" ? "primary" : "warning"} />
        </View>
      </AppCard>

      <AppCard>
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.muted }}>Progress: {job?.progress || 0}%</Text>
          <Text style={{ color: colors.muted }}>Created: {job?.createdAt || "—"}</Text>
          <Text style={{ color: colors.muted }}>Updated: {job?.updatedAt || "—"}</Text>
          {job?.errorMessage ? <Text style={{ color: colors.danger }}>{job.errorMessage}</Text> : null}
        </View>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>Job timeline</Text>
        <View style={{ marginTop: 14, gap: 2 }}>
          {timeline.map((step, index) => (
            <TimelineStep key={`${index}-${step.title}`} item={step as any} isLast={index === timeline.length - 1} />
          ))}
        </View>
      </AppCard>

      {prettyResult ? (
        <AppCard>
          <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }}>Latest result</Text>
          <Text style={{ marginTop: 10, color: colors.muted, fontFamily: "monospace" }}>{prettyResult}</Text>
        </AppCard>
      ) : (
        <AppCard>
          <Text style={{ color: colors.muted }}>
            {job?.status === "completed"
              ? "The job is complete but no result payload was returned."
              : "Result will appear here when processing finishes."}
          </Text>
        </AppCard>
      )}

      <View style={{ gap: 10, paddingBottom: 10 }}>
        <AppButton
          label={statusQuery.isFetching ? "Refreshing..." : "Refresh status"}
          variant="secondary"
          onPress={() => {
            void statusQuery.refetch();
            void resultQuery.refetch();
          }}
        />
        {isApplicationPackage && job?.status === "completed" ? (
          packageId ? (
            <AppButton
              label="Open package review"
              onPress={() => router.push({ pathname: "/(app)/applications/package-review", params: { packageId } })}
            />
          ) : (
            <AppButton
              label={persistPackage.isPending ? "Saving package..." : "Save package for review"}
              onPress={() => persistPackage.mutate()}
              disabled={persistPackage.isPending}
            />
          )
        ) : null}
        <AppButton label="Open apply dashboard" variant="secondary" onPress={() => router.push("/(app)/applications/apply-dashboard")} />
      </View>
    </AppScreen>
  );
}
