import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppCard } from "@/src/components/ui/AppCard";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { ErrorState } from "@/src/components/ui/ErrorState";
import { LoadingView } from "@/src/components/ui/LoadingView";
import { useAuth } from "@/src/features/auth/useAuth";
import { resourcesApi } from "@/src/api/resources";
import { openExternalLink } from "@/src/lib/openExternalLink";

export default function ResourcesScreen() {
  const { accessToken, status } = useAuth();

  const query = useQuery({
    queryKey: ["resources"],
    queryFn: () => resourcesApi.list(accessToken),
    enabled: status === "signed_in" && Boolean(accessToken)
  });

  if (query.isLoading) {
    return <LoadingView label="Loading resources..." />;
  }

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: "800", color: "#FFFFFF" }}>Resources</Text>
      <Text style={{ fontSize: 16, lineHeight: 24, color: "#96A7DE" }}>
        Official services first. No mystery labyrinths, no sketchy nonsense.
      </Text>
      {query.isError ? (
        <ErrorState title="Could not load resources" message={query.error instanceof Error ? query.error.message : "Unknown error"} />
      ) : null}
      <View style={{ gap: 12 }}>
        {query.data?.map((item) => (
          <AppCard key={item.id}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#FFFFFF" }}>{item.title}</Text>
            <Text style={{ marginTop: 8, color: "#C8D3F5", lineHeight: 24 }}>{item.description}</Text>
            <Text style={{ marginTop: 8, color: "#6B7280" }}>Category: {item.category} {item.official ? "• Official" : ""}</Text>
            <View style={{ marginTop: 14 }}>
              <AppButton label="Open resource" onPress={() => { void openExternalLink(item.url); }} />
            </View>
          </AppCard>
        ))}
      </View>
    </AppScreen>
  );
}
