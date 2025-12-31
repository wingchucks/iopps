"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { PageShell } from "@/components/PageShell";

export default function TalentPage() {
    const { role, loading: authLoading } = useAuth();

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#020306] flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
            </div>
        );
    }

    if (role !== "employer") {
        return (
            <PageShell>
                <div className="mx-auto max-w-4xl px-4 py-12 text-center text-slate-300">
                    <p>Access restricted to Employers.</p>
                </div>
            </PageShell>
        );
    }

    return (
        <div className="min-h-screen bg-[#020306]">
            {/* Header */}
            <div className="border-b border-slate-800 bg-[#08090C] py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-bold text-slate-50">
                        Find Indigenous Talent
                    </h1>
                    <p className="mt-2 text-slate-400">
                        Connect with qualified Indigenous professionals
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
                <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-8 sm:p-12 text-center shadow-xl">
                    {/* Icon */}
                    <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/20 text-4xl">
                        💼
                    </div>

                    {/* Heading */}
                    <h2 className="text-3xl font-bold text-white sm:text-4xl">
                        Find Your Next Great Hire
                    </h2>

                    {/* Description */}
                    <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
                        The best way to discover Indigenous talent is to post a job opportunity.
                        When candidates apply, you can review their resumes and connect directly.
                    </p>

                    {/* Benefits */}
                    <div className="mx-auto mt-10 grid max-w-2xl gap-6 sm:grid-cols-3">
                        <div className="rounded-xl bg-slate-800/50 p-6">
                            <div className="mb-3 text-2xl">📣</div>
                            <h3 className="font-semibold text-white">Reach Job Seekers</h3>
                            <p className="mt-2 text-sm text-slate-400">
                                Your opportunity is seen by active Indigenous professionals
                            </p>
                        </div>
                        <div className="rounded-xl bg-slate-800/50 p-6">
                            <div className="mb-3 text-2xl">📋</div>
                            <h3 className="font-semibold text-white">Review Applications</h3>
                            <p className="mt-2 text-sm text-slate-400">
                                Candidates apply with resumes and cover letters
                            </p>
                        </div>
                        <div className="rounded-xl bg-slate-800/50 p-6">
                            <div className="mb-3 text-2xl">💬</div>
                            <h3 className="font-semibold text-white">Connect Directly</h3>
                            <p className="mt-2 text-sm text-slate-400">
                                Message promising candidates through the platform
                            </p>
                        </div>
                    </div>

                    {/* CTA Buttons */}
                    <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                        <Link
                            href="/organization/jobs/new"
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-teal-500/30 transition-all hover:shadow-xl hover:shadow-teal-500/50"
                        >
                            <span>Post a Job</span>
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </Link>
                        <Link
                            href="/organization/applications"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-6 py-4 font-semibold text-slate-300 transition-all hover:border-slate-600 hover:text-white"
                        >
                            View Applications
                        </Link>
                    </div>

                    {/* Already have jobs? */}
                    <p className="mt-8 text-sm text-slate-500">
                        Already have active job postings?{" "}
                        <Link href="/organization/jobs" className="text-teal-400 hover:text-teal-300 underline">
                            Manage your jobs
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
