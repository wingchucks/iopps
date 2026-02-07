"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const type = searchParams.get("type") || "all";

  const [status, setStatus] = useState<"loading" | "ready" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !email) {
      setStatus("error");
      setMessage("Invalid unsubscribe link. Please check your email and try again.");
      return;
    }

    // Verify the token
    verifyToken();
  }, [token, email]);

  async function verifyToken() {
    try {
      const response = await fetch(
        `/api/emails/unsubscribe?token=${encodeURIComponent(token!)}&email=${encodeURIComponent(email!)}`
      );

      if (response.ok) {
        const data = await response.json();
        setVerifiedEmail(data.email);
        setStatus("ready");
      } else {
        const data = await response.json();
        setStatus("error");
        setMessage(data.error || "Invalid or expired unsubscribe link.");
      }
    } catch {
      setStatus("error");
      setMessage("Failed to verify unsubscribe link. Please try again.");
    }
  }

  async function handleUnsubscribe() {
    if (!token || !email) return;

    setStatus("loading");

    try {
      const response = await fetch("/api/emails/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, email, type }),
      });

      if (response.ok) {
        setStatus("success");
        setMessage(getSuccessMessage(type));
      } else {
        const data = await response.json();
        setStatus("error");
        setMessage(data.error || "Failed to unsubscribe. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Failed to unsubscribe. Please try again.");
    }
  }

  function getSuccessMessage(unsubType: string): string {
    switch (unsubType) {
      case "job_alerts":
        return "You've been unsubscribed from job alerts.";
      case "conferences":
        return "You've been unsubscribed from conference updates.";
      case "powwows":
        return "You've been unsubscribed from pow wow and event updates.";
      case "shop":
        return "You've been unsubscribed from Shop Indigenous updates.";
      case "digest":
        return "You've been unsubscribed from the weekly digest.";
      default:
        return "You've been unsubscribed from all marketing emails.";
    }
  }

  function getTypeLabel(unsubType: string): string {
    switch (unsubType) {
      case "job_alerts":
        return "job alerts";
      case "conferences":
        return "conference updates";
      case "powwows":
        return "pow wow and event updates";
      case "shop":
        return "Shop Indigenous updates";
      case "digest":
        return "the weekly digest";
      default:
        return "all marketing emails";
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-8 text-center">
          {/* Loading State */}
          {status === "loading" && (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <EnvelopeIcon className="h-8 w-8 text-foreground0" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Processing...</h1>
              <p className="mt-2 text-foreground0">Please wait while we process your request.</p>
            </>
          )}

          {/* Ready State - Confirm Unsubscribe */}
          {status === "ready" && (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
                <EnvelopeIcon className="h-8 w-8 text-amber-500" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Unsubscribe</h1>
              <p className="mt-4 text-foreground0">
                You're about to unsubscribe <span className="text-slate-800">{verifiedEmail}</span> from{" "}
                <span className="text-slate-800">{getTypeLabel(type)}</span>.
              </p>
              <button
                onClick={handleUnsubscribe}
                className="mt-6 w-full rounded-lg bg-accent px-4 py-3 font-semibold text-slate-900 transition hover:bg-[#0D9488]"
              >
                Confirm Unsubscribe
              </button>
              <p className="mt-4 text-sm text-foreground0">
                Changed your mind?{" "}
                <Link href="/member/email-preferences" className="text-[#14B8A6] hover:underline">
                  Manage your preferences
                </Link>
              </p>
            </>
          )}

          {/* Success State */}
          {status === "success" && (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircleIcon className="h-8 w-8 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Unsubscribed</h1>
              <p className="mt-4 text-foreground0">{message}</p>
              <p className="mt-2 text-sm text-foreground0">
                You'll still receive important account notifications.
              </p>
              <div className="mt-6 space-y-3">
                <Link
                  href="/member/email-preferences"
                  className="block w-full rounded-lg border border-slate-200 px-4 py-3 font-medium text-slate-800 transition hover:bg-slate-100"
                >
                  Manage Email Preferences
                </Link>
                <Link
                  href="/"
                  className="block w-full rounded-lg bg-accent px-4 py-3 font-semibold text-slate-900 transition hover:bg-[#0D9488]"
                >
                  Return to IOPPS
                </Link>
              </div>
            </>
          )}

          {/* Error State */}
          {status === "error" && (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                <ExclamationCircleIcon className="h-8 w-8 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Something went wrong</h1>
              <p className="mt-4 text-foreground0">{message}</p>
              <div className="mt-6 space-y-3">
                <Link
                  href="/member/email-preferences"
                  className="block w-full rounded-lg bg-accent px-4 py-3 font-semibold text-slate-900 transition hover:bg-[#0D9488]"
                >
                  Manage Preferences (Login Required)
                </Link>
                <Link
                  href="/"
                  className="block w-full rounded-lg border border-slate-200 px-4 py-3 font-medium text-slate-800 transition hover:bg-slate-100"
                >
                  Return to IOPPS
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-foreground0">
          Need help?{" "}
          <a href="mailto:support@iopps.ca" className="text-[#14B8A6] hover:underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <p className="text-foreground0">Loading...</p>
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
