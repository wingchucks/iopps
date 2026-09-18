"use client";

import { useState, useEffect } from "react";
import { useAuth as useBaseAuth } from "@/lib/auth-context";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserRole } from "@/lib/auth";

export function useAuth() {
  const base = useBaseAuth();
  const [resolved, setResolved] = useState<{
    user: typeof base.user;
    role: UserRole | null;
  } | null>(null);

  useEffect(() => {
    if (base.loading || !base.user) return;
    const user = base.user;
    let cancelled = false;
    const finish = (role: UserRole | null) => {
      if (!cancelled) setResolved({ user, role });
    };

    // Check custom claims first, then Firestore
    user
      .getIdTokenResult()
      .then((result) => {
        if (cancelled) return;
        if (result.claims.admin === true || result.claims.role === "admin") {
          finish("admin");
        } else if (result.claims.role) {
          finish(result.claims.role as UserRole);
        } else {
          // Fallback to Firestore
          getDoc(doc(db, "users", user.uid))
            .then((snap) => {
              finish(
                snap.exists()
                  ? (snap.data().role as UserRole) || "community"
                  : "community"
              );
            })
            .catch(() => finish("community"));
        }
      })
      .catch(() => {
        finish(null);
      });
    return () => { cancelled = true; };
  }, [base.user, base.loading]);

  return {
    user: base.user,
    role: !base.loading && base.user && resolved?.user === base.user ? resolved.role : null,
    loading: base.loading || Boolean(base.user && resolved?.user !== base.user),
    signOut: base.signOut,
  };
}
