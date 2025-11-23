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
                    <div className="mx-auto h-16 w-16 rounded-full bg-slate-800"></div>
                    <div className="mt-4 h-8 w-64 mx-auto rounded bg-slate-800"></div>
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
                        href="/employer/jobs"
                        className="mt-6 inline-block rounded-lg bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 transition hover:bg-[#16cdb8]"
                    >
                        Back to Jobs
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
            <div className="rounded-2xl border border-[#14B8A6]/40 bg-[#14B8A6]/10 p-8">
                {/* Success Icon */}
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#14B8A6]">
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

                <h1 className="mt-6 text-3xl font-bold text-slate-50">
                    Payment Successful! 🎉
                </h1>

                <p className="mt-4 text-lg text-slate-300">
                    Your job posting has been published successfully.
                </p>

                <div className="mt-8 space-y-3 text-sm text-slate-400">
                    <p>✅ Payment confirmed</p>
                    <p>✅ Job posting is now live on IOPPS</p>
                    <p>✅ You'll receive a confirmation email shortly</p>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Link
                        href="/employer/jobs"
                        className="rounded-lg bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 transition hover:bg-[#16cdb8]"
                    >
                        View My Jobs
                    </Link>
                    <Link
                        href="/jobs"
                        className="rounded-lg border border-slate-700 px-6 py-3 font-semibold text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
                    >
                        View Job Board
                    </Link>
                </div>

                <p className="mt-8 text-xs text-slate-500">
                    Session ID: {sessionId}
                </p>
            </div>
        </div>
    );
}

export default function PaymentSuccessPage() {
    return (
        <PageShell>
            <Suspense fallback={
                <div className="mx-auto max-w-2xl px-4 py-16 text-center">
                    <div className="animate-pulse">
                        <div className="mx-auto h-16 w-16 rounded-full bg-slate-800"></div>
                        <div className="mt-4 h-8 w-64 mx-auto rounded bg-slate-800"></div>
                    </div>
                </div>
            }>
                <PaymentSuccessContent />
            </Suspense>
        </PageShell>
    );
}

