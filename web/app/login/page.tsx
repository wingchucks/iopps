"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import {
  AuthLayout,
  GoogleSignInButton,
  AuthDivider,
  AuthInput,
} from "@/components/auth";

// Helper to get redirect path based on user role
async function getRedirectPath(userId: string): Promise<string> {
  if (!db) return "/member/dashboard";

  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      const role = userDoc.data()?.role;
      if (role === "admin" || role === "moderator") {
        return "/admin";
      }
      if (role === "employer") {
        return "/organization/dashboard";
      }
    }
  } catch (error) {
    console.error("Error fetching user role:", error);
  }

  return "/member/dashboard";
}

export default function LoginPage() {
  const router = useRouter();
  const { signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!auth) {
      setError("Authentication is not available in offline mode. Please contact support.");
      return;
    }

    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const redirectPath = await getRedirectPath(cred.user.uid);
      router.push(redirectPath);
    } catch (err) {
      console.error(err);
      setError(getAuthErrorMessage(err, "Unable to sign in. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      await signInWithGoogle();
      // For Google sign-in, check role after auth completes
      if (auth?.currentUser) {
        const redirectPath = await getRedirectPath(auth.currentUser.uid);
        router.push(redirectPath);
      } else {
        router.push("/member/dashboard");
      }
    } catch (err) {
      console.error(err);
      setError(getAuthErrorMessage(err, "Unable to sign in with Google. Please try again."));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout title="Sign In" subtitle="Welcome back">
      {error && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <GoogleSignInButton
        onClick={handleGoogleSignIn}
        loading={googleLoading}
        disabled={loading}
      />

      <AuthDivider />

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-800/80 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          rightElement={
            <Link
              href="/forgot-password"
              className="text-xs text-[#14B8A6] hover:underline"
            >
              Forgot password?
            </Link>
          }
        />

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full rounded-full bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Signing in...
            </span>
          ) : (
            "Sign in"
          )}
        </button>

        <p className="text-center text-sm text-slate-400">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-[#14B8A6] hover:underline">
            Create account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
