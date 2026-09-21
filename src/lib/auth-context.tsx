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
import { buildEmailVerificationContinueUrl } from "@/lib/auth-verification-email";
import { auth, getAppCheckTokenValue } from "./firebase";
import { authErrorMessage } from "@/lib/auth-errors";
import { clearSignupDraft } from "@/lib/signup-draft";

export interface SignupOutcome {
  user: User;
  verificationEmailSent: boolean;
  verificationError: string;
  profileError: string;
  sessionReady: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<UserCredential>;
  signUp: (name: string, email: string, password: string, nextPath?: string) => Promise<SignupOutcome>;
  signInWithGoogle: () => Promise<UserCredential>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerificationEmail: (nextPath?: string, expectedUid?: string) => Promise<boolean>;
  reloadUser: (expectedUid?: string) => Promise<boolean>;
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
      if (auth.currentUser?.uid !== user.uid) return false;
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
      if (auth.currentUser) return false;
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

function getClientSiteUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://www.iopps.ca";
}

async function requestAccountVerificationEmail(user: User, nextPath?: string): Promise<boolean> {
  if (user.emailVerified) return false;
  // Never invoke real email delivery in demo emulator runs.
  if (process.env.NEXT_PUBLIC_USE_EMULATORS === "true") {
    await sendEmailVerification(user, {
      url: buildEmailVerificationContinueUrl(getClientSiteUrl(), nextPath),
      handleCodeInApp: false,
    });
    return true;
  }
  {
    const [idToken, appCheckToken] = await Promise.all([
      user.getIdToken(),
      getAppCheckTokenValue(),
    ]);

    const response = await fetchWithTimeout("/api/auth/verification-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
        ...(appCheckToken ? { "X-Firebase-AppCheck": appCheckToken } : {}),
      },
      body: JSON.stringify({ nextPath }),
    });

    // Never bypass an authentication, attestation or rate-limit denial.
    if (!response.ok) {
      throw Object.assign(new Error("Verification email unavailable"), {
        code: response.status === 429 ? "auth/too-many-requests" : "auth/verification-email-unavailable",
      });
    }
    const result = await response.json();
    if (result.sent === true) return true;
    if (result.alreadyVerified === true) return false;
    throw new Error("Verification email delivery was not confirmed");
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let previousUid: string | null = null;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // This provider outlives signup routes. Invalidate before any async session
      // work, including sign-out or cross-tab changes while signup is unmounted.
      // Initial anonymous resolution is not a boundary: allow reload recovery.
      // Clear storage only; the current signup retains its in-memory transition.
      if (firebaseUser || previousUid !== null) clearSignupDraft();
      previousUid = firebaseUser?.uid ?? null;
      setLoading(true);

      // Sync session cookie BEFORE updating user state so the middleware
      // cookie is ready by the time any component tries to navigate to a
      // protected route (prevents the black-screen race condition).
      const sessionReady = await ensureSessionCookie(firebaseUser);

      if (auth.currentUser?.uid !== firebaseUser?.uid) return;
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

  const signUp = async (name: string, email: string, password: string, nextPath?: string) => {
    // Only the credential returned by this creation proves this attempt succeeded.
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    let profileError = "";
    let verificationError = "";
    let verificationEmailSent = false;
    try { await updateProfile(cred.user, { displayName: name }); }
    catch (error) { profileError = `Your account was created, but your name could not be saved. ${authErrorMessage(error, "You can update it in settings.")}`; }
    try { verificationEmailSent = await requestAccountVerificationEmail(cred.user, nextPath); }
    catch (error) { verificationError = `Your account was created, but the verification email couldn’t be sent. ${authErrorMessage(error, "Please retry below.")}`; }
    const sessionReady = auth.currentUser?.uid === cred.user.uid && await ensureSessionCookie(cred.user);
    return { user: cred.user, verificationEmailSent, verificationError, profileError, sessionReady };
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
    if (process.env.NEXT_PUBLIC_USE_EMULATORS === "true") { await sendPasswordResetEmail(auth, email); return; }
    const appCheck = await getAppCheckTokenValue();
    const response = await fetch("/api/auth/password-reset", { method: "POST", headers: { "Content-Type": "application/json", ...(appCheck ? { "X-Firebase-AppCheck": appCheck } : {}) }, body: JSON.stringify({ email }) });
    if (!response.ok) throw Object.assign(new Error("Password recovery is temporarily unavailable."), { code: response.status === 429 ? "auth/too-many-requests" : "auth/recovery-unavailable" });
  };

  const resendVerificationEmail = async (nextPath?: string, expectedUid?: string) => {
    const current = auth.currentUser;
    if (!current || (expectedUid && current.uid !== expectedUid)) {
      throw Object.assign(new Error("Sign in again"), { code: "auth/user-token-expired" });
    }
    return requestAccountVerificationEmail(current, nextPath);
  };

  const reloadUser = async (expectedUid?: string) => {
    const current = auth.currentUser;
    const assertIdentity = () => {
      if (!current || auth.currentUser?.uid !== current.uid || (expectedUid && current.uid !== expectedUid)) {
        throw Object.assign(new Error("Sign in again"), { code: "auth/user-token-expired" });
      }
    };
    assertIdentity();
    await current!.reload();
    assertIdentity();
    await current!.getIdToken(true);
    assertIdentity();
    const sessionReady = await ensureSessionCookie(current);
    assertIdentity();
    if (!sessionReady) throw new Error("Unable to refresh your secure session right now.");
    setUser(current);
    return current!.emailVerified;
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
