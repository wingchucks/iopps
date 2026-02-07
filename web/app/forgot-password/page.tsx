"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getAuthErrorMessage } from "@/lib/auth-errors";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!auth) {
      setError("Authentication is not available in offline mode. Please contact support.");
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
      setEmail(""); // Clear the email field
    } catch (err) {
      console.error(err);
      setError(getAuthErrorMessage(err, "Unable to send password reset email. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-10 sm:py-16">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-[#14B8A6]">
          Password Reset
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl text-slate-900">
          Forgot your password?
        </h1>
        <p className="mt-3 text-sm text-foreground0 sm:text-base">
          No worries! Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-6 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-600">
          <p className="font-semibold">Password reset email sent!</p>
          <p className="mt-1">
            Check your inbox for a link to reset your password. If you don&apos;t see the email, check your spam folder.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Email address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@example.com"
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-accent focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-accent/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>

        <div className="flex flex-col gap-2 text-center text-sm text-foreground0">
          <p>
            Remember your password?{" "}
            <Link href="/login" className="font-semibold text-[#14B8A6] hover:underline">
              Sign in
            </Link>
          </p>
          <p>
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-[#14B8A6] hover:underline">
              Create account
            </Link>
          </p>
        </div>
      </form>

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-foreground0">
        <p className="font-semibold text-slate-600 mb-2">Need help?</p>
        <p>
          If you&apos;re having trouble resetting your password, please{" "}
          <Link href="/contact" className="text-[#14B8A6] hover:underline">
            contact support
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
