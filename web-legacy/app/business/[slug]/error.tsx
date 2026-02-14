"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("Shop Page Error:", error);
    }, [error]);

    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
            <div className="mb-6 rounded-full bg-red-500/10 p-6">
                <svg
                    className="h-12 w-12 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                </svg>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-white">
                Something went wrong
            </h2>
            <p className="mb-8 max-w-md text-[var(--text-muted)]">
                We encountered an error while loading this shop. This might be due to a temporary connection issue.
            </p>
            <div className="flex gap-4">
                <button
                    onClick={reset}
                    className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-accent/90"
                >
                    Try Again
                </button>
                <Link
                    href="/business"
                    className="rounded-full border border-[var(--card-border)] px-6 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-surface"
                >
                    Browse All Businesses
                </Link>
            </div>
            {process.env.NODE_ENV === "development" && (
                <div className="mt-8 w-full max-w-2xl overflow-hidden rounded-lg bg-surface p-4 text-left">
                    <p className="mb-2 text-xs font-bold text-red-400">Error Details:</p>
                    <pre className="whitespace-pre-wrap text-xs text-[var(--text-muted)]">
                        {error.message}
                        {error.stack}
                    </pre>
                </div>
            )}
        </div>
    );
}
