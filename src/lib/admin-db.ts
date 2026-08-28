import { database, legacyDatabase, db } from "./firebase";
import { ref, push, set, get, update, remove, type Database } from "firebase/database";
import { collection, getDocs, doc, updateDoc, deleteDoc, Timestamp, getDoc, setDoc, query, orderBy, limit, where, writeBatch } from "firebase/firestore";
import type { Movie, Series, Episode, Advert, HeroImage, App, Comedy } from "./firebase-db";
import { resetTodayDownloadCount } from "./download-limit";

// Pick the DB that actually contains the entity at `path`. New DB wins;
// fall back to legacy so editing/deleting old content keeps working.
async function pickDbForPath(path: string): Promise<Database> {
  const newSnap = await get(ref(database, path)).catch(() => null);
  if (newSnap && newSnap.exists()) return database;
  const legacySnap = await get(ref(legacyDatabase, path)).catch(() => null);
  if (legacySnap && legacySnap.exists()) return legacyDatabase;
  return database;
}

// Count unique ids across new + legacy at `path`
async function mergedCount(path: string): Promise<number> {
  const [a, b] = await Promise.all([
    get(ref(database, path)).catch(() => null),
    get(ref(legacyDatabase, path)).catch(() => null),
  ]);
  const ids = new Set<string>();
  if (a && a.exists()) a.forEach((c) => { if (c.key) ids.add(c.key); });
  if (b && b.exists()) b.forEach((c) => { if (c.key) ids.add(c.key); });
  return ids.size;
}

export interface Transaction {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  phoneNumber: string;
  planName: string;
  amount: number;
  orderId: string;
  orderTrackingId: string;
  status: "success" | "failed" | "pending";
  confirmationCode?: string;
  failedReason?: string;
  createdAt: Date;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  avatar?: string;
  subscription?: {
    plan: string;
    expiresAt: Date;
    isActive: boolean;
  };
  createdAt?: Date;
  lastActive?: Date;
  watchTime?: number;
}

// ============== MOVIES ==============
export async function createMovie(movie: Omit<Movie, "id">): Promise<string> {
  const moviesRef = ref(database, "movies");
  const newMovieRef = push(moviesRef);
  await set(newMovieRef, { ...movie, createdAt: Date.now() });
  return newMovieRef.key || "";
}

export async function updateMovie(id: string, movie: Partial<Movie>): Promise<void> {
  const d = await pickDbForPath(`movies/${id}`);
  await update(ref(d, `movies/${id}`), movie);
}

export async function deleteMovie(id: string): Promise<void> {
  const d = await pickDbForPath(`movies/${id}`);
  await remove(ref(d, `movies/${id}`));
}

// ============== COMEDIES ==============
export async function createComedy(comedy: Omit<Comedy, "id">): Promise<string> {
  const comediesRef = ref(database, "comedies");
  const newRef = push(comediesRef);
  await set(newRef, { ...comedy, createdAt: Date.now() });
  return newRef.key || "";
}

export async function updateComedy(id: string, comedy: Partial<Comedy>): Promise<void> {
  const d = await pickDbForPath(`comedies/${id}`);
  await update(ref(d, `comedies/${id}`), comedy);
}

export async function deleteComedy(id: string): Promise<void> {
  const d = await pickDbForPath(`comedies/${id}`);
  await remove(ref(d, `comedies/${id}`));
}

// ============== SERIES ==============
export async function createSeries(series: Omit<Series, "id">): Promise<string> {
  const seriesRef = ref(database, "series");
  const newSeriesRef = push(seriesRef);
  await set(newSeriesRef, { ...series, createdAt: Date.now() });
  return newSeriesRef.key || "";
}

export async function updateSeries(id: string, series: Partial<Series>): Promise<void> {
  const d = await pickDbForPath(`series/${id}`);
  await update(ref(d, `series/${id}`), series);
}

export async function deleteSeries(id: string): Promise<void> {
  const d = await pickDbForPath(`series/${id}`);
  await remove(ref(d, `series/${id}`));
}

// ============== EPISODES ==============
export async function createEpisode(episode: Omit<Episode, "id">): Promise<string> {
  const episodesRef = ref(database, "episodes");
  const newEpisodeRef = push(episodesRef);
  await set(newEpisodeRef, { ...episode, createdAt: Date.now() });
  return newEpisodeRef.key || "";
}

export async function updateEpisode(id: string, episode: Partial<Episode>): Promise<void> {
  const d = await pickDbForPath(`episodes/${id}`);
  await update(ref(d, `episodes/${id}`), episode);
}

export async function deleteEpisode(id: string): Promise<void> {
  const d = await pickDbForPath(`episodes/${id}`);
  await remove(ref(d, `episodes/${id}`));
}

export async function getAllEpisodes(): Promise<Episode[]> {
  const [a, b] = await Promise.all([
    get(ref(database, "episodes")).catch(() => null),
    get(ref(legacyDatabase, "episodes")).catch(() => null),
  ]);
  const map: Record<string, Episode> = {};
  // Legacy first, then new overwrites on collision
  if (b && b.exists()) b.forEach((c) => { if (c.key) map[c.key] = { id: c.key, ...c.val() } as Episode; });
  if (a && a.exists()) a.forEach((c) => { if (c.key) map[c.key] = { id: c.key, ...c.val() } as Episode; });
  return Object.values(map);
}

// ============== ADVERTS/GUIDE ==============
export async function createAdvert(advert: Omit<Advert, "id">): Promise<string> {
  const advertsRef = ref(database, "adverts");
  const newAdvertRef = push(advertsRef);
  await set(newAdvertRef, { ...advert, createdAt: Date.now() });
  return newAdvertRef.key || "";
}

export async function updateAdvert(id: string, advert: Partial<Advert>): Promise<void> {
  const d = await pickDbForPath(`adverts/${id}`);
  await update(ref(d, `adverts/${id}`), advert);
}

export async function deleteAdvert(id: string): Promise<void> {
  const d = await pickDbForPath(`adverts/${id}`);
  await remove(ref(d, `adverts/${id}`));
}

// ============== HERO IMAGES ==============
export async function createHeroImage(heroImage: Omit<HeroImage, "id">): Promise<string> {
  const heroImagesRef = ref(database, "heroImages");
  const newHeroImageRef = push(heroImagesRef);
  await set(newHeroImageRef, { ...heroImage, createdAt: Date.now() });
  return newHeroImageRef.key || "";
}

export async function updateHeroImage(id: string, heroImage: Partial<HeroImage>): Promise<void> {
  const d = await pickDbForPath(`heroImages/${id}`);
  await update(ref(d, `heroImages/${id}`), heroImage);
}

export async function deleteHeroImage(id: string): Promise<void> {
  const d = await pickDbForPath(`heroImages/${id}`);
  await remove(ref(d, `heroImages/${id}`));
}

// ============== APPS ==============
export async function createApp(app: Omit<App, "id">): Promise<string> {
  const appsRef = ref(database, "apps");
  const newAppRef = push(appsRef);
  await set(newAppRef, { ...app, createdAt: Date.now() });
  return newAppRef.key || "";
}

export async function updateApp(id: string, app: Partial<App>): Promise<void> {
  const d = await pickDbForPath(`apps/${id}`);
  await update(ref(d, `apps/${id}`), app);
}

export async function deleteApp(id: string): Promise<void> {
  const d = await pickDbForPath(`apps/${id}`);
  await remove(ref(d, `apps/${id}`));
}

// ============== USERS ==============
export async function getAllUsers(): Promise<UserData[]> {
  const usersRef = collection(db, "users");
  const snapshot = await getDocs(usersRef);
  const users: UserData[] = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    users.push({
      id: doc.id,
      name: data.name || "Unknown",
      email: data.email || "",
      isAdmin: data.isAdmin || false,
      avatar: data.avatar,
      subscription: data.subscription ? {
        plan: data.subscription.plan,
        expiresAt: data.subscription.expiresAt?.toDate ? data.subscription.expiresAt.toDate() : new Date(data.subscription.expiresAt),
        isActive: data.subscription.isActive,
      } : undefined,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : undefined,
    });
  });
  return users;
}

export async function updateUserSubscription(
  userId: string, 
  plan: string, 
  days: number
): Promise<void> {
  console.log("[Admin] Activating subscription:", { userId, plan, days });
  
  const userRef = doc(db, "users", userId);
  const now = new Date();
  let expiresAt: Date;
  
  if (days === -1) {
    // Lifetime
    expiresAt = new Date(now);
    expiresAt.setFullYear(expiresAt.getFullYear() + 100);
  } else {
    // Exact duration in milliseconds (e.g. 2 days = exactly 48 hours from now)
    expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }
  
  console.log("[Admin] Subscription will expire at:", expiresAt.toISOString());
  
  const subscriptionData = {
    plan,
    expiresAt: Timestamp.fromDate(expiresAt),
    isActive: true,
    activatedAt: Timestamp.fromDate(now),
    activatedBy: "admin",
  };
  
  // Use setDoc with merge to handle both existing and new documents
  await setDoc(userRef, {
    subscription: subscriptionData
  }, { merge: true });
  
  console.log("[Admin] Subscription saved to users collection for:", userId);
  
  // Also create in subscriptions collection for consistency
  const subscriptionDocRef = doc(db, "subscriptions", `${userId}_admin_${now.getTime()}`);
  await setDoc(subscriptionDocRef, {
    ...subscriptionData,
    userId,
    orderId: `admin_${now.getTime()}`,
    createdAt: Timestamp.fromDate(now),
  });
  
  console.log("[Admin] Subscription also saved to subscriptions collection");

  // Reset today's daily download count so user gets fresh quota on new/upgraded plan
  try {
    await resetTodayDownloadCount(userId);
    console.log("[Admin] Daily download count reset for:", userId);
  } catch (e) {
    console.error("[Admin] Failed to reset daily download count:", e);
  }
}

export async function removeUserSubscription(userId: string): Promise<void> {
  const userRef = doc(db, "users", userId);
  // Clear subscription completely so the app doesn't treat an incomplete object as an active plan
  await setDoc(
    userRef,
    {
      subscription: null,
    },
    { merge: true }
  );

  // Also deactivate all entries in the subscriptions collection so the fallback check doesn't re-grant access
  const subscriptionsRef = collection(db, "subscriptions");
  const q = query(subscriptionsRef, where("userId", "==", userId));
  const snapshot = await getDocs(q);
  const deactivatePromises: Promise<void>[] = [];
  snapshot.forEach((docSnap) => {
    deactivatePromises.push(
      updateDoc(doc(db, "subscriptions", docSnap.id), { isActive: false })
    );
  });
  await Promise.all(deactivatePromises);
}

export async function deleteUser(userId: string): Promise<void> {
  const userRef = doc(db, "users", userId);
  await deleteDoc(userRef);
}

// ============== ADMIN PASSWORD ==============
export async function updateAdminPassword(newPassword: string): Promise<void> {
  const adminConfigRef = doc(db, "config", "admin");
  await setDoc(adminConfigRef, { 
    password: newPassword,
    updatedAt: new Date() 
  }, { merge: true });
}

// ============== STATS ==============
export async function getAdminStats(): Promise<{
  totalMovies: number;
  totalSeries: number;
  totalEpisodes: number;
  totalUsers: number;
  activeSubscriptions: number;
  totalAdverts: number;
  totalHeroImages: number;
  totalApps: number;
}> {
  const [totalMovies, totalSeries, totalEpisodes, totalAdverts, totalHeroImages, totalApps, users] = await Promise.all([
    mergedCount("movies"),
    mergedCount("series"),
    mergedCount("episodes"),
    mergedCount("adverts"),
    mergedCount("heroImages"),
    mergedCount("apps"),
    getAllUsers(),
  ]);

  const activeSubscriptions = users.filter(user =>
    user.subscription?.isActive &&
    user.subscription.expiresAt &&
    new Date(user.subscription.expiresAt) > new Date()
  ).length;

  return {
    totalMovies,
    totalSeries,
    totalEpisodes,
    totalUsers: users.length,
    activeSubscriptions,
    totalAdverts,
    totalHeroImages,
    totalApps,
  };
}

// ============== TRANSACTIONS ==============
export async function saveTransaction(transaction: Omit<Transaction, "id">): Promise<string> {
  const transactionsRef = collection(db, "transactions");
  const docRef = doc(transactionsRef);
  await setDoc(docRef, {
    ...transaction,
    createdAt: Timestamp.fromDate(transaction.createdAt),
  });
  return docRef.id;
}

export async function deleteTransaction(id: string): Promise<void> {
  const transactionRef = doc(db, "transactions", id);
  await deleteDoc(transactionRef);
}

export async function getTransactions(): Promise<Transaction[]> {
  const transactionsRef = collection(db, "transactions");
  const snapshot = await getDocs(transactionsRef);
  const transactions: Transaction[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    transactions.push({
      id: docSnap.id,
      userId: data.userId || "",
      userName: data.userName || "Unknown",
      userEmail: data.userEmail || "",
      phoneNumber: data.phoneNumber || "",
      planName: data.planName || "",
      amount: data.amount || 0,
      orderId: data.orderId || "",
      orderTrackingId: data.orderTrackingId || "",
      status: data.status || "pending",
      confirmationCode: data.confirmationCode,
      failedReason: data.failedReason || "",
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
    });
  });
  // Sort newest first
  transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return transactions;
}

// ============== GIFT DAY (free 1-day bonus for all users) ==============
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const GIFT_PLAN_NAME = "Gift Day (Luo Ancient Movies)";

export interface GiftDayState {
  active: boolean;
  recipients: string[];
  grantedAt?: Date;
}

export async function getGiftDayState(): Promise<GiftDayState> {
  const snap = await getDoc(doc(db, "config", "giftDay"));
  if (!snap.exists()) return { active: false, recipients: [] };
  const d = snap.data();
  return {
    active: !!d.active,
    recipients: Array.isArray(d.recipients) ? d.recipients : [],
    grantedAt: d.grantedAt?.toDate?.() ?? undefined,
  };
}

export async function giftOneDayToAllUsers(): Promise<number> {
  const users = await getAllUsers();
  const now = new Date();
  const recipients: string[] = [];

  // Batch writes (Firestore limit: 500 ops/batch) for much faster processing
  const CHUNK = 450;
  for (let i = 0; i < users.length; i += CHUNK) {
    const batch = writeBatch(db);
    const slice = users.slice(i, i + CHUNK);
    for (const user of slice) {
      const userRef = doc(db, "users", user.id);
      const sub = user.subscription;
      const hasActive =
        sub?.isActive && sub.expiresAt && new Date(sub.expiresAt) > now;

      // Skip users who already have an active paid subscription — only
      // gift the free day to users without active access.
      if (hasActive) continue;

      const newExpiry = new Date(now.getTime() + ONE_DAY_MS);

      batch.set(
        userRef,
        {
          subscription: {
            plan: GIFT_PLAN_NAME,
            expiresAt: Timestamp.fromDate(newExpiry),
            isActive: true,
            activatedAt: Timestamp.fromDate(now),
            activatedBy: "admin-gift-day",
            giftDayApplied: true,
          },
        },
        { merge: true }
      );
      recipients.push(user.id);
    }
    await batch.commit();
  }

  await setDoc(doc(db, "config", "giftDay"), {
    active: true,
    recipients,
    grantedAt: Timestamp.fromDate(now),
  });

  return recipients.length;
}

export async function revokeGiftDayFromAllUsers(): Promise<number> {
  const state = await getGiftDayState();
  if (!state.active || state.recipients.length === 0) {
    await setDoc(doc(db, "config", "giftDay"), { active: false, recipients: [] });
    return 0;
  }

  const now = new Date();
  let count = 0;

  // Fetch all recipient docs in parallel, then batch the writes
  const snaps = await Promise.all(
    state.recipients.map((uid) => getDoc(doc(db, "users", uid)))
  );

  const CHUNK = 450;
  type Op = { userId: string; sub: any; expiresAt: Date };
  const ops: Op[] = [];
  snaps.forEach((snap, idx) => {
    if (!snap.exists()) return;
    const data = snap.data();
    const sub = data.subscription;
    if (!sub?.expiresAt) return;
    const expiresAt: Date = sub.expiresAt?.toDate
      ? sub.expiresAt.toDate()
      : new Date(sub.expiresAt);
    ops.push({ userId: state.recipients[idx], sub, expiresAt });
  });

  for (let i = 0; i < ops.length; i += CHUNK) {
    const batch = writeBatch(db);
    const slice = ops.slice(i, i + CHUNK);
    for (const { userId, sub, expiresAt } of slice) {
      const userRef = doc(db, "users", userId);
      const reduced = new Date(expiresAt.getTime() - ONE_DAY_MS);
      if (sub.plan === GIFT_PLAN_NAME || reduced <= now) {
        batch.set(userRef, { subscription: null }, { merge: true });
      } else {
        batch.set(
          userRef,
          {
            subscription: {
              ...sub,
              expiresAt: Timestamp.fromDate(reduced),
              giftDayApplied: false,
            },
          },
          { merge: true }
        );
      }
      count++;
    }
    await batch.commit();
  }

  await setDoc(doc(db, "config", "giftDay"), { active: false, recipients: [] });
  return count;
}
// ============== USER TRANSACTIONS (successful payments only, de-duplicated) ==============
export interface UserTransaction {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  phoneNumber: string;
  planName: string;
  amount: number;
  orderId: string;
  orderTrackingId: string;
  confirmationCode?: string;
  createdAt: Date;
}

// Doc id is derived from the payment reference, so re-visiting the callback
// page (or a retry) can never create a duplicate record.
function userTransactionDocId(tx: { orderTrackingId: string; orderId: string }) {
  return (tx.orderTrackingId || tx.orderId).replace(/[/\s]/g, "_");
}

export async function saveUserTransaction(tx: Omit<UserTransaction, "id">): Promise<string> {
  const id = userTransactionDocId(tx);
  const docRef = doc(db, "userTransactions", id);
  const existing = await getDoc(docRef);
  if (existing.exists()) return id;
  await setDoc(docRef, {
    ...tx,
    status: "success",
    createdAt: Timestamp.fromDate(tx.createdAt),
  });
  return id;
}

export async function getUserTransactions(): Promise<UserTransaction[]> {
  const snapshot = await getDocs(collection(db, "userTransactions"));
  const list: UserTransaction[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    list.push({
      id: docSnap.id,
      userId: data.userId || "",
      userName: data.userName || "Unknown",
      userEmail: data.userEmail || "",
      phoneNumber: data.phoneNumber || "",
      planName: data.planName || "",
      amount: data.amount || 0,
      orderId: data.orderId || "",
      orderTrackingId: data.orderTrackingId || "",
      confirmationCode: data.confirmationCode || "",
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
    });
  });
  list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return list;
}

export async function deleteUserTransaction(id: string): Promise<void> {
  await deleteDoc(doc(db, "userTransactions", id));
}
