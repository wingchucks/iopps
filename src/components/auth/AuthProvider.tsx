"use client";

import { useState, useEffect } from "react";
import { useAuth as useBaseAuth } from "@/lib/auth-context";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserRole } from "@/lib/auth";

export function useAuth() {
  const base = useBaseAuth();
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    if (base.loading || !base.user) {
      setRole(null);
      return;
    }

    // Check custom claims first, then Firestore
    base.user.getIdTokenResult().then((result) => {
      if (result.claims.admin === true || result.claims.role === "admin") {
        setRole("admin");
      } else if (result.claims.role) {
        setRole(result.claims.role as UserRole);
      } else {
        // Fallback to Firestore
        getDoc(doc(db, "users", base.user!.uid)).then((snap) => {
          setRole(snap.exists() ? (snap.data().role as UserRole) || "community" : "community");
        }).catch(() => setRole("community"));
      }
    }).catch(() => setRole(null));
  }, [base.user, base.loading]);

  return { user: base.user, role, loading: base.loading, signOut: base.signOut };
}
