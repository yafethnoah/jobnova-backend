import { router } from "expo-router";
import { Text } from "react-native";
import { ListScreen } from "@/src/components/layout/ListScreen";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { JobStatusCard } from "@/src/components/cards/JobStatusCard";
import { useBackgroundJobs } from "@/src/hooks/useBackgroundJobs";

export default function BackgroundJobsScreen() {
  const { data, refetch, isFetching } = useBackgroundJobs();
  const items = data?.items || [];
  return (
    <ListScreen
      title="Background jobs"
      subtitle="Track ATS, export, and interview tasks without staring at a spinner like it owes you money."
      data={items}
      keyExtractor={(item) => item.id}
      onRefresh={() => {
        void refetch();
      }}
      refreshing={isFetching}
      emptyState={<EmptyState title="No background jobs yet" message="Run an ATS compare, export, or interview scoring task and it will appear here." />}
      renderItem={({ item }) => (
        <JobStatusCard
          job={item}
          onRefresh={() => {
            void refetch();
          }}
          onOpen={() => router.push(`/(app)/jobs/${item.id}`)}
        />
      )}
    />
  );
}
