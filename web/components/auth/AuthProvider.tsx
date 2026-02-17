"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";
import type { UserRole } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserProfile {
  id: string;
  role: UserRole;
  displayName: string;
  email: string;
  photoURL?: string;
  contactPerson?: string;
  createdAt?: unknown;
}

interface AuthContextValue {
  /** Firebase Auth user object (null when signed out) */
  user: FirebaseUser | null;
  /** Firestore user profile data */
  userProfile: UserProfile | null;
  /** Shorthand role derived from userProfile */
  role: UserRole | null;
  /** True while the initial auth state is being determined */
  loading: boolean;
  /** True while returning from a Google redirect sign-in */
  redirectLoading: boolean;
  /** Sign out and redirect to homepage */
  signOut: () => Promise<void>;
  /** Sign in with Google (popup with redirect fallback) */
  signInWithGoogle: () => Promise<{ isNewUser: boolean }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirectLoading, setRedirectLoading] = useState(false);
  const redirectHandled = useRef(false);

  // Safety timeout: if loading stays true for >10s, force it to false
  // Prevents infinite spinner if Firestore snapshot never resolves
  useEffect(() => {
    if (!loading) return;
    const timeout = setTimeout(() => {
      console.warn("[AuthProvider] Loading timeout (10s). Forcing loading=false.");
      setLoading(false);
    }, 10000);
    return () => clearTimeout(timeout);
  }, [loading]);

  // ---- Ensure a Firestore user doc exists after Google sign-in ----
  const ensureUserDoc = async (
    fbUser: FirebaseUser
  ): Promise<{ isNewUser: boolean }> => {
    if (!db) return { isNewUser: false };

    try {
      const userRef = doc(db, "users", fbUser.uid);
      const snap = await getDoc(userRef);
      const isNewUser = !snap.exists();

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
        // Merge latest auth profile data
        await setDoc(
          userRef,
          {
            email: fbUser.email,
            displayName:
              fbUser.displayName || snap.data()?.displayName || "",
            photoURL: fbUser.photoURL || snap.data()?.photoURL || "",
          },
          { merge: true }
        );
      }

      return { isNewUser };
    } catch (err) {
      console.error("Error ensuring user doc:", err);
      return { isNewUser: false };
    }
  };

  // ---- Handle returning from a Google redirect sign-in ----
  useEffect(() => {
    if (!auth || redirectHandled.current) return;
    redirectHandled.current = true;

    const pending =
      typeof window !== "undefined" &&
      sessionStorage.getItem("iopps_google_redirect");

    if (pending) {
      setRedirectLoading(true);
      getRedirectResult(auth)
        .then(async (result) => {
          if (result?.user) {
            sessionStorage.removeItem("iopps_google_redirect");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Subscribe to auth state + Firestore profile ----
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser && db) {
        const userRef = doc(db, "users", firebaseUser.uid);

        const unsubscribeProfile = onSnapshot(
          userRef,
          async (snap) => {
            if (snap.exists()) {
              const data = snap.data() as UserProfile;
              setUserProfile(data);
              setRole((data.role as UserRole) ?? null);
            } else {
              // Auto-create missing profile to prevent blank screens
              try {
                await setDoc(userRef, {
                  id: firebaseUser.uid,
                  email: firebaseUser.email,
                  displayName: firebaseUser.displayName || "",
                  photoURL: firebaseUser.photoURL || "",
                  role: "community",
                  createdAt: serverTimestamp(),
                });
                // onSnapshot will re-fire with the new doc
              } catch (err) {
                console.error("Failed to bootstrap user profile:", err);
                setUserProfile(null);
                setRole(null);
              }
            }
            setLoading(false);
          },
          (err) => {
            console.error("Error listening to user profile:", err);
            setUserProfile(null);
            setRole(null);
            setLoading(false);
          }
        );

        return () => unsubscribeProfile();
      } else {
        setUserProfile(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Actions ----

  const handleSignOut = async () => {
    if (!auth) throw new Error("Auth not available");
    await firebaseSignOut(auth);
    window.location.href = "/";
  };

  const signInWithGoogleFn = async (): Promise<{ isNewUser: boolean }> => {
    if (!auth || !db) {
      throw new Error("Authentication is not available");
    }

    try {
      const result = await signInWithPopup(auth, googleProvider);
      return await ensureUserDoc(result.user);
    } catch (popupError) {
      const code = (popupError as { code?: string })?.code;

      // Fall back to redirect when popup is blocked
      if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/popup-blocked" ||
        code === "auth/cancelled-popup-request"
      ) {
        sessionStorage.setItem("iopps_google_redirect", "1");
        await signInWithRedirect(auth, googleProvider);
        return { isNewUser: false };
      }

      throw popupError;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        role,
        loading,
        redirectLoading,
        signOut: handleSignOut,
        signInWithGoogle: signInWithGoogleFn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
