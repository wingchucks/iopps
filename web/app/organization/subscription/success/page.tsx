"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";

function SubscriptionSuccessContent() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("session_id");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (sessionId) {
            // Payment was successful
            setLoading(false);
        } else {
            setError("No session ID found");
            setLoading(false);
        }
    }, [sessionId]);

    if (loading) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-16 text-center">
                <div className="animate-pulse">
                    <div className="mx-auto h-16 w-16 rounded-full bg-surface"></div>
                    <div className="mt-4 h-8 w-64 mx-auto rounded bg-surface"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-16 text-center">
                <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-8">
                    <h1 className="text-2xl font-bold text-red-200">
                        Payment Error
                    </h1>
                    <p className="mt-4 text-red-300">{error}</p>
                    <Link
                        href="/pricing"
                        className="mt-6 inline-block rounded-lg bg-accent px-6 py-3 font-semibold text-slate-900 transition hover:bg-[#16cdb8]"
                    >
                        Back to Pricing
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
            <div className="rounded-2xl border border-[#14B8A6]/40 bg-accent/10 p-8">
                {/* Success Icon */}
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent">
                    <svg
                        className="h-8 w-8 text-slate-900"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                </div>

                <h1 className="mt-6 text-3xl font-bold text-foreground">
                    Subscription Activated! 🎉
                </h1>

                <p className="mt-4 text-lg text-[var(--text-secondary)]">
                    Your employer subscription is now active. You can start posting jobs immediately!
                </p>

                <div className="mt-8 space-y-3 text-sm text-[var(--text-muted)]">
                    <p>✅ Payment confirmed</p>
                    <p>✅ Subscription is now active for 12 months</p>
                    <p>✅ You can now post jobs without additional payment</p>
                    <p>✅ You'll receive a confirmation email shortly</p>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Link
                        href="/organization/jobs/new"
                        className="rounded-lg bg-accent px-6 py-3 font-semibold text-slate-900 transition hover:bg-[#16cdb8]"
                    >
                        Post Your First Job
                    </Link>
                    <Link
                        href="/organization/dashboard"
                        className="rounded-lg border border-[var(--card-border)] px-6 py-3 font-semibold text-foreground transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
                    >
                        Go to Dashboard
                    </Link>
                </div>

                <p className="mt-8 text-xs text-foreground0">
                    Session ID: {sessionId}
                </p>
            </div>
        </div>
    );
}

export default function SubscriptionSuccessPage() {
    return (
        <PageShell>
            <Suspense fallback={
                <div className="mx-auto max-w-2xl px-4 py-16 text-center">
                    <div className="animate-pulse">
                        <div className="mx-auto h-16 w-16 rounded-full bg-surface"></div>
                        <div className="mt-4 h-8 w-64 mx-auto rounded bg-surface"></div>
                    </div>
                </div>
            }>
                <SubscriptionSuccessContent />
            </Suspense>
        </PageShell>
    );
}
