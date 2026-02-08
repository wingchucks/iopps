"use client";

import {
  onAuthStateChanged,
  signOut,
  signInWithPopup,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { auth, db, googleProvider } from "@/lib/firebase";
import { UserRole } from "@/lib/types";

// Super admin emails from environment variable (comma-separated)
// These users get admin role even if their database record is missing or has different role
const SUPER_ADMIN_EMAILS = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function isSuperAdmin(email: string | null): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}

type AuthContextValue = {
  user: FirebaseUser | null;
  role: UserRole | null;
  loading: boolean;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<{ isNewUser: boolean }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: handle missing auth
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser && db) {
        // Subscribe to real-time user profile changes
        const ref = doc(db, "users", firebaseUser.uid);

        const unsubscribeSnapshot = onSnapshot(
          ref,
          (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              // Super admin override from env variable
              if (isSuperAdmin(firebaseUser.email)) {
                setRole("admin");
              } else {
                setRole((data.role as UserRole) ?? null);
              }
            } else {
              // Super admin override even if doc doesn't exist
              if (isSuperAdmin(firebaseUser.email)) {
                setRole("admin");
              } else {
                setRole(null);
              }
            }
            setLoading(false);
          },
          (error) => {
            console.error("Error listening to user profile:", error);
            // Super admin override on error
            if (isSuperAdmin(firebaseUser.email)) {
              setRole("admin");
            } else {
              setRole(null);
            }
            setLoading(false);
          }
        );

        // Cleanup snapshot listener when auth state changes or component unmounts
        return () => unsubscribeSnapshot();
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    if (!auth) throw new Error("Auth not available");
    await signOut(auth);
  };

  const signInWithGoogle = async (): Promise<{ isNewUser: boolean }> => {
    if (!auth || !db) {
      throw new Error("Authentication is not available in offline mode");
    }

    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Super admin - skip Firestore operations to avoid permission errors
    if (isSuperAdmin(user.email)) {
      return { isNewUser: false };
    }

    try {
      // Check if user document exists
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const isNewUser = !userSnap.exists();

      if (isNewUser) {
        // Create new user document with default role
        await setDoc(userRef, {
          id: user.uid,
          email: user.email,
          displayName: user.displayName || "",
          photoURL: user.photoURL || "",
          role: "community", // Default role for new Google sign-ins
          createdAt: serverTimestamp(),
        });
      } else {
        // Update existing user with latest profile info
        const existingData = userSnap.data();
        await setDoc(
          userRef,
          {
            email: user.email,
            displayName: user.displayName || existingData.displayName || "",
            photoURL: user.photoURL || existingData.photoURL || "",
          },
          { merge: true }
        );
      }

      return { isNewUser };
    } catch (error) {
      console.error("Error during sign-in Firestore operations:", error);
      // Return false for isNewUser on error - user is still authenticated
      return { isNewUser: false };
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, logout, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
