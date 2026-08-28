import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  buildSubscriptionResetKey,
  resetDownloadCountsForSubscription,
} from "@/lib/download-limit";
import type { Subscription } from "@/lib/subscription-service";

const ADMIN_EMAIL = "lightstarrecord@gmail.com";

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Admin has free access
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    let cancelled = false;

    async function resolveSubscription() {
      if (!user) {
        if (!cancelled) {
          setSubscription(null);
          setIsLoading(false);
        }
        return;
      }

      // Admin gets automatic subscription
      if (isAdmin) {
        if (!cancelled) {
          setSubscription({
            isActive: true,
            plan: "Admin (Unlimited)",
            expiresAt: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000), // 100 years
          });
          setIsLoading(false);
        }
        return;
      }

      // Use the real-time plan from AuthContext — this is the single source of truth
      // The onSnapshot listener in AuthContext updates immediately when admin activates/deactivates
      const plan = user.plan;
      const now = new Date();
      if (plan?.isActive && plan.expiresAt && new Date(plan.expiresAt) > now) {
        if (!cancelled) {
          setSubscription({
            isActive: true,
            plan: plan.name,
            expiresAt: new Date(plan.expiresAt),
            activatedAt: plan.activatedAt,
            userId: user.id,
          });
          setIsLoading(false);
        }
        return;
      }

      // Plan is not active — immediately clear subscription so access is revoked right away
      // Do NOT fallback to Firestore query — the real-time listener is authoritative
      if (!cancelled) {
        setSubscription(null);
        setIsLoading(false);
      }
    }

    resolveSubscription();
    return () => {
      cancelled = true;
    };
  }, [user, isAdmin]);

  useEffect(() => {
    const plan = user?.plan;
    if (!user?.id || isAdmin || !plan?.isActive || !plan.expiresAt) return;

    const resetKey = buildSubscriptionResetKey({
      plan: plan.name,
      expiresAt: plan.expiresAt,
      activatedAt: plan.activatedAt,
    });

    resetDownloadCountsForSubscription(user.id, resetKey);
  }, [user?.id, user?.plan, isAdmin]);

  const hasActiveSubscription = isAdmin || subscription?.isActive || false;
  // Agent Plan grants access to ALL content (normal + agent movies)
  // Normal plans do NOT grant access to agent-marked movies
  const hasAgentPlan =
    isAdmin || (subscription?.isActive && subscription?.plan === "Agent Plan") || false;

  const refreshSubscription = async () => {
    if (!user) return;

    if (isAdmin) {
      setSubscription({
        isActive: true,
        plan: "Admin (Unlimited)",
        expiresAt: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000),
      });
      return;
    }

    // Use AuthContext plan as single source of truth
    const plan = user.plan;
    const now = new Date();
    if (plan?.isActive && plan.expiresAt && new Date(plan.expiresAt) > now) {
      setSubscription({
        isActive: true,
        plan: plan.name,
        expiresAt: new Date(plan.expiresAt),
        activatedAt: plan.activatedAt,
        userId: user.id,
      });
    } else {
      setSubscription(null);
    }
    setIsLoading(false);
  };

  return {
    subscription,
    isLoading,
    hasActiveSubscription,
    hasAgentPlan,
    
    refreshSubscription,
    isAdmin,
  };
}
