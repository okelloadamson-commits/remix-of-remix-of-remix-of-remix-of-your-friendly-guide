import { collection, doc, getDoc, getDocs, query, setDoc, where, Timestamp } from "firebase/firestore";
import { db, legacyDb } from "./firebase";

/**
 * One-time migration: when a user signs in to the NEW Firebase project,
 * look them up by email in the LEGACY Firebase project. If they had an
 * active subscription there, copy it onto their new user document while
 * preserving the original expiry date.
 *
 * Safe to call on every sign-in: it no-ops once `legacyMigrated` is set
 * or if the new user already has a subscription.
 */
export async function migrateLegacySubscription(
  newUserId: string,
  email: string | null | undefined,
): Promise<void> {
  if (!email) return;
  const normalizedEmail = email.toLowerCase().trim();

  try {
    const newUserRef = doc(db, "users", newUserId);
    const newUserSnap = await getDoc(newUserRef);
    const newUserData = newUserSnap.data() || {};

    // Already migrated or already has a subscription — skip
    if (newUserData.legacyMigrated) return;
    if (newUserData.subscription?.isActive) {
      await setDoc(newUserRef, { legacyMigrated: true }, { merge: true });
      return;
    }

    // 1) Look up legacy user by email
    const legacyUsersRef = collection(legacyDb, "users");
    const legacyUserQ = query(legacyUsersRef, where("email", "==", normalizedEmail));
    const legacySnap = await getDocs(legacyUserQ);

    let bestSubscription: {
      plan: string;
      expiresAt: Date;
      activatedAt?: Date;
      orderId?: string;
      orderTrackingId?: string;
    } | null = null;
    let bestExpiry = new Date(0);

    const considerSub = (sub: Record<string, unknown> | undefined) => {
      if (!sub) return;
      const expiresAtRaw = sub.expiresAt as { toDate?: () => Date } | string | number | undefined;
      const expiresAt =
        expiresAtRaw && typeof expiresAtRaw === "object" && "toDate" in expiresAtRaw && typeof expiresAtRaw.toDate === "function"
          ? expiresAtRaw.toDate()
          : expiresAtRaw
            ? new Date(expiresAtRaw as string | number)
            : null;
      if (!expiresAt || isNaN(expiresAt.getTime())) return;
      if (expiresAt <= new Date()) return; // expired
      if (expiresAt <= bestExpiry) return;
      const activatedRaw = sub.activatedAt as { toDate?: () => Date } | string | number | undefined;
      const activatedAt =
        activatedRaw && typeof activatedRaw === "object" && "toDate" in activatedRaw && typeof activatedRaw.toDate === "function"
          ? activatedRaw.toDate()
          : activatedRaw
            ? new Date(activatedRaw as string | number)
            : undefined;
      bestExpiry = expiresAt;
      bestSubscription = {
        plan: String(sub.plan || "Migrated Plan"),
        expiresAt,
        activatedAt,
        orderId: sub.orderId ? String(sub.orderId) : undefined,
        orderTrackingId: sub.orderTrackingId ? String(sub.orderTrackingId) : undefined,
      };
    };

    legacySnap.forEach((d) => {
      const data = d.data();
      considerSub(data.subscription);
    });

    // 2) Also scan legacy `subscriptions` collection by userId (the legacy uid)
    for (const d of legacySnap.docs) {
      const legacyUid = d.id;
      try {
        const subsQ = query(collection(legacyDb, "subscriptions"), where("userId", "==", legacyUid));
        const subsSnap = await getDocs(subsQ);
        subsSnap.forEach((s) => considerSub(s.data()));
      } catch (e) {
        console.warn("[legacy-migration] subscriptions scan failed:", e);
      }
    }

    if (!bestSubscription) {
      // Nothing to migrate — still mark as checked so we don't repeat
      await setDoc(newUserRef, { legacyMigrated: true }, { merge: true });
      return;
    }

    const sub = bestSubscription as {
      plan: string;
      expiresAt: Date;
      activatedAt?: Date;
      orderId?: string;
      orderTrackingId?: string;
    };

    // 3) Write the subscription onto the new user doc, preserving expiry
    const subscriptionData: Record<string, unknown> = {
      plan: sub.plan,
      expiresAt: Timestamp.fromDate(sub.expiresAt),
      isActive: true,
      activatedAt: Timestamp.fromDate(sub.activatedAt || new Date()),
      userId: newUserId,
      migratedFromLegacy: true,
    };
    if (sub.orderId) subscriptionData.orderId = sub.orderId;
    if (sub.orderTrackingId) subscriptionData.orderTrackingId = sub.orderTrackingId;

    await setDoc(
      newUserRef,
      {
        email: normalizedEmail,
        subscription: subscriptionData,
        legacyMigrated: true,
        legacyMigratedAt: Timestamp.fromDate(new Date()),
      },
      { merge: true },
    );

    // 4) Also mirror into new `subscriptions` collection
    try {
      const subDocId = `${newUserId}_legacy_${sub.expiresAt.getTime()}`;
      await setDoc(doc(db, "subscriptions", subDocId), {
        ...subscriptionData,
        createdAt: Timestamp.fromDate(new Date()),
      });
    } catch (e) {
      console.warn("[legacy-migration] subscriptions mirror failed:", e);
    }

    console.log(
      `[legacy-migration] Migrated subscription for ${normalizedEmail}: ${sub.plan} expires ${sub.expiresAt.toISOString()}`,
    );
  } catch (error) {
    console.error("[legacy-migration] Failed:", error);
  }
}
