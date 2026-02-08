"use client";

import {
  onAuthStateChanged,
  signOut,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
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
  redirectLoading: boolean;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<{ isNewUser: boolean }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirectLoading, setRedirectLoading] = useState(false);
  const redirectHandled = useRef(false);

  /** Create or update user doc in Firestore after Google sign-in */
  const ensureUserDoc = async (fbUser: FirebaseUser): Promise<{ isNewUser: boolean }> => {
    // Super admin - skip Firestore operations to avoid permission errors
    if (isSuperAdmin(fbUser.email)) {
      return { isNewUser: false };
    }

    if (!db) return { isNewUser: false };

    try {
      const userRef = doc(db, "users", fbUser.uid);
      const userSnap = await getDoc(userRef);
      const isNewUser = !userSnap.exists();

      if (isNewUser) {
        await setDoc(userRef, {
          id: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || "",
          photoURL: fbUser.photoURL || "",
          role: "community",
          createdAt: serverTimestamp(),
        });
      } else {
        const existingData = userSnap.data();
        await setDoc(
          userRef,
          {
            email: fbUser.email,
            displayName: fbUser.displayName || existingData.displayName || "",
            photoURL: fbUser.photoURL || existingData.photoURL || "",
          },
          { merge: true }
        );
      }

      return { isNewUser };
    } catch (error) {
      console.error("Error during sign-in Firestore operations:", error);
      return { isNewUser: false };
    }
  };

  /* ---- Handle redirect result on mount (for signInWithRedirect flow) ---- */
  useEffect(() => {
    if (!auth || redirectHandled.current) return;
    redirectHandled.current = true;

    // Check if we're returning from a redirect sign-in
    const pending = sessionStorage.getItem("iopps_google_redirect");
    if (pending) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: show loading during redirect return
      setRedirectLoading(true);
      getRedirectResult(auth)
        .then(async (result) => {
          if (result?.user) {
            sessionStorage.removeItem("iopps_google_redirect");
            // Firestore user doc creation is handled in ensureUserDoc
            await ensureUserDoc(result.user);
          }
        })
        .catch((err) => {
          console.error("Redirect sign-in error:", err);
        })
        .finally(() => {
          sessionStorage.removeItem("iopps_google_redirect");
          setRedirectLoading(false);
        });
    }
  }, []);

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

    try {
      // Try popup first (best UX — no page navigation)
      const result = await signInWithPopup(auth, googleProvider);
      return await ensureUserDoc(result.user);
    } catch (popupError) {
      const errorCode = (popupError as { code?: string })?.code;

      // If popup failed due to browser blocking (third-party cookies, popup blocker),
      // fall back to redirect flow which is more reliable
      if (
        errorCode === "auth/popup-closed-by-user" ||
        errorCode === "auth/popup-blocked" ||
        errorCode === "auth/cancelled-popup-request"
      ) {
        // Mark that we're starting a redirect so we can handle the result on return
        sessionStorage.setItem("iopps_google_redirect", "1");
        await signInWithRedirect(auth, googleProvider);
        // Page will navigate away — this promise won't resolve
        return { isNewUser: false };
      }

      // Re-throw other errors (invalid-credential, network, etc.)
      throw popupError;
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, redirectLoading, logout, signInWithGoogle }}>
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
