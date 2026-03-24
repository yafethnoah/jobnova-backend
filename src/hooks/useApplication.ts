import { useQuery } from "@tanstack/react-query";
import { applicationsApi } from "@/src/api/applications";
import { useAuth } from "@/src/features/auth/useAuth";

export function useApplication(id: string) {
  const { accessToken, status } = useAuth();
  return useQuery({ queryKey: ["applications", id], queryFn: () => applicationsApi.getById(accessToken, id), enabled: status === "signed_in" && Boolean(id) });
}
