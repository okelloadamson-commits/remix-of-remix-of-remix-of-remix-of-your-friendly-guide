import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./AuthContext";

const ADMIN_EMAIL = "lightstarrecord@gmail.com";

interface AdminContextType {
  isAdmin: boolean;
  isAdminAuthenticated: boolean;
  isCheckingAdmin: boolean;
  verifyAdminPassword: (password: string) => Promise<boolean>;
  logoutAdmin: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  useEffect(() => {
    // Check if current user is the admin email
    if (user?.email === ADMIN_EMAIL) {
      setIsAdmin(true);
      // Check if admin was already authenticated in this session
      const adminSession = sessionStorage.getItem("adminAuthenticated");
      if (adminSession === "true") {
        setIsAdminAuthenticated(true);
      }
    } else {
      setIsAdmin(false);
      setIsAdminAuthenticated(false);
    }
    setIsCheckingAdmin(false);
  }, [user]);

  const verifyAdminPassword = async (password: string): Promise<boolean> => {
    try {
      // Get admin password from Firebase
      const adminConfigRef = doc(db, "config", "admin");
      const adminConfigDoc = await getDoc(adminConfigRef);
      
      if (adminConfigDoc.exists()) {
        const storedPassword = adminConfigDoc.data().password;
        if (password === storedPassword) {
          setIsAdminAuthenticated(true);
          sessionStorage.setItem("adminAuthenticated", "true");
          return true;
        }
      } else {
        // If no admin password exists, create a default one (admin should change it)
        await setDoc(adminConfigRef, { 
          password: "admin123", // Default password
          createdAt: new Date() 
        });
        if (password === "admin123") {
          setIsAdminAuthenticated(true);
          sessionStorage.setItem("adminAuthenticated", "true");
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error verifying admin password:", error);
      return false;
    }
  };

  const logoutAdmin = () => {
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem("adminAuthenticated");
  };

  return (
    <AdminContext.Provider value={{ 
      isAdmin, 
      isAdminAuthenticated, 
      isCheckingAdmin,
      verifyAdminPassword, 
      logoutAdmin 
    }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}
