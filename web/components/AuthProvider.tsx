"use client";

import {
  onAuthStateChanged,
  signOut,
  signInWithPopup,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { auth, db, googleProvider } from "@/lib/firebase";

type UserRole = "community" | "employer";

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
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser && db) {
        try {
          const ref = doc(db, "users", firebaseUser.uid);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const data = snap.data() as { role?: UserRole };
            setRole(data.role ?? null);
          } else {
            setRole(null);
          }
        } catch (error) {
          console.error("Error loading user profile", error);
          setRole(null);
        }
      } else {
        setRole(null);
      }

      setLoading(false);
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
