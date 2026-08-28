import { database } from "./firebase";
import { ref, get, runTransaction, set } from "firebase/database";

// Daily download limits per subscription plan
export const dailyDownloadLimits: Record<string, number> = {
  "2 Days": -1,
  "1 Week": -1,
  "2 Weeks": -1,
  "1 Month": -1,
  "3 Months": -1,
  "6 Months": -1,
  "1 Year": -1,
  Lifetime: -1,
  "Admin (Unlimited)": -1,
  "Agent Plan": -1,
  "LuoFree Plan": -1,
  
};

export function getDailyLimitForPlan(plan?: string | null): number {
  if (!plan) return 0;
  if (plan in dailyDownloadLimits) return dailyDownloadLimits[plan];
  return 0;
}

function resetValue(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function buildSubscriptionResetKey(subscription: {
  plan?: string | null;
  expiresAt?: Date | string | number | null;
  activatedAt?: Date | string | number | null;
  orderId?: string | null;
  orderTrackingId?: string | null;
}): string {
  return [
    subscription.plan || "unknown-plan",
    resetValue(subscription.activatedAt) || resetValue(subscription.expiresAt),
    subscription.orderId || subscription.orderTrackingId || "no-order",
  ].join("|");
}

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function getTodayDownloadCount(userId: string): Promise<number> {
  const r = ref(database, `downloadCounts/${userId}/${todayKey()}`);
  const snap = await get(r);
  return snap.exists() ? Number(snap.val()) || 0 : 0;
}

/**
 * Atomically check + increment. Returns { allowed, count, limit }.
 * If limit is -1 (unlimited) it always allows and still increments for stats.
 */
export async function tryConsumeDownload(
  userId: string,
  plan: string | undefined | null,
): Promise<{ allowed: boolean; count: number; limit: number }> {
  const limit = getDailyLimitForPlan(plan);
  const r = ref(database, `downloadCounts/${userId}/${todayKey()}`);

  const result = await runTransaction(r, (current) => {
    const c = Number(current) || 0;
    if (limit !== -1 && c >= limit) {
      return undefined; // abort transaction so download is not allowed
    }
    return c + 1;
  });

  const newCount = Number(result.snapshot.val()) || 0;
  const allowed = limit === -1 || result.committed;
  return { allowed, count: newCount, limit };
}

export async function resetDownloadCountsForSubscription(
  userId: string,
  resetKey: string,
): Promise<boolean> {
  try {
    const markerRef = ref(database, `downloadResetMarkers/${userId}`);
    const markerSnap = await get(markerRef);

    if (markerSnap.exists() && markerSnap.val() === resetKey) {
      return true;
    }

    return resetTodayDownloadCount(userId, resetKey);
  } catch (e) {
    console.error("Failed to check subscription download reset:", e);
    return false;
  }
}

/**
 * Reset all stored download counters for a user. Called when a user activates
 * a new subscription or upgrades, so every previous limit count starts at 0.
 */
export async function resetTodayDownloadCount(userId: string, resetKey?: string): Promise<boolean> {
  try {
    // Wipe ALL daily counters for this user (today + any stale day keys)
    await set(ref(database, `downloadCounts/${userId}`), { [todayKey()]: 0 });
    if (resetKey) {
      await set(ref(database, `downloadResetMarkers/${userId}`), resetKey);
    }
    return true;
  } catch (e) {
    console.error("Failed to reset download counts:", e);
    return false;
  }
}
