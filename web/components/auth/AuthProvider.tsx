"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { UserProfile } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  userProfile: Partial<UserProfile> | null;
  role: "member" | "employer" | "admin" | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  userProfile: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<Partial<UserProfile> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    // 10s safety timeout
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 10_000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser && db) {
        try {
          const snap = await getDoc(doc(db, "users", firebaseUser.uid));
          setUserProfile(snap.exists() ? ({ uid: snap.id, ...snap.data() } as Partial<UserProfile>) : null);
        } catch {
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
      clearTimeout(timeout);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const signOut = async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
    setUser(null);
    setUserProfile(null);
  };

  const role = userProfile?.role === "admin"
    ? "admin"
    : userProfile?.accountType === "organization"
      ? "employer"
      : user
        ? "member"
        : null;

  return (
    <AuthContext.Provider value={{ user, userProfile, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
