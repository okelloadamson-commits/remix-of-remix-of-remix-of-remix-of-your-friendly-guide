import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

// NEW Firebase project — used for EVERYTHING going forward
// (auth, users, subscriptions, transactions, admin writes, new content, etc.)
const firebaseConfig = {
  apiKey: "AIzaSyDDxnyI_tieH-VQlzRJnD8Ykb4ric8VgWo",
  authDomain: "luo-ancient-movies-2.firebaseapp.com",
  databaseURL: "https://luo-ancient-movies-2-default-rtdb.firebaseio.com",
  projectId: "luo-ancient-movies-2",
  storageBucket: "luo-ancient-movies-2.firebasestorage.app",
  messagingSenderId: "651298773881",
  appId: "1:651298773881:web:88e9d7253949f86535ada8",
  measurementId: "G-FQ1YLEBPD2",
};

// LEGACY Firebase project — kept ONLY to keep displaying existing
// movies / series / episodes / adverts / hero images / apps that
// were created before the migration. Read-only.
const legacyFirebaseConfig = {
  apiKey: "AIzaSyBpkKhBusfzM45RsP464KpoABxw1-TBaB8",
  authDomain: "luo-ancient-movies-com.firebaseapp.com",
  databaseURL: "https://luo-ancient-movies-com-default-rtdb.firebaseio.com",
  projectId: "luo-ancient-movies-com",
  storageBucket: "luo-ancient-movies-com.firebasestorage.app",
  messagingSenderId: "86595039806",
  appId: "1:86595039806:web:c2c386f9fd1ea02c0ad76f",
  measurementId: "G-BEH73CPP70",
};

// Initialize primary (new) app
const app = getApps().find((a) => a.name === "[DEFAULT]") ?? initializeApp(firebaseConfig);

// Initialize legacy app under a separate name so both can coexist
const legacyApp =
  getApps().find((a) => a.name === "legacy") ?? initializeApp(legacyFirebaseConfig, "legacy");

// Primary (NEW) services — use these everywhere by default
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export const database = getDatabase(app);

// LEGACY services — read-only fallback for existing content
export const legacyDb = getFirestore(legacyApp);
export const legacyStorage = getStorage(legacyApp);
export const legacyDatabase = getDatabase(legacyApp);

export default app;
