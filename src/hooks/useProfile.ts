import { useQuery } from "@tanstack/react-query";
import { profileApi } from "@/src/api/profile";
import { useAuth } from "@/src/features/auth/useAuth";

export function useProfile() {
  const { accessToken, status } = useAuth();
  return useQuery({ queryKey: ["profile"], queryFn: () => profileApi.getMe(accessToken), enabled: status === "signed_in" });
}
