"use client";

import { useEffect } from "react";
import { PageShell } from "@/components/PageShell";
import { SectionHeader } from "@/components/SectionHeader";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("Shop Dashboard Error:", error);
    }, [error]);

    return (
        <PageShell>
            <div className="mx-auto max-w-2xl space-y-6">
                <SectionHeader
                    eyebrow="Error"
                    title="Something went wrong"
                    subtitle="We encountered an unexpected error while loading the shop dashboard."
                />

                <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 sm:p-8 shadow-lg shadow-black/30 space-y-4">
                    <h3 className="text-lg font-semibold text-red-200">Error Details</h3>
                    <div className="rounded-md bg-black/50 p-4 overflow-auto max-h-60">
                        <p className="font-mono text-sm text-red-300 whitespace-pre-wrap">
                            {error.message}
                        </p>
                        {error.stack && (
                            <pre className="mt-4 text-xs text-foreground0 whitespace-pre-wrap">
                                {error.stack}
                            </pre>
                        )}
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            onClick={() => reset()}
                            className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-accent/90"
                        >
                            Try again
                        </button>
                        <button
                            onClick={() => window.location.href = "/organization"}
                            className="rounded-full border border-[var(--card-border)] px-6 py-2.5 text-sm font-semibold text-foreground transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
                        >
                            Go back
                        </button>
                    </div>
                </div>
            </div>
        </PageShell>
    );
}
