import { database, db } from "./firebase";
import { ref, push, set, get, query, orderByChild, limitToLast, remove } from "firebase/database";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query as fsQuery,
  where,
} from "firebase/firestore";


export interface UserActivity {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  details: string;
  page: string;
  timestamp: number;
}

export async function trackActivity(activity: Omit<UserActivity, "id" | "timestamp">): Promise<void> {
  try {
    const activitiesRef = ref(database, "userActivities");
    const newRef = push(activitiesRef);
    await set(newRef, {
      ...activity,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Failed to track activity:", error);
  }
}

export async function getRecentActivities(count = 200): Promise<UserActivity[]> {
  const activitiesRef = ref(database, "userActivities");
  const q = query(activitiesRef, orderByChild("timestamp"), limitToLast(count));
  const snapshot = await get(q);
  if (!snapshot.exists()) return [];

  const activities: UserActivity[] = [];
  snapshot.forEach((child) => {
    activities.push({ id: child.key!, ...child.val() } as UserActivity);
  });
  return activities.sort((a, b) => b.timestamp - a.timestamp);
}

export async function clearAllActivities(): Promise<void> {
  const activitiesRef = ref(database, "userActivities");
  await set(activitiesRef, null);
}

// ===== Registered Agents (separate store, preserved when clearing activities) =====

export interface RegisteredAgent {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  details: string;
  timestamp: number;
  // Structured details captured at successful payment
  agentName?: string;
  agentBusiness?: string;
  agentLocation?: string;
  phoneNumber?: string;
  planName?: string;
  amount?: number;
  orderId?: string;
  orderTrackingId?: string;
  confirmationCode?: string;
  status?: string; // "pending" | "success" | "failed"
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== "")) as T;
}

const AGENTS_COLLECTION = "registeredAgents";

export async function saveRegisteredAgent(
  agent: Omit<RegisteredAgent, "id" | "timestamp">
): Promise<void> {
  // Never create registrations for initiated, pending, failed, or non-agent orders.
  // Successful callers must include the identifiers returned by Pesapal after
  // transaction verification.
  if (
    agent.status !== "success" ||
    agent.planName !== "Agent Plan" ||
    !agent.orderId ||
    !agent.orderTrackingId ||
    !agent.confirmationCode
  ) {
    console.warn("Skipped unverified agent registration", {
      orderId: agent.orderId,
      status: agent.status,
      planName: agent.planName,
    });
    return;
  }

  const payload = stripUndefined({ ...agent, timestamp: Date.now() });

  // PRIMARY store: Firestore (same place transactions are written successfully).
  let firestoreOk = false;
  try {
    // Upsert by orderId so a record saved at checkout gets enriched later
    // (confirmation code, status) instead of being skipped or duplicated.
    let existingId: string | null = null;
    if (agent.orderId) {
      try {
        const dupSnap = await getDocs(
          fsQuery(collection(db, AGENTS_COLLECTION), where("orderId", "==", agent.orderId))
        );
        if (!dupSnap.empty) existingId = dupSnap.docs[0].id;
      } catch (error) {
        console.warn("Duplicate check for registered agent skipped:", error);
      }
    }
    const docRef = existingId
      ? doc(db, AGENTS_COLLECTION, existingId)
      : doc(collection(db, AGENTS_COLLECTION));
    await setDoc(docRef, payload, { merge: true });
    firestoreOk = true;
    if (existingId) return; // already stored; skip RTDB duplicate
  } catch (error) {
    console.error("Failed to save registered agent to Firestore:", error);
  }

  // FALLBACK store: Realtime Database (kept for older data / redundancy).
  try {
    const newRef = push(ref(database, "registeredAgents"));
    await set(newRef, payload);
  } catch (error) {
    console.error("Failed to save registered agent to RTDB:", error);
    if (!firestoreOk) throw error;
  }
}


export async function getRegisteredAgents(count = 500): Promise<RegisteredAgent[]> {
  const byKey = new Map<string, RegisteredAgent>();
  const keyOf = (a: RegisteredAgent) => a.orderId || a.orderTrackingId || `${a.id}`;

  // Firestore (primary)
  try {
    const snap = await getDocs(collection(db, AGENTS_COLLECTION));
    snap.forEach((d) => {
      const a = { id: d.id, ...(d.data() as Omit<RegisteredAgent, "id">) } as RegisteredAgent;
      byKey.set(keyOf(a), a);
    });
  } catch (error) {
    console.warn("Could not read registered agents from Firestore:", error);
  }

  // RTDB (legacy / fallback)
  try {
    const snapshot = await get(
      query(ref(database, "registeredAgents"), orderByChild("timestamp"), limitToLast(count))
    );
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        const a = { id: `rtdb:${child.key}`, ...child.val() } as RegisteredAgent;
        const k = keyOf(a);
        if (!byKey.has(k)) byKey.set(k, a);
      });
    }
  } catch (error) {
    console.warn("Could not read registered agents from RTDB:", error);
  }

  return Array.from(byKey.values())
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, count);
}

export async function deleteRegisteredAgent(id: string): Promise<void> {
  if (id.startsWith("rtdb:")) {
    await remove(ref(database, `registeredAgents/${id.slice(5)}`));
    return;
  }
  await deleteDoc(doc(db, AGENTS_COLLECTION, id));
}

export async function clearAllRegisteredAgents(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, AGENTS_COLLECTION));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  } catch (error) {
    console.warn("Could not clear Firestore registered agents:", error);
  }
  try {
    await set(ref(database, "registeredAgents"), null);
  } catch (error) {
    console.warn("Could not clear RTDB registered agents:", error);
  }
}

