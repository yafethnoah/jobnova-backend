import { useQuery } from "@tanstack/react-query";
import { jobsApi } from "@/src/api/jobs";
import { useAuth } from "@/src/features/auth/useAuth";

export function useBackgroundJob(jobId?: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["background-job", jobId],
    queryFn: () => jobsApi.getStatus(accessToken ?? null, jobId as string),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "completed" || status === "failed" ? false : 2500;
    }
  });
}
