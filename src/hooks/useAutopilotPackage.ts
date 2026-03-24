import { useQuery } from "@tanstack/react-query";
import { jobsApi } from "@/src/api/jobs";
import { useAuth } from "@/src/features/auth/useAuth";

export function useAutopilotPackage(packageId?: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["autopilot-package", packageId],
    queryFn: () => jobsApi.getAutopilotPackage(accessToken ?? null, packageId as string),
    enabled: Boolean(packageId)
  });
}
