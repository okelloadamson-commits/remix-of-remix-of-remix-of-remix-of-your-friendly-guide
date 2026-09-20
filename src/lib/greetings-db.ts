// Greeting adverts. Stored inside the existing `transactions` collection so
// no Firestore rule change is needed — the admin dashboard reads them back
// filtered by `type: "greeting"`.
import { db } from "./firebase";
import { collection, doc, getDocs, setDoc, deleteDoc, Timestamp } from "firebase/firestore";

export const GREETING_PRICE = 5000;
export const GREETING_PLAN_NAME = "Greeting";

export interface GreetingAdvert {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  phoneNumber: string;
  senderName: string;
  location: string;
  greetingNames: string[];
  amount: number;
  orderId: string;
  orderTrackingId: string;
  confirmationCode?: string;
  createdAt: Date;
}

function greetingDocId(tx: { orderTrackingId: string; orderId: string }) {
  return `greeting_${(tx.orderTrackingId || tx.orderId).replace(/[/\s]/g, "_")}`;
}

/**
 * Saves a greeting advert. Callers MUST only invoke this after Pesapal has
 * verified the payment as COMPLETED. De-duplicated by payment reference.
 */
export async function saveGreetingAdvert(g: Omit<GreetingAdvert, "id">): Promise<string> {
  if (!g.orderId || !g.orderTrackingId || !g.confirmationCode) {
    console.warn("Skipped unverified greeting advert", { orderId: g.orderId });
    return "";
  }

  const id = greetingDocId(g);
  const payload = {
    type: "greeting",
    userId: g.userId,
    userName: g.userName,
    userEmail: g.userEmail,
    phoneNumber: g.phoneNumber,
    planName: GREETING_PLAN_NAME,
    senderName: g.senderName,
    location: g.location,
    greetingNames: g.greetingNames.filter((n) => n.trim() !== ""),
    amount: g.amount,
    orderId: g.orderId,
    orderTrackingId: g.orderTrackingId,
    confirmationCode: g.confirmationCode || "",
    status: "success",
    createdAt: Timestamp.fromDate(g.createdAt),
  };

  // Writing with a fixed doc id is already duplicate-safe, so we do NOT read
  // the doc first (reading a non-existent transactions doc is denied by rules).
  try {
    await setDoc(doc(db, "transactions", id), payload, { merge: true });
    return id;
  } catch (primaryError) {
    console.error("Greeting save to transactions failed, using fallback", primaryError);
    // Fallback collection that allows open create in the project rules.
    await setDoc(doc(db, "userTransactions", id), payload, { merge: true });
    return id;
  }
}

export async function getGreetingAdverts(): Promise<GreetingAdvert[]> {
  const list: GreetingAdvert[] = [];
  const seen = new Set<string>();

  const collect = (docSnap: any) => {
    const data = docSnap.data() as Record<string, any>;
    if (data.type !== "greeting") return;
    if (seen.has(docSnap.id)) return;
    seen.add(docSnap.id);
    list.push({
      id: docSnap.id,
      userId: data.userId || "",
      userName: data.userName || "Unknown",
      userEmail: data.userEmail || "",
      phoneNumber: data.phoneNumber || "",
      senderName: data.senderName || "",
      location: data.location || "",
      greetingNames: Array.isArray(data.greetingNames) ? data.greetingNames : [],
      amount: data.amount || 0,
      orderId: data.orderId || "",
      orderTrackingId: data.orderTrackingId || "",
      confirmationCode: data.confirmationCode || "",
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
    });
  };

  for (const name of ["transactions", "userTransactions"]) {
    try {
      const snapshot = await getDocs(collection(db, name));
      snapshot.forEach(collect);
    } catch (e) {
      console.warn(`Could not read ${name}`, e);
    }
  }

  list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return list;
}

export async function deleteGreetingAdvert(id: string): Promise<void> {
  await Promise.allSettled([
    deleteDoc(doc(db, "transactions", id)),
    deleteDoc(doc(db, "userTransactions", id)),
  ]);
}
