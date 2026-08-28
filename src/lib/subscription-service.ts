import { doc, setDoc, getDoc, updateDoc, Timestamp, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { planDurations } from "./pesapal";
import { resetTodayDownloadCount } from "./download-limit";

export interface Subscription {
  plan: string;
  expiresAt: Date;
  isActive: boolean;
  orderId?: string;
  orderTrackingId?: string;
  activatedAt?: Date;
  userId?: string;
}

// Check if user has active subscription - checks both users collection and subscriptions collection
// Automatically deactivates expired subscriptions in Firestore
export async function checkUserSubscription(userId: string): Promise<Subscription | null> {
  try {
    // First check the users collection (legacy support)
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (data.subscription) {
        const expiresAt = data.subscription.expiresAt?.toDate?.() || new Date(data.subscription.expiresAt);
        const isExpired = new Date() > expiresAt;
        
        if (!isExpired && data.subscription.isActive) {
          return {
            plan: data.subscription.plan,
            expiresAt,
            isActive: true,
            orderId: data.subscription.orderId,
            orderTrackingId: data.subscription.orderTrackingId,
            activatedAt: data.subscription.activatedAt?.toDate?.() || undefined,
            userId,
          };
        }

        // Auto-deactivate expired subscription on the user doc
        if (isExpired && data.subscription.isActive) {
          try {
            await updateDoc(userDocRef, { "subscription.isActive": false });
            console.log("[Sub] Auto-deactivated expired subscription for user:", userId);
          } catch (e) {
            console.error("[Sub] Failed to auto-deactivate user subscription:", e);
          }
        }
      }
    }

    // Also check subscriptions collection
    const subscriptionsRef = collection(db, "subscriptions");
    const q = query(subscriptionsRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    let latestSubscription: Subscription | null = null;
    let latestExpiry = new Date(0);
    const expiredIds: string[] = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const expiresAt = data.expiresAt?.toDate?.() || new Date(data.expiresAt);
      const isExpired = new Date() > expiresAt;

      if (!isExpired && data.isActive && expiresAt > latestExpiry) {
        latestExpiry = expiresAt;
        latestSubscription = {
          plan: data.plan,
          expiresAt,
          isActive: true,
          orderId: data.orderId,
          orderTrackingId: data.orderTrackingId,
          activatedAt: data.activatedAt?.toDate?.() || undefined,
          userId: data.userId,
        };
      } else if (isExpired && data.isActive) {
        expiredIds.push(docSnap.id);
      }
    });

    // Fire-and-forget: deactivate expired docs
    if (expiredIds.length > 0) {
      Promise.all(
        expiredIds.map((id) =>
          updateDoc(doc(db, "subscriptions", id), { isActive: false }).catch((e) =>
            console.error("[Sub] Failed to auto-deactivate sub doc:", id, e)
          )
        )
      );
    }

    return latestSubscription;
  } catch (error) {
    console.error("Error checking subscription:", error);
    return null;
  }
}

// Activate subscription after successful payment
export async function activateSubscription(
  userId: string,
  planName: string,
  orderId: string,
  orderTrackingId?: string
): Promise<boolean> {
  try {
    const days = planDurations[planName];
    if (days === undefined) {
      console.error("Invalid plan name:", planName);
      return false;
    }

    const now = new Date();
    let expiresAt: Date;

    if (days === -1) {
      // Lifetime subscription - set to 100 years from now
      expiresAt = new Date(now);
      expiresAt.setFullYear(expiresAt.getFullYear() + 100);
    } else {
      // Exact duration in milliseconds (e.g. 2 days = exactly 48 hours from now)
      expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    }

    const subscriptionData = {
      plan: planName,
      expiresAt: Timestamp.fromDate(expiresAt),
      isActive: true,
      orderId,
      orderTrackingId: orderTrackingId || null,
      activatedAt: Timestamp.fromDate(now),
      userId,
    };

    // Save to users collection (for backward compatibility)
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      await setDoc(userDocRef, {
        ...userDoc.data(),
        subscription: subscriptionData,
      }, { merge: true });
    } else {
      await setDoc(userDocRef, {
        subscription: subscriptionData,
      });
    }

    // Also save to subscriptions collection
    const subscriptionDocRef = doc(db, "subscriptions", `${userId}_${orderId}`);
    await setDoc(subscriptionDocRef, {
      ...subscriptionData,
      createdAt: Timestamp.fromDate(now),
    });

    // Reset today's daily download count so user gets fresh quota on new/upgraded plan
    await resetTodayDownloadCount(userId);

    return true;
  } catch (error) {
    console.error("Error activating subscription:", error);
    return false;
  }
}

// Deactivate subscription
export async function deactivateSubscription(userId: string): Promise<boolean> {
  try {
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      await setDoc(userDocRef, {
        ...userDoc.data(),
        subscription: {
          ...userDoc.data().subscription,
          isActive: false,
        },
      }, { merge: true });
    }
    
    return true;
  } catch (error) {
    console.error("Error deactivating subscription:", error);
    return false;
  }
}

// Get subscription status text
export function getSubscriptionStatusText(subscription: Subscription | null): string {
  if (!subscription) {
    return "No active subscription";
  }

  if (!subscription.isActive) {
    return "Subscription expired";
  }

  const now = new Date();
  const expiresAt = new Date(subscription.expiresAt);
  const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft > 36500) {
    return `${subscription.plan} - Lifetime access`;
  }

  if (daysLeft <= 0) {
    return "Subscription expired";
  }

  if (daysLeft === 1) {
    return `${subscription.plan} - Expires tomorrow`;
  }

  return `${subscription.plan} - ${daysLeft} days remaining`;
}
