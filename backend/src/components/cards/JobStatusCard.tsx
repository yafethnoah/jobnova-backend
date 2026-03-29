import { View, Text } from "react-native";
import { AppCard } from "@/src/components/ui/AppCard";
import { AppButton } from "@/src/components/ui/AppButton";
import type { BackgroundJobRecord } from "@/src/api/jobs";
import { colors } from "@/src/constants/colors";

function colorForStatus(status: BackgroundJobRecord["status"]) {
  switch (status) {
    case "completed":
      return "#16A34A";
    case "failed":
      return "#DC2626";
    case "processing":
      return "#2563EB";
    default:
      return "#64748B";
  }
}

function labelForKind(kind: BackgroundJobRecord["kind"]) {
  switch (kind) {
    case "ats-compare":
      return "ATS analysis";
    case "resume-rewrite":
      return "Tailored rewrite";
    case "application-package":
      return "Application package";
    case "resume-export":
      return "Resume export";
    case "interview-score":
      return "Interview scoring";
    default:
      return kind;
  }
}

export function JobStatusCard({
  job,
  onOpen,
  onRefresh
}: {
  job: BackgroundJobRecord;
  onOpen?: () => void;
  onRefresh?: () => void;
}) {
  const barColor = colorForStatus(job.status);
  return (
    <AppCard>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#0F172A" }}>{labelForKind(job.kind)}</Text>
            <Text style={{ color: "#475569" }}>
              {job.status === "queued"
                ? "Queued for processing"
                : job.status === "processing"
                  ? "Work in progress"
                  : job.status === "completed"
                    ? "Completed"
                    : "Needs attention"}
            </Text>
          </View>
          <View style={{ backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
            <Text style={{ color: barColor, fontWeight: "700", textTransform: "capitalize" }}>{job.status}</Text>
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 999, overflow: "hidden" }}>
            <View style={{ width: `${Math.max(4, Math.min(100, job.progress || 0))}%`, backgroundColor: barColor, height: "100%" }} />
          </View>
          <Text style={{ color: "#64748B", fontSize: 12 }}>{job.progress || 0}% complete</Text>
        </View>

        {job.errorMessage ? <Text style={{ color: "#B91C1C" }}>{job.errorMessage}</Text> : null}

        <View style={{ flexDirection: "row", gap: 10 }}>
          {onRefresh ? <AppButton label="Refresh" variant="secondary" onPress={onRefresh} /> : null}
          {onOpen ? <AppButton label="Open status" onPress={onOpen} /> : null}
        </View>
      </View>
    </AppCard>
  );
}