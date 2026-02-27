import { useUserData } from "./useUserData";

export function useUserRole() {
  const { role, loading } = useUserData();
  return { role, loading };
}
