"use client";

import { FormEvent, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/components/auth/AuthProvider";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Firebase error code -> user-friendly message */
const AUTH_ERRORS: Record<string, string> = {
  "auth/invalid-credential": "Invalid email or password. Please try again.",
  "auth/user-not-found": "Invalid email or password. Please try again.",
  "auth/wrong-password": "Invalid email or password. Please try again.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/user-disabled":
    "This account has been disabled. Please contact support.",
  "auth/too-many-requests":
    "Too many failed attempts. Please wait a few minutes and try again.",
  "auth/network-request-failed":
    "Network error. Please check your connection and try again.",
};

function getErrorMessage(err: unknown, fallback: string): string {
  const code = (err as { code?: string })?.code;
  if (code && AUTH_ERRORS[code]) return AUTH_ERRORS[code];
  return fallback;
}

/** Determine where to send the user after login based on their Firestore role */
async function getRedirectPath(uid: string): Promise<string> {
  if (!db) return "/member/dashboard";

  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const role = snap.data()?.role;
      if (role === "admin" || role === "moderator") return "/admin";
      if (role === "employer") return "/organization/dashboard";
    }
  } catch (err) {
    console.error("Error fetching user role:", err);
  }

  return "/member/dashboard";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthShell><div className="flex justify-center py-12"><Spinner className="h-8 w-8" /></div></AuthShell>}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");

  const { signInWithGoogle, redirectLoading, user } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Auto-redirect when returning from a Google redirect flow
  useEffect(() => {
    if (!redirectLoading && user) {
      // Always compute role-based path; only honor redirectTo if it's a known valid route
      getRedirectPath(user.uid).then((rolePath) => {
        const SAFE_PREFIXES = ["/member", "/admin", "/org", "/organization", "/me", "/home"];
        const safe = redirectTo && SAFE_PREFIXES.some(p => redirectTo.startsWith(p));
        router.push(safe ? redirectTo : rolePath);
      });
    }
  }, [redirectLoading, user, router, redirectTo]);

  // ---- Email/password submit ----
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!auth) {
      setError("Authentication is not available. Please try again later.");
      return;
    }

    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const rolePath = await getRedirectPath(cred.user.uid);
      const SAFE_PREFIXES = ["/member", "/admin", "/org", "/organization", "/me", "/home"];
      const safe = redirectTo && SAFE_PREFIXES.some(p => redirectTo.startsWith(p));
      router.push(safe ? redirectTo : rolePath);
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, "Unable to sign in. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  // ---- Google sign-in ----
  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      await signInWithGoogle();

      const SAFE_PREFIXES = ["/member", "/admin", "/org", "/organization", "/me", "/home"];
      const safe = redirectTo && SAFE_PREFIXES.some(p => redirectTo.startsWith(p));

      if (safe) {
        router.push(redirectTo);
      } else if (auth?.currentUser) {
        const path = await getRedirectPath(auth.currentUser.uid);
        router.push(path);
      } else {
        router.push("/member/dashboard");
      }
    } catch (err) {
      console.error(err);
      setError(
        getErrorMessage(err, "Unable to sign in with Google. Please try again.")
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  // While returning from Google redirect, show a spinner
  if (redirectLoading) {
    return (
      <AuthShell>
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <Spinner className="h-8 w-8" />
          <p className="text-sm text-[var(--text-secondary)]">
            Completing Google sign-in...
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
        Sign In
      </h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">Welcome back</p>

      {error && (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Google sign-in */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading || googleLoading}
        className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-[var(--border)] bg-[var(--card-bg)] px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <GoogleIcon />
        {googleLoading ? "Signing in..." : "Continue with Google"}
      </button>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--border)]" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-[var(--background)] px-4 text-[var(--text-muted)]">
            Or sign in with email
          </span>
        </div>
      </div>

      {/* Email / password form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-sm sm:p-8"
      >
        <div>
          <label
            htmlFor="login-email"
            className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
          >
            Email
          </label>
          <input
            id="login-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="text-sm font-medium text-[var(--text-primary)]"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-[var(--accent)] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="login-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner className="h-4 w-4" />
              Signing in...
            </span>
          ) : (
            "Sign in"
          )}
        </button>

        <p className="text-center text-sm text-[var(--text-secondary)]">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-[var(--accent)] hover:underline"
          >
            Create account
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] flex-col bg-[var(--background)]">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:py-20">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
