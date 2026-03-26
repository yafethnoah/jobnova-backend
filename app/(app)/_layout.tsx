import { Slot, Redirect } from "expo-router";
import { useAuthContext } from "@/src/features/auth/AuthProvider";

export default function AppLayout() {
  const { status } = useAuthContext();

  if (status === "loading") {
    return null;
  }

  if (status !== "signed_in") {
    return <Redirect href="/auth" />;
  }

  return <Slot />;
}