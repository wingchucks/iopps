"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import {
  AuthLayout,
  GoogleSignInButton,
  AuthDivider,
  AuthInput,
} from "@/components/auth";

export default function MemberSignupPage() {
  const router = useRouter();
  const { signInWithGoogle, redirectLoading, user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Handle return from Google redirect sign-in
  useEffect(() => {
    if (!redirectLoading && user) {
      router.push("/onboarding/member");
    }
  }, [redirectLoading, user, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!auth || !db) {
      setError("Authentication is not available. Please try again later.");
      return;
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: displayName.trim() });
      await setDoc(doc(db!, "users", cred.user.uid), {
        id: cred.user.uid,
        role: "community",
        displayName: displayName.trim(),
        email: cred.user.email,
        createdAt: serverTimestamp(),
      });

      // Notify admin
      try {
        await fetch("/api/admin/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "new_user",
            userEmail: cred.user.email,
            userName: displayName.trim(),
          }),
        });
      } catch {}

      // Send verification email
      try {
        await sendEmailVerification(cred.user);
      } catch {}

      router.push("/onboarding/member");
    } catch (err) {
      setError(getAuthErrorMessage(err, "Could not create account. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const { isNewUser } = await signInWithGoogle();
      if (isNewUser && auth?.currentUser && db) {
        await setDoc(
          doc(db!, "users", auth.currentUser.uid),
          { role: "community" },
          { merge: true }
        );
        try {
          await fetch("/api/admin/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "new_user",
              userEmail: auth.currentUser.email,
              userName: auth.currentUser.displayName || "Google User",
            }),
          });
        } catch {}
      }
      router.push(isNewUser ? "/onboarding/member" : "/discover");
    } catch (err) {
      setError(getAuthErrorMessage(err, "Unable to sign in with Google."));
    } finally {
      setGoogleLoading(false);
    }
  };

  if (redirectLoading) {
    return (
      <AuthLayout title="Create your account" subtitle="Join the IOPPS community">
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <svg className="animate-spin h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm text-foreground0">Completing Google sign-in...</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create your account" subtitle="Join the IOPPS community">
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <GoogleSignInButton
        onClick={handleGoogleSignIn}
        loading={googleLoading}
        disabled={loading}
      />

      <AuthDivider text="Or sign up with email" />

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 sm:p-8 shadow-sm"
      >
        <AuthInput
          label="Full Name"
          type="text"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your full name"
          autoComplete="name"
        />

        <AuthInput
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />

        <AuthInput
          label="Password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="Must be at least 6 characters"
          autoComplete="new-password"
        />

        <AuthInput
          label="Confirm Password"
          type="password"
          required
          minLength={6}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Creating account...
            </span>
          ) : (
            "Create account"
          )}
        </button>

        <p className="text-center text-xs text-[var(--text-muted)]">
          By creating an account you agree to our{" "}
          <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link>
          {" "}and{" "}
          <Link href="/terms" className="text-accent hover:underline">Terms of Service</Link>
        </p>

        <p className="text-center text-sm text-[var(--text-secondary)]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-accent hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
