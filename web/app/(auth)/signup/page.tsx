"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/components/auth/AuthProvider";

// ---------------------------------------------------------------------------
// Error helper
// ---------------------------------------------------------------------------

const AUTH_ERRORS: Record<string, string> = {
  "auth/email-already-in-use":
    "An account with this email already exists. Try signing in instead.",
  "auth/weak-password":
    "Password is too weak. Please use at least 6 characters.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/operation-not-allowed":
    "This sign-in method is not enabled. Please contact support.",
  "auth/network-request-failed":
    "Network error. Please check your connection and try again.",
};

function getErrorMessage(err: unknown, fallback: string): string {
  const code = (err as { code?: string })?.code;
  if (code && AUTH_ERRORS[code]) return AUTH_ERRORS[code];
  return fallback;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SignupPath = "select" | "member" | "organization";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SignupPage() {
  const [path, setPath] = useState<SignupPath>("select");

  return (
    <div className="flex min-h-[60vh] flex-col bg-[var(--background)]">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:py-20">
        <div className="w-full max-w-2xl">
          {path === "select" && <RoleSelect onSelect={setPath} />}
          {path === "member" && <MemberSignup onBack={() => setPath("select")} />}
          {path === "organization" && (
            <OrganizationSignup onBack={() => setPath("select")} />
          )}
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Role selection
// ---------------------------------------------------------------------------

function RoleSelect({
  onSelect,
}: {
  onSelect: (p: SignupPath) => void;
}) {
  return (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
          Join IOPPS
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)] sm:text-base">
          Choose how you&apos;d like to get started
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-6">
        {/* Community Member */}
        <button
          type="button"
          onClick={() => onSelect("member")}
          className="group relative rounded-2xl border-l-4 border-l-[var(--accent)] border-y border-r border-[var(--border)] bg-[var(--card-bg)] p-6 text-left shadow-sm transition hover:shadow-md sm:p-8"
        >
          <span className="inline-flex items-center rounded-full bg-[var(--accent)]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
            Always free
          </span>

          <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent)]/10">
            <svg
              className="h-6 w-6 text-[var(--accent)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
          </div>

          <h2 className="mt-4 text-lg font-bold text-[var(--text-primary)]">
            Community Member
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
            Search jobs, save opportunities, discover events, connect with your
            community, and build your professional profile.
          </p>

          <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)] transition group-hover:gap-2">
            Get started
            <ArrowRight />
          </span>
        </button>

        {/* Organization */}
        <button
          type="button"
          onClick={() => onSelect("organization")}
          className="group relative rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 text-left shadow-sm transition hover:shadow-md sm:p-8"
        >
          <span className="inline-flex items-center rounded-full bg-[var(--border)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Free &amp; paid tiers
          </span>

          <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--border)]">
            <svg
              className="h-6 w-6 text-[var(--text-secondary)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
              />
            </svg>
          </div>

          <h2 className="mt-4 text-lg font-bold text-[var(--text-primary)]">
            Organization
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
            Post jobs, promote events and scholarships, list your business in
            Shop Indigenous, and reach the Indigenous community.
          </p>

          <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[var(--text-secondary)] transition group-hover:gap-2 group-hover:text-[var(--text-primary)]">
            Get started
            <ArrowRight />
          </span>
        </button>
      </div>

      <p className="mt-8 text-center text-sm text-[var(--text-secondary)]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-[var(--accent)] hover:underline"
        >
          Log in
        </Link>
      </p>
    </>
  );
}

// ---------------------------------------------------------------------------
// Member signup form
// ---------------------------------------------------------------------------

function MemberSignup({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const { signInWithGoogle } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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
      await setDoc(doc(db, "users", cred.user.uid), {
        id: cred.user.uid,
        role: "community",
        displayName: displayName.trim(),
        email: cred.user.email,
        createdAt: serverTimestamp(),
      });
      router.push("/member/dashboard");
    } catch (err) {
      console.error(err);
      setError(
        getErrorMessage(err, "Could not create account. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      router.push("/member/dashboard");
    } catch (err) {
      console.error(err);
      setError(
        getErrorMessage(err, "Unable to sign in with Google. Please try again.")
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Join the IOPPS community
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Google */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading || googleLoading}
        className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-[var(--border)] bg-[var(--card-bg)] px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <GoogleIcon />
        {googleLoading ? "Signing up..." : "Sign up with Google"}
      </button>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--border)]" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-[var(--background)] px-4 text-[var(--text-muted)]">
            Or sign up with email
          </span>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-sm sm:p-8"
      >
        <FormField
          id="member-name"
          label="Full Name"
          type="text"
          required
          value={displayName}
          onChange={setDisplayName}
          placeholder="Your full name"
          autoComplete="name"
        />

        <FormField
          id="member-email"
          label="Email"
          type="email"
          required
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoComplete="email"
        />

        <FormField
          id="member-password"
          label="Password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={setPassword}
          hint="Must be at least 6 characters"
          autoComplete="new-password"
        />

        <FormField
          id="member-confirm"
          label="Confirm Password"
          type="password"
          required
          minLength={6}
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
        />

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner />
              Creating account...
            </span>
          ) : (
            "Create account"
          )}
        </button>

        <p className="text-center text-xs text-[var(--text-muted)]">
          By creating an account you agree to our{" "}
          <Link href="/privacy" className="text-[var(--accent)] hover:underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="text-[var(--accent)] hover:underline">
            Terms of Service
          </Link>
        </p>
      </form>

      <div className="mt-6 flex items-center justify-center gap-4 text-sm">
        <button
          type="button"
          onClick={onBack}
          className="font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          &larr; Back
        </button>
        <span className="text-[var(--text-muted)]">|</span>
        <span className="text-[var(--text-secondary)]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[var(--accent)] hover:underline"
          >
            Log in
          </Link>
        </span>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Organization signup form
// ---------------------------------------------------------------------------

function OrganizationSignup({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const { signInWithGoogle } = useAuth();

  const [orgName, setOrgName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!orgName.trim()) {
      setError("Please enter your organization name.");
      return;
    }
    if (!contactName.trim()) {
      setError("Please enter a contact person name.");
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
      await updateProfile(cred.user, { displayName: orgName.trim() });
      await setDoc(doc(db, "users", cred.user.uid), {
        id: cred.user.uid,
        role: "employer",
        displayName: orgName.trim(),
        contactPerson: contactName.trim(),
        email: cred.user.email,
        createdAt: serverTimestamp(),
      });
      router.push("/organization/dashboard");
    } catch (err) {
      console.error(err);
      setError(
        getErrorMessage(err, "Could not create account. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Set role to employer for Google sign-ups from org path
      if (auth?.currentUser && db) {
        await setDoc(
          doc(db, "users", auth.currentUser.uid),
          { role: "employer" },
          { merge: true }
        );
      }
      router.push("/organization/dashboard");
    } catch (err) {
      console.error(err);
      setError(
        getErrorMessage(err, "Unable to sign in with Google. Please try again.")
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
          Register Your Organization
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Create your organization account to get started
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Google */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading || googleLoading}
        className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-[var(--border)] bg-[var(--card-bg)] px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <GoogleIcon />
        {googleLoading ? "Signing up..." : "Sign up with Google"}
      </button>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--border)]" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-[var(--background)] px-4 text-[var(--text-muted)]">
            Or register with email
          </span>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-sm sm:p-8"
      >
        <FormField
          id="org-name"
          label="Organization Name"
          type="text"
          required
          value={orgName}
          onChange={setOrgName}
          placeholder="Your organization or company name"
          autoComplete="organization"
        />

        <FormField
          id="org-contact"
          label="Contact Person"
          type="text"
          required
          value={contactName}
          onChange={setContactName}
          placeholder="Full name of primary contact"
          autoComplete="name"
        />

        <FormField
          id="org-email"
          label="Email"
          type="email"
          required
          value={email}
          onChange={setEmail}
          placeholder="contact@yourorganization.com"
          autoComplete="email"
        />

        <FormField
          id="org-password"
          label="Password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={setPassword}
          hint="Must be at least 6 characters"
          autoComplete="new-password"
        />

        <FormField
          id="org-confirm"
          label="Confirm Password"
          type="password"
          required
          minLength={6}
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
        />

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-[var(--border)] bg-[var(--card-bg)] px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--border)]"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="flex-1 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner />
                Creating account...
              </span>
            ) : (
              "Create organization account"
            )}
          </button>
        </div>

        <p className="text-center text-xs text-[var(--text-muted)]">
          By creating an account you agree to our{" "}
          <Link href="/privacy" className="text-[var(--accent)] hover:underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="text-[var(--accent)] hover:underline">
            Terms of Service
          </Link>
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-[var(--accent)] hover:underline"
        >
          Log in
        </Link>
      </p>
    </>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function FormField({
  id,
  label,
  hint,
  ...inputProps
}: {
  id: string;
  label: string;
  hint?: string;
  type: string;
  required?: boolean;
  minLength?: number;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const { onChange, ...rest } = inputProps;
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
      >
        {label}
      </label>
      <input
        id={id}
        {...rest}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
      />
      {hint && (
        <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
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

function ArrowRight() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
      />
    </svg>
  );
}
