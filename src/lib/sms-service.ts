import { db } from "./firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";

export const DEFAULT_SENDER_ID = "EgoSMS";

export interface SmsRecipient {
  userId: string;
  name: string;
  email: string;
  phone: string; // normalized 256XXXXXXXXX
  plan?: string;
  /** Subscription currently active */
  subscribed: boolean;
  /** Subscribed at some point, even if it has expired */
  everSubscribed: boolean;
}

export interface SmsLog {
  id?: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  senderId: string;
  status: "sent" | "failed";
  providerMessage?: string;
  type: "manual" | "movie" | "episode";
  createdAt: Date;
}

/** Normalize a Ugandan number to international 256XXXXXXXXX form. */
export function normalizeUgPhone(raw: string): string | null {
  const digits = (raw || "").replace(/[^\d]/g, "");
  if (!digits) return null;
  let n = digits;
  if (n.startsWith("00")) n = n.slice(2);
  if (n.startsWith("256")) return n.length === 12 ? n : null;
  if (n.startsWith("0")) n = n.slice(1);
  if (n.length === 9) return `256${n}`;
  return null;
}

/**
 * Subscribers with a usable phone number.
 * Phones come from payment records (users collection has no phone field),
 * matched back to the user by id or email.
 */
export async function getSmsRecipients(): Promise<SmsRecipient[]> {
  const [usersSnap, userTxSnap, txSnap, subsSnap, cbSnap] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(collection(db, "userTransactions")).catch(() => null),
    getDocs(collection(db, "transactions")).catch(() => null),
    getDocs(collection(db, "subscriptions")).catch(() => null),
    getDocs(collection(db, "paymentCallbacks")).catch(() => null),
  ]);

  // Subscriptions collection: track both currently active and ever-subscribed
  const activeSubUsers = new Map<string, string>(); // userId -> plan
  const everSubUsers = new Map<string, string>(); // userId -> plan (even expired)
  const everSubEmails = new Set<string>();
  subsSnap?.forEach((d) => {
    const x = d.data() as Record<string, any>;
    const exp = x.expiresAt?.toDate ? x.expiresAt.toDate() : x.expiresAt ? new Date(x.expiresAt) : null;
    const active = Boolean(x.isActive) && (!exp || exp.getTime() > Date.now());
    const plan = x.plan || x.planName || "Subscribed";
    if (x.userId) {
      everSubUsers.set(x.userId, plan);
      if (active) activeSubUsers.set(x.userId, plan);
    }
    if (x.userEmail || x.email) everSubEmails.add(String(x.userEmail || x.email).toLowerCase());
  });

  // Anyone with a recorded payment has subscribed at least once
  const markEverSub = (uid: string, email: string, plan?: string) => {
    if (uid && !everSubUsers.has(uid)) everSubUsers.set(uid, plan || "Expired");
    if (email) everSubEmails.add(email.toLowerCase());
  };

  const phoneByUser = new Map<string, string>();
  const phoneByEmail = new Map<string, string>();
  const addPhone = (uid: string, email: string, phone: string) => {
    const p = normalizeUgPhone(phone);
    if (!p) return;
    if (uid) phoneByUser.set(uid, p);
    if (email) phoneByEmail.set(email.toLowerCase(), p);
  };
  userTxSnap?.forEach((d) => {
    const x = d.data() as Record<string, string>;
    addPhone(x.userId || "", x.userEmail || "", x.phoneNumber || "");
    markEverSub(x.userId || "", x.userEmail || "", x.planName);
  });
  txSnap?.forEach((d) => {
    const x = d.data() as Record<string, string>;
    addPhone(x.userId || "", x.userEmail || "", x.phoneNumber || "");
    if ((x.status || "success") === "success") {
      markEverSub(x.userId || "", x.userEmail || "", x.planName);
    }
  });
  cbSnap?.forEach((d) => {
    const x = d.data() as Record<string, string>;
    addPhone(x.userId || "", x.userEmail || x.email || "", x.phoneNumber || x.phone || "");
  });

  const recipients: SmsRecipient[] = [];
  usersSnap.forEach((d) => {
    const data = d.data() as Record<string, any>;
    const email = (data.email || "").toLowerCase();
    const phone =
      normalizeUgPhone(data.phoneNumber || data.phone || "") ||
      phoneByUser.get(d.id) ||
      phoneByEmail.get(email) ||
      null;
    if (!phone) return;
    const sub = data.subscription;
    const expiresAt = sub?.expiresAt?.toDate ? sub.expiresAt.toDate() : sub?.expiresAt ? new Date(sub.expiresAt) : null;
    const subscribed =
      Boolean(sub?.isActive && (!expiresAt || expiresAt.getTime() > Date.now())) ||
      activeSubUsers.has(d.id);
    const everSubscribed =
      subscribed ||
      Boolean(sub?.plan) ||
      everSubUsers.has(d.id) ||
      (email ? everSubEmails.has(email) : false);
    recipients.push({
      userId: d.id,
      name: data.name || data.displayName || "there",
      email: data.email || "",
      phone,
      plan: sub?.plan || activeSubUsers.get(d.id) || everSubUsers.get(d.id),
      subscribed,
      everSubscribed,
    });
  });

  // de-duplicate by phone
  const seen = new Set<string>();
  return recipients.filter((r) => (seen.has(r.phone) ? false : (seen.add(r.phone), true)));
}

async function logSms(entry: Omit<SmsLog, "id">) {
  const ref = doc(collection(db, "smsLogs"));
  await setDoc(ref, { ...entry, createdAt: Timestamp.fromDate(entry.createdAt) });
}

export async function getSmsLogs(): Promise<SmsLog[]> {
  const snap = await getDocs(collection(db, "smsLogs"));
  const logs: SmsLog[] = [];
  snap.forEach((d) => {
    const x = d.data() as Record<string, any>;
    logs.push({
      id: d.id,
      userId: x.userId || "",
      name: x.name || "",
      email: x.email || "",
      phone: x.phone || "",
      message: x.message || "",
      senderId: x.senderId || DEFAULT_SENDER_ID,
      status: x.status || "sent",
      providerMessage: x.providerMessage || "",
      type: x.type || "manual",
      createdAt: x.createdAt?.toDate ? x.createdAt.toDate() : new Date(x.createdAt),
    });
  });
  logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return logs;
}

export async function deleteSmsLog(id: string): Promise<void> {
  await deleteDoc(doc(db, "smsLogs", id));
}

/** Replace {name} in the template per recipient and send in one API call. */
export async function sendSms(
  recipients: SmsRecipient[],
  template: string,
  options: { senderId?: string; type?: SmsLog["type"] } = {},
): Promise<{ sent: number; failed: number; providerMessage: string }> {
  const senderId = options.senderId || DEFAULT_SENDER_ID;
  const type = options.type || "manual";
  const list = recipients.filter((r) => r.phone);
  if (list.length === 0) return { sent: 0, failed: 0, providerMessage: "No recipients" };

  const messages = list.map((r) => ({
    number: r.phone,
    message: template.replace(/\{name\}/gi, r.name || "there"),
    senderid: senderId,
  }));

  let ok = false;
  let providerMessage = "";
  try {
    const res = await fetch("/api/public/send-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, senderid: senderId }),
    });
    const data = await res.json();
    const provider = data?.provider ?? data;
    providerMessage = provider?.Message || provider?.message || (res.ok ? "Sent" : "Failed");
    ok = res.ok && String(provider?.Status ?? "OK").toUpperCase() === "OK";
  } catch (error) {
    providerMessage = error instanceof Error ? error.message : "Network error";
  }

  await Promise.all(
    list.map((r, i) =>
      logSms({
        userId: r.userId,
        name: r.name,
        email: r.email,
        phone: r.phone,
        message: messages[i].message,
        senderId,
        status: ok ? "sent" : "failed",
        providerMessage,
        type,
        createdAt: new Date(),
      }).catch(() => undefined),
    ),
  );

  return { sent: ok ? list.length : 0, failed: ok ? 0 : list.length, providerMessage };
}


export function watchLinkForMovie(id: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/watch/${id}`;
}

export function watchLinkForSeries(seriesId: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/watch/series/${seriesId}`;
}
