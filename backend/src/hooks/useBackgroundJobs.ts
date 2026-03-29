import { useQuery } from "@tanstack/react-query";
import { jobsApi } from "@/src/api/jobs";
import { useAuth } from "@/src/features/auth/useAuth";

export function useBackgroundJobs() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["background-jobs"],
    queryFn: () => jobsApi.list(accessToken ?? null),
    refetchInterval: 4000
  });
}
