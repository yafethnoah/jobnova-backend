import { router } from "expo-router";
import { Text, View } from "react-native";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { AppCard } from "@/src/components/ui/AppCard";
import { AppButton } from "@/src/components/ui/AppButton";
import { StatusChip } from "@/src/components/ui/StatusChip";
import { useAutopilotPackages } from "@/src/hooks/useAutopilotPackages";
import { colors } from "@/src/constants/colors";

function toneForPackage(status: string) {
  return status === "approved" ? "success" : "warning";
}

export default function ApplyDashboardScreen() {
  const packagesQuery = useAutopilotPackages();
  const items = packagesQuery.data?.items || [];
  const approved = items.filter((item) => item.status === "approved").length;
  const drafts = items.filter((item) => item.status !== "approved").length;

  return (
    <AppScreen>
      <AppCard>
        <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text }}>Apply package dashboard</Text>
        <Text style={{ marginTop: 8, color: colors.muted, lineHeight: 22 }}>
          One screen to review drafts, approvals, exports, and the next human checkpoint before you launch documents into the recruiter wilderness.
        </Text>
      </AppCard>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <AppCard>
            <Text style={{ color: colors.subtle, fontWeight: "700" }}>Draft packages</Text>
            <Text style={{ marginTop: 8, fontSize: 26, fontWeight: "900", color: colors.text }}>{drafts}</Text>
          </AppCard>
        </View>
        <View style={{ flex: 1 }}>
          <AppCard>
            <Text style={{ color: colors.subtle, fontWeight: "700" }}>Approved packages</Text>
            <Text style={{ marginTop: 8, fontSize: 26, fontWeight: "900", color: colors.text }}>{approved}</Text>
          </AppCard>
        </View>
      </View>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>Recent package orchestration</Text>
        <View style={{ marginTop: 12, gap: 12 }}>
          {items.length ? items.slice(0, 6).map((item) => {
            const status = item.status ?? "draft";
            return (
              <View key={item.id} style={{ gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: "800" }}>{item.targetRole || "Role"}</Text>
                    <Text style={{ marginTop: 4, color: colors.muted }}>{item.companyName || "Company"}</Text>
                  </View>
                  <StatusChip label={status} tone={toneForPackage(status)} />
                </View>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  {item.linkedResumeVersionId ? <StatusChip label="resume linked" tone="primary" /> : <StatusChip label="resume pending" tone="warning" />}
                  {item.linkedExportJobId ? <StatusChip label="export linked" tone="primary" /> : <StatusChip label="export pending" tone="warning" />}
                  {item.approvedAt ? <StatusChip label="human approved" tone="success" /> : <StatusChip label="human review needed" tone="warning" />}
                </View>
                <AppButton
                  label="Open package"
                  variant="secondary"
                  onPress={() => router.push({ pathname: "/(app)/applications/package-review", params: { packageId: item.id } })}
                />
              </View>
            );
          }) : <Text style={{ color: colors.muted }}>No package records yet. Generate an application package first.</Text>}
        </View>
      </AppCard>
    </AppScreen>
  );
}
