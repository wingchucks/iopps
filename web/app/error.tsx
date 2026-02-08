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
        console.error(error);
    }, [error]);

    return (
        <div className="flex min-h-[60vh] items-center justify-center px-4">
            <div className="text-center">
                <div className="inline-flex items-center justify-center rounded-full bg-red-500/10 p-6">
                    <svg
                        className="h-16 w-16 text-red-400"
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

                <h1 className="mt-6 text-2xl font-bold text-foreground">
                    Something went wrong
                </h1>
                <p className="mt-4 max-w-md text-[var(--text-muted)]">
                    We encountered an unexpected error. Don&apos;t worry, our team has been
                    notified and we&apos;re looking into it.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <button
                        onClick={reset}
                        className="rounded-full bg-accent px-6 py-3 font-semibold text-[var(--text-primary)] transition hover:bg-[#0F9488]"
                    >
                        Try Again
                    </button>
                    <Link
                        href="/"
                        className="rounded-full border border-[var(--card-border)] px-6 py-3 font-semibold text-foreground transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
                    >
                        Go Home
                    </Link>
                </div>

                {error.digest && (
                    <div className="mt-8">
                        <p className="text-xs text-[var(--text-secondary)]">Error ID: {error.digest}</p>
                    </div>
                )}

                <div className="mt-4">
                    <p className="text-sm text-foreground0">
                        Need help? <Link href="/contact" className="text-[#14B8A6] hover:underline">Contact support</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
