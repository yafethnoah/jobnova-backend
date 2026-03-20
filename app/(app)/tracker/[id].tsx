import { router, useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppCard } from "@/src/components/ui/AppCard";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { LoadingView } from "@/src/components/ui/LoadingView";
import { ErrorState } from "@/src/components/ui/ErrorState";
import { useApplication } from "@/src/hooks/useApplication";

export default function ApplicationDetailsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const query = useApplication(params.id);

  if (query.isLoading) return <LoadingView label="Loading application..." />;

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: "800", color: "#FFFFFF" }}>Application details</Text>
      {query.isError ? <ErrorState title="Could not load application" message={query.error instanceof Error ? query.error.message : "Unknown error"} /> : null}
      {query.data ? (
        <>
          <AppCard>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#FFFFFF" }}>{query.data.company} — {query.data.role}</Text>
            <Text style={{ marginTop: 10, color: "#C8D3F5" }}>Status: {query.data.status}</Text>
            {query.data.followUpDate ? <Text style={{ marginTop: 6, color: "#C8D3F5" }}>Follow-up: {query.data.followUpDate}</Text> : null}
            {query.data.notes ? <Text style={{ marginTop: 10, lineHeight: 24, color: "#C8D3F5" }}>Notes: {query.data.notes}</Text> : null}
          </AppCard>
          <AppButton label="Edit application" onPress={() => router.push(`/(app)/tracker/edit-application?id=${params.id}`)} />
        </>
      ) : null}
    </AppScreen>
  );
}
