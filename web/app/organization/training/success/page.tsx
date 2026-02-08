"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";

function PaymentSuccessContent() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("session_id");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    /* eslint-disable react-hooks/set-state-in-effect -- intentional: sync initial state from URL params */
    useEffect(() => {
        if (sessionId) {
            // Payment was successful
            setLoading(false);
        } else {
            setError("No session ID found");
            setLoading(false);
        }
    }, [sessionId]);
    /* eslint-enable react-hooks/set-state-in-effect */

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
                        href="/organization/training"
                        className="mt-6 inline-block rounded-lg bg-purple-500 px-6 py-3 font-semibold text-white transition hover:bg-purple-600"
                    >
                        Back to Training Programs
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
            <div className="rounded-2xl border border-purple-500/40 bg-purple-500/10 p-8">
                {/* Success Icon */}
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-indigo-500">
                    <svg
                        className="h-8 w-8 text-white"
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
                    Featured Purchase Successful!
                </h1>

                <p className="mt-4 text-lg text-[var(--text-secondary)]">
                    Your training program is now featured and will appear at the
                    top of search results with a special badge.
                </p>

                <div className="mt-8 rounded-xl bg-surface p-6 text-left">
                    <h2 className="text-lg font-semibold text-purple-400">
                        What happens next?
                    </h2>
                    <ul className="mt-4 space-y-3 text-[var(--text-secondary)]">
                        <li className="flex items-start gap-3">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">
                                1
                            </span>
                            <span>
                                Your program now displays with a &quot;Featured&quot; badge
                            </span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">
                                2
                            </span>
                            <span>
                                It appears in the Featured Programs section on the training page
                            </span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">
                                3
                            </span>
                            <span>
                                Track views and clicks in your organization dashboard
                            </span>
                        </li>
                    </ul>
                </div>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
                    <Link
                        href="/organization"
                        className="rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-3 font-semibold text-white transition hover:from-purple-600 hover:to-indigo-600"
                    >
                        View Dashboard
                    </Link>
                    <Link
                        href="/careers/programs"
                        className="rounded-lg border border-[var(--card-border)] bg-surface px-6 py-3 font-semibold text-foreground transition hover:bg-slate-700"
                    >
                        View Training Programs
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function TrainingPaymentSuccessPage() {
    return (
        <PageShell>
            <Suspense
                fallback={
                    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
                        <div className="animate-pulse">
                            <div className="mx-auto h-16 w-16 rounded-full bg-surface"></div>
                            <div className="mt-4 h-8 w-64 mx-auto rounded bg-surface"></div>
                        </div>
                    </div>
                }
            >
                <PaymentSuccessContent />
            </Suspense>
        </PageShell>
    );
}
