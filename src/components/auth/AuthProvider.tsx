"use client";

import { useState, useEffect } from "react";
import { useAuth as useBaseAuth } from "@/lib/auth-context";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserRole } from "@/lib/auth";

export function useAuth() {
  const base = useBaseAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    if (base.loading) {
      setRoleLoading(true);
      return;
    }

    if (!base.user) {
      setRole(null);
      setRoleLoading(false);
      return;
    }

    setRoleLoading(true);

    // Check custom claims first, then Firestore
    base.user
      .getIdTokenResult()
      .then((result) => {
        if (result.claims.admin === true || result.claims.role === "admin") {
          setRole("admin");
          setRoleLoading(false);
        } else if (result.claims.role) {
          setRole(result.claims.role as UserRole);
          setRoleLoading(false);
        } else {
          // Fallback to Firestore
          getDoc(doc(db, "users", base.user!.uid))
            .then((snap) => {
              setRole(
                snap.exists()
                  ? (snap.data().role as UserRole) || "community"
                  : "community"
              );
            })
            .catch(() => setRole("community"))
            .finally(() => setRoleLoading(false));
        }
      })
      .catch(() => {
        setRole(null);
        setRoleLoading(false);
      });
  }, [base.user, base.loading]);

  const handleSignOut = async () => {
    setRole(null);
    await base.signOut();
  };

  return {
    user: base.user,
    role,
    loading: base.loading || roleLoading,
    signOut: handleSignOut,
  };
}
