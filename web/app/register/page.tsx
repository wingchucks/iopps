"use client";

import { FormEvent, useState } from "react";
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

type UserRole = "community" | "employer";

export default function RegisterPage() {
  const router = useRouter();
  const { signInWithGoogle } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError("Please enter your name or organization.");
      return;
    }

    if (!role) {
      setError("Please choose whether you're a community member or an employer.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!auth || !db) {
      setError("Authentication is not available in offline mode. Please contact support.");
      return;
    }

    setLoading(true);

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      await updateProfile(cred.user, { displayName: displayName.trim() });

      await setDoc(doc(db!, "users", cred.user.uid), {
        id: cred.user.uid,
        role,
        displayName: displayName.trim(),
        email: cred.user.email,
        createdAt: serverTimestamp(),
      });

      // Send email verification
      try {
        await sendEmailVerification(cred.user);
        setSuccess(true);
      } catch (verifyError) {
        console.error("Email verification error:", verifyError);
        // Don't fail registration if email verification fails
        // Just redirect without showing success message
        router.push("/jobs");
      }
    } catch (err) {
      console.error(err);

      // Handle specific Firebase auth errors
      let message = "Could not create account.";
      if (err instanceof Error) {
        if (err.message.includes("network-request-failed")) {
          message = "Network error. Firebase emulators may not be running. Please check your connection or contact support.";
        } else if (err.message.includes("email-already-in-use")) {
          message = "This email is already registered. Try logging in instead.";
        } else if (err.message.includes("weak-password")) {
          message = "Password is too weak. Please use at least 6 characters.";
        } else if (err.message.includes("invalid-email")) {
          message = "Invalid email address. Please check and try again.";
        } else {
          message = err.message;
        }
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      const { isNewUser } = await signInWithGoogle();

      if (isNewUser) {
        // Show role selector for new users
        setShowRoleSelector(true);
        setGoogleLoading(false);
      } else {
        // Existing user, redirect to jobs
        router.push("/jobs");
      }
    } catch (err) {
      console.error(err);

      // Handle specific Firebase auth errors
      let message = "Unable to sign in with Google. Please try again.";
      if (err instanceof Error) {
        if (err.message.includes("popup-closed-by-user")) {
          message = "Sign-in cancelled. Please try again when ready.";
        } else if (err.message.includes("popup-blocked")) {
          message = "Pop-up blocked. Please allow pop-ups for this site and try again.";
        } else if (err.message.includes("network-request-failed")) {
          message = "Network error. Please check your connection and try again.";
        } else if (!err.message.includes("offline mode")) {
          message = err.message;
        }
      }
      setError(message);
      setGoogleLoading(false);
    }
  };

  const handleRoleSelection = async (selectedRole: UserRole) => {
    if (!auth || !db || !auth.currentUser) return;

    try {
      // Update user role in Firestore
      await setDoc(
        doc(db!, "users", auth.currentUser.uid),
        { role: selectedRole },
        { merge: true }
      );

      router.push("/jobs");
    } catch (err) {
      console.error(err);
      setError("Failed to update role. Please try again.");
      setShowRoleSelector(false);
    }
  };

  return (
    <>
      {/* Role Selector Modal for Google Sign-In */}
      {showRoleSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-[#08090C] p-6 shadow-lg shadow-black/50">
            <h2 className="text-xl font-semibold text-slate-50">
              Choose your account type
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Select how you&apos;ll be using IOPPS
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleRoleSelection("community")}
                className="flex flex-col items-start rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-left transition hover:border-[#14B8A6] hover:bg-[#14B8A6]/10"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Community member
                </span>
                <span className="mt-1 text-sm text-slate-100">
                  Find jobs, save opportunities, and explore events.
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelection("employer")}
                className="flex flex-col items-start rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-left transition hover:border-[#14B8A6] hover:bg-[#14B8A6]/10"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Employer
                </span>
                <span className="mt-1 text-sm text-slate-100">
                  Post jobs, promote scholarships, and feature events.
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-md flex-col px-4 py-10 sm:py-16">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-[#14B8A6]">
            Register
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Create your IOPPS account
          </h1>
          <p className="mt-3 text-sm text-slate-400 sm:text-base">
            Choose whether you are a community member or an employer.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-md border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-200">
            <p className="font-semibold">Account created successfully!</p>
            <p className="mt-2">
              We&apos;ve sent a verification email to <strong>{email}</strong>.
            </p>
            <p className="mt-2">
              Please check your inbox and click the verification link to activate your account. After verifying, you can{" "}
              <Link href="/login" className="underline hover:text-green-100">
                sign in here
              </Link>.
            </p>
            <p className="mt-2 text-xs text-green-300">
              Don&apos;t see the email? Check your spam folder or{" "}
              <button
                onClick={() => {
                  setSuccess(false);
                  setEmail("");
                  setPassword("");
                  setConfirmPassword("");
                  setDisplayName("");
                  setRole(null);
                }}
                className="underline hover:text-green-100"
              >
                try again
              </button>.
            </p>
          </div>
        )}

        <div className="mt-8 space-y-4">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 rounded-2xl border border-slate-800/80 bg-[#08090C] px-6 py-3 text-sm font-semibold text-slate-100 shadow-lg shadow-black/30 transition-all hover:border-[#14B8A6] hover:bg-slate-900/60 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {googleLoading ? "Signing in..." : "Continue with Google"}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-950 px-2 text-slate-500">Or register with email</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-5 rounded-2xl border border-slate-800/80 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Name
          </label>
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
            placeholder="Your name or organization"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200">
            Password
          </label>
          <div className="relative mt-1">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 pr-10 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
            >
              {showPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Must be at least 6 characters.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200">
            Confirm Password
          </label>
          <input
            type={showPassword ? "text" : "password"}
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
          />
        </div>

        <div>
          <p className="block text-sm font-medium text-slate-200">
            I am signing up as:
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setRole("community")}
              className={`flex flex-col items-start rounded-xl border px-4 py-3 text-left transition ${
                role === "community"
                  ? "border-[#14B8A6] bg-[#14B8A6]/10"
                  : "border-slate-700 bg-slate-900 hover:border-slate-600"
              }`}
            >
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Community member
              </span>
              <span className="mt-1 text-sm text-slate-100">
                Find jobs, save opportunities, and explore events.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRole("employer")}
              className={`flex flex-col items-start rounded-xl border px-4 py-3 text-left transition ${
                role === "employer"
                  ? "border-[#14B8A6] bg-[#14B8A6]/10"
                  : "border-slate-700 bg-slate-900 hover:border-slate-600"
              }`}
            >
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Employer
              </span>
              <span className="mt-1 text-sm text-slate-100">
                Post jobs, promote scholarships, and feature events.
              </span>
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full rounded-full bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>

        <p className="text-center text-xs text-slate-400">
          By creating an account you agree to our{" "}
          <Link href="/privacy" className="text-[#14B8A6] hover:underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="text-[#14B8A6] hover:underline">
            Terms of Service
          </Link>
        </p>

        <p className="text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[#14B8A6] hover:underline">
            Log in
          </Link>
        </p>
      </form>
      </div>
    </>
  );
}
