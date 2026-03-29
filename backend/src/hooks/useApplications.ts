import { useQuery } from "@tanstack/react-query";
import { applicationsApi } from "@/src/api/applications";
import { useAuth } from "@/src/features/auth/useAuth";

export function useApplications() {
  const { accessToken, status } = useAuth();
  return useQuery({ queryKey: ["applications"], queryFn: () => applicationsApi.list(accessToken), enabled: status === "signed_in" && Boolean(accessToken) });
}
