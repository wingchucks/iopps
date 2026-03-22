"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  type User,
  type UserCredential,
} from "firebase/auth";
import { auth } from "./firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<UserCredential>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<UserCredential>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  reloadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs = 8000,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

/** Sync Firebase ID token to httpOnly session cookie */
async function syncSessionCookie(
  user: User | null,
  options?: { forceRefresh?: boolean },
): Promise<boolean> {
  if (user) {
    try {
      const idToken = await user.getIdToken(options?.forceRefresh === true);
      const response = await fetchWithTimeout("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      return response.ok;
    } catch {
      return false;
    }
  } else {
    try {
      const response = await fetchWithTimeout("/api/auth/session", { method: "DELETE" });
      return response.ok;
    } catch {
      return false;
    }
  }

  return false;
}

async function ensureSessionCookie(user: User | null): Promise<boolean> {
  if (!user) {
    await syncSessionCookie(null);
    return true;
  }

  const firstAttempt = await syncSessionCookie(user);
  if (firstAttempt) return true;

  return syncSessionCookie(user, { forceRefresh: true });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      // Sync session cookie BEFORE updating user state so the middleware
      // cookie is ready by the time any component tries to navigate to a
      // protected route (prevents the black-screen race condition).
      const sessionReady = await ensureSessionCookie(firebaseUser);

      if (firebaseUser && !sessionReady) {
        await firebaseSignOut(auth).catch(() => {});
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const sessionReady = await ensureSessionCookie(cred.user);
    if (!sessionReady) {
      await firebaseSignOut(auth).catch(() => {});
      throw new Error("We signed you in, but could not start a secure session. Please try again.");
    }
    return cred;
  };

  const signUp = async (name: string, email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await sendEmailVerification(cred.user);
    const sessionReady = await ensureSessionCookie(cred.user);
    if (!sessionReady) {
      await firebaseSignOut(auth).catch(() => {});
      throw new Error("Your account was created, but we could not start a secure session. Please sign in again.");
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const cred = await signInWithPopup(auth, provider);
    const sessionReady = await ensureSessionCookie(cred.user);
    if (!sessionReady) {
      await firebaseSignOut(auth).catch(() => {});
      throw new Error("We signed you in, but could not start a secure session. Please try again.");
    }
    return cred;
  };

  const signOut = async () => {
    await fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});
    await firebaseSignOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email, {
      url: "https://iopps.ca/login",
      handleCodeInApp: false,
    });
  };

  const resendVerificationEmail = async () => {
    if (auth.currentUser && !auth.currentUser.emailVerified) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const reloadUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setUser(auth.currentUser);
      // Re-sync cookie after reload to update email_verified claim
      const sessionReady = await ensureSessionCookie(auth.currentUser);
      if (!sessionReady) {
        throw new Error("Unable to refresh your secure session right now.");
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signOut, resetPassword, sendVerificationEmail: resendVerificationEmail, reloadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
