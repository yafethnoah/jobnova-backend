import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppCard } from "@/src/components/ui/AppCard";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { LoadingView } from "@/src/components/ui/LoadingView";
import { ErrorState } from "@/src/components/ui/ErrorState";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { useApplications } from "@/src/hooks/useApplications";
import { colors } from "@/src/constants/colors";

function CountTile({ label, value, tone = colors.text }: { label: string; value: number; tone?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <AppCard>
        <Text style={{ color: colors.subtle, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</Text>
        <Text style={{ marginTop: 10, color: tone, fontSize: 26, fontWeight: '900' }}>{value}</Text>
      </AppCard>
    </View>
  );
}

export default function TrackerScreen() {
  const { data, isLoading, isError, error } = useApplications();

  if (isLoading) {
    return <LoadingView label="Loading your applications..." />;
  }

  const applications = data || [];
  const appliedCount = applications.filter((item) => item.status?.toLowerCase().includes('applied')).length;
  const interviewCount = applications.filter((item) => item.status?.toLowerCase().includes('interview')).length;
  const offerCount = applications.filter((item) => item.status?.toLowerCase().includes('offer')).length;

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: "800", color: "#FFFFFF" }}>Job Tracker</Text>
      <Text style={{ color: "#96A7DE", lineHeight: 24 }}>Track every application as a workflow, not just a list. The goal is to keep the next move visible and connected to the tailored package.</Text>
      <AppButton label="Add application" onPress={() => router.push("/(app)/tracker/add-application")} />

      {!isError && applications.length ? (
        <>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <CountTile label="Total" value={applications.length} />
            <CountTile label="Applied" value={appliedCount} tone={colors.primarySoft} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <CountTile label="Interviews" value={interviewCount} tone={colors.warning} />
            <CountTile label="Offers" value={offerCount} tone={colors.success} />
          </View>
        </>
      ) : null}

      {isError ? <ErrorState title="Could not load applications" message={error instanceof Error ? error.message : "Unknown error"} /> : null}
      {!isError && applications.length === 0 ? <EmptyState title="No applications yet" message="Start with one. Small consistent moves create the strongest pipeline." actionLabel="Add first application" onAction={() => router.push("/(app)/tracker/add-application")} /> : null}

      <View style={{ gap: 12 }}>
        {applications.map((item) => (
          <Pressable key={item.id} onPress={() => router.push(`/(app)/tracker/${item.id}`)}>
            <AppCard>
              <Text style={{ fontSize: 17, fontWeight: "700", color: "#FFFFFF" }}>{item.company} — {item.role}</Text>
              <Text style={{ marginTop: 8, color: "#C8D3F5" }}>Status: {item.status}</Text>
              {item.followUpDate ? <Text style={{ marginTop: 4, color: "#C8D3F5" }}>Follow-up: {item.followUpDate}</Text> : null}
            </AppCard>
          </Pressable>
        ))}
      </View>
    </AppScreen>
  );
}
