"use client";

import { useState } from "react";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface EmailVerificationBannerProps {
  email?: string | null;
  emailVerified: boolean;
}

export default function EmailVerificationBanner({
  email,
  emailVerified,
}: EmailVerificationBannerProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Don't show if email is verified
  if (emailVerified) {
    return null;
  }

  const handleResendVerification = async () => {
    if (!auth?.currentUser) return;

    setError(null);
    setSending(true);

    try {
      await sendEmailVerification(auth.currentUser);
      setSent(true);
    } catch (err) {
      console.error("Error sending verification email:", err);
      if (err instanceof Error) {
        if (err.message.includes("too-many-requests")) {
          setError("Too many requests. Please wait a few minutes and try again.");
        } else {
          setError("Failed to send verification email. Please try again later.");
        }
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20">
          <svg
            className="h-5 w-5 text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-amber-300">
            Please verify your email
          </p>
          <p className="mt-1 text-sm text-amber-200/80">
            {sent ? (
              <>
                We&apos;ve sent a verification email to{" "}
                <strong>{email}</strong>. Please check your inbox and click the
                verification link.
              </>
            ) : (
              <>
                Verify your email address ({email}) to secure your account and
                enable all features.
              </>
            )}
          </p>
          {error && (
            <p className="mt-2 text-sm text-red-400">{error}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-3">
            {!sent && (
              <button
                onClick={handleResendVerification}
                disabled={sending}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-500/30 disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
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
                    Sending...
                  </>
                ) : (
                  "Resend Verification Email"
                )}
              </button>
            )}
            {sent && (
              <button
                onClick={() => setSent(false)}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-700/50 px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-slate-700"
              >
                Send Again
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              aria-label="Refresh page after verifying email"
              className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 px-4 py-2 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-500/10"
            >
              I&apos;ve verified, refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
