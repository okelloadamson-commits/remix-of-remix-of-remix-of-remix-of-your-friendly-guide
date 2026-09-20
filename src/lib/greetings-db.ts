// Greeting adverts. Stored inside the existing `transactions` collection so
// no Firestore rule change is needed — the admin dashboard reads them back
// filtered by `type: "greeting"`.
import { db } from "./firebase";
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, Timestamp } from "firebase/firestore";

export const GREETING_PRICE = 5000;
export const GREETING_PLAN_NAME = "Greeting Advert";

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
  const docRef = doc(db, "transactions", id);
  const existing = await getDoc(docRef);
  if (existing.exists()) return id;

  await setDoc(docRef, {
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
  });
  return id;
}

export async function getGreetingAdverts(): Promise<GreetingAdvert[]> {
  const snapshot = await getDocs(collection(db, "transactions"));
  const list: GreetingAdvert[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as Record<string, any>;
    if (data.type !== "greeting") return;
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
  });
  list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return list;
}

export async function deleteGreetingAdvert(id: string): Promise<void> {
  await deleteDoc(doc(db, "transactions", id));
}
