import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "@/lib/firebase";
import { resetTodayDownloadCount } from "@/lib/download-limit";
import { migrateLegacySubscription } from "@/lib/legacy-migration";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  isAdmin?: boolean;
  plan?: {
    name: string;
    expiresAt: Date;
    isActive?: boolean;
    activatedAt?: Date;
  };
}

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate();
  }
  return new Date(value as string | number | Date);
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => void;
  resetPassword: (email: string) => Promise<boolean>;
  updatePlan: (planName: string, days: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to convert Firebase user to our User type
async function getUserData(firebaseUser: FirebaseUser): Promise<User> {
  const userDocRef = doc(db, "users", firebaseUser.uid);
  const userDoc = await getDoc(userDocRef);

  if (userDoc.exists()) {
    const data = userDoc.data();
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email || "",
      name: data.name || firebaseUser.displayName || "User",
      avatar: data.avatar || firebaseUser.photoURL || undefined,
      isAdmin: data.isAdmin || false,
      plan: data.subscription
        ? {
            name: data.subscription.plan,
            expiresAt: toDate(data.subscription.expiresAt) || new Date(0),
            isActive: data.subscription.isActive,
            activatedAt: toDate(data.subscription.activatedAt),
          }
        : undefined,
    };
  }

  // If no Firestore doc exists, create one
  const newUser = {
    id: firebaseUser.uid,
    email: firebaseUser.email || "",
    name: firebaseUser.displayName || "User",
    avatar: firebaseUser.photoURL || undefined,
    isAdmin: false,
    createdAt: new Date(),
  };

  await setDoc(userDocRef, newUser);

  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || "",
    name: firebaseUser.displayName || "User",
    avatar: firebaseUser.photoURL || undefined,
    isAdmin: false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen to Firebase auth state changes
    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous user doc listener when switching users/logging out
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }

      if (!firebaseUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, "users", firebaseUser.uid);

        // Ensure the document exists (older accounts / edge cases)
        const existing = await getDoc(userDocRef);
        if (!existing.exists()) {
          const newUser = {
            name: firebaseUser.displayName || "User",
            email: firebaseUser.email || "",
            avatar: firebaseUser.photoURL || undefined,
            isAdmin: false,
            createdAt: new Date(),
          };
          await setDoc(userDocRef, newUser, { merge: true });
        }

        // Migrate legacy subscription (no-op after first run per user)
        await migrateLegacySubscription(firebaseUser.uid, firebaseUser.email);

        // Real-time listener so admin/manual activations immediately reflect in UI + access
        unsubscribeUserDoc = onSnapshot(
          userDocRef,
          (snap) => {
            const data = snap.data() || {};
            const subscription = data.subscription;

            let plan: User["plan"] | undefined;
            if (subscription?.isActive) {
              const expiresAt = toDate(subscription.expiresAt);
              const activatedAt = toDate(subscription.activatedAt);

              if (expiresAt && expiresAt > new Date() && subscription.plan) {
                plan = {
                  name: subscription.plan,
                  expiresAt,
                  isActive: true,
                  activatedAt,
                };
              }
            }

            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || data.email || "",
              name: data.name || firebaseUser.displayName || "User",
              avatar: data.avatar || firebaseUser.photoURL || undefined,
              isAdmin: data.isAdmin || false,
              plan,
            });
            setIsLoading(false);
          },
          (error) => {
            console.error("Error listening to user document:", error);
            setIsLoading(false);
          },
        );
      } catch (error) {
        console.error("Error getting user data:", error);
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      if (unsubscribeUserDoc) unsubscribeUserDoc();
      unsubscribeAuth();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onSnapshot listener will update user state automatically
      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);

      // Update display name
      await updateProfile(result.user, { displayName: name });

      // Create user document in Firestore (merge to avoid duplicates)
      const userDocRef = doc(db, "users", result.user.uid);
      await setDoc(
        userDocRef,
        {
          name,
          email,
          isAdmin: false,
          createdAt: new Date(),
        },
        { merge: true },
      );

      // onSnapshot listener will update user state automatically
      return true;
    } catch (error) {
      console.error("Signup error:", error);
      return false;
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      await signInWithPopup(auth, googleProvider);
      // onSnapshot listener will update user state automatically
      return true;
    } catch (error) {
      console.error("Google login error:", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (error) {
      console.error("Password reset error:", error);
      return false;
    }
  };

  const updatePlan = async (planName: string, days: number) => {
    if (!user) return;

    const expiresAt = new Date();
    if (days === -1) {
      // Lifetime
      expiresAt.setFullYear(expiresAt.getFullYear() + 100);
    } else {
      expiresAt.setDate(expiresAt.getDate() + days);
    }

    const subscription = {
      plan: planName,
      expiresAt,
      isActive: true,
      activatedAt: new Date(),
    };

    // Update Firestore
    const userDocRef = doc(db, "users", user.id);
    await updateDoc(userDocRef, { subscription });

    // Reset today's daily download count for fresh quota
    await resetTodayDownloadCount(user.id);

    setUser({
      ...user,
      plan: {
        name: planName,
        expiresAt,
        isActive: true,
      },
    });
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, signup, loginWithGoogle, logout, resetPassword, updatePlan }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
