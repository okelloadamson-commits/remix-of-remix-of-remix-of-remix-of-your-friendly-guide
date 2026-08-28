import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { trackActivity } from "@/lib/activity-tracker";

export function useActivityTracker() {
  const { user } = useAuth();

  const track = useCallback(
    (action: string, details: string, page?: string) => {
      if (!user) return;
      trackActivity({
        userId: user.id,
        userName: user.name || "Unknown",
        userEmail: user.email || "",
        action,
        details,
        page: page || window.location.pathname,
      });
    },
    [user]
  );

  return { track };
}
