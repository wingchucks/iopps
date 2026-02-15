"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, Home, AlertTriangle } from "lucide-react";

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Profile page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="h-24 w-24 rounded-full bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle className="h-12 w-12 text-amber-400" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          Temporarily Unavailable
        </h1>
        <p className="text-[var(--text-muted)] mb-8">
          We couldn&apos;t load this profile right now. This is usually a
          temporary issue — please try again in a moment.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-white transition hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
          <Link
            href="/discover"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--card-border)] px-6 py-3 font-semibold text-foreground transition hover:bg-surface"
          >
            <Home className="h-4 w-4" />
            Go to Discover
          </Link>
        </div>

        {error.digest && (
          <p className="mt-6 text-xs text-[var(--text-secondary)]">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
