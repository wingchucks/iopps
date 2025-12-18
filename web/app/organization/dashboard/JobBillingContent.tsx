"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getEmployerProfile } from "@/lib/firestore";
import type { JobPosting, EmployerProfile } from "@/lib/types";
import Link from "next/link";

export default function BillingTab() {
    const { user } = useAuth();
    const [paidJobs, setPaidJobs] = useState<JobPosting[]>([]);
    const [loading, setLoading] = useState(true);
    const [employerProfile, setEmployerProfile] = useState<EmployerProfile | null>(null);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            try {
                // Fetch employer profile
                const profile = await getEmployerProfile(user.uid);
                setEmployerProfile(profile);

                // Fetch paid jobs
                const jobsRef = collection(db!, "jobs");
                const q = query(
                    jobsRef,
                    where("employerId", "==", user.uid),
                    where("paymentStatus", "==", "paid"),
                    orderBy("createdAt", "desc")
                );

                const snapshot = await getDocs(q);
                const jobs = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as JobPosting[];

                setPaidJobs(jobs);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const formatDate = (date: { toDate?: () => Date; seconds?: number } | Date | string | null | undefined): string => {
        if (!date) return "N/A";
        if (typeof date === 'string') return new Date(date).toLocaleDateString();
        if (date instanceof Date) return date.toLocaleDateString();
        if (typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
            return date.toDate().toLocaleDateString();
        }
        if (typeof date === 'object' && 'seconds' in date && typeof date.seconds === 'number') {
            return new Date(date.seconds * 1000).toLocaleDateString();
        }
        return "N/A";
    };

    const getStatusBadge = (job: JobPosting) => {
        const now = new Date();
        const expiresAt = job.expiresAt;

        if (!expiresAt) {
            return <span className="rounded-full bg-slate-500/10 px-3 py-1 text-xs font-medium text-slate-400">Unknown</span>;
        }

        let expiryDate: Date;
        if (typeof expiresAt === 'string') {
            expiryDate = new Date(expiresAt);
        } else if (expiresAt instanceof Date) {
            expiryDate = expiresAt;
        } else if ('toDate' in expiresAt) {
            expiryDate = expiresAt.toDate();
        } else {
            return <span className="rounded-full bg-slate-500/10 px-3 py-1 text-xs font-medium text-slate-400">Unknown</span>;
        }

        if (expiryDate < now) {
            return <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400">Expired</span>;
        }

        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry <= 7) {
            return <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-400">Expiring Soon</span>;
        }

        return <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">Active</span>;
    };

    const calculateTotalSpent = () => {
        return paidJobs.reduce((total, job) => {
            return total + (job.amountPaid || 0);
        }, 0) / 100; // Convert cents to dollars
    };

    const getActiveJobsCount = () => {
        return paidJobs.filter(job => {
            if (!job.expiresAt) return false;
            let expiryDate: Date;
            const expiresAt = job.expiresAt;

            if (typeof expiresAt === 'string') {
                expiryDate = new Date(expiresAt);
            } else if (expiresAt instanceof Date) {
                expiryDate = expiresAt;
            } else if ('toDate' in expiresAt) {
                expiryDate = expiresAt.toDate();
            } else {
                return false;
            }

            return expiryDate > new Date();
        }).length;
    };

    if (loading) {
        return (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
                <div className="flex items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-emerald-500"></div>
                    <span className="ml-3 text-slate-400">Loading payment history...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Free Posting Status Banner */}
            {employerProfile?.freePostingEnabled && (
                <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 p-6">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
                            <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-emerald-400">Free Posting Access Active</h3>
                            <p className="mt-1 text-sm text-slate-300">
                                Your account has been granted free job posting access by IOPPS admin.
                                {employerProfile.freePostingReason && (
                                    <span className="ml-1 text-slate-400">
                                        Reason: {employerProfile.freePostingReason}
                                    </span>
                                )}
                            </p>
                        </div>
                        <Link
                            href="/organization/jobs/new"
                            className="flex-shrink-0 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
                        >
                            Post Free Job
                        </Link>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid gap-6 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-400">Total Spent</p>
                            <p className="mt-2 text-3xl font-bold text-white">${calculateTotalSpent().toFixed(2)}</p>
                        </div>
                        <div className="rounded-full bg-emerald-500/20 p-3">
                            <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-400">Active Jobs</p>
                            <p className="mt-2 text-3xl font-bold text-white">{getActiveJobsCount()}</p>
                        </div>
                        <div className="rounded-full bg-blue-500/20 p-3">
                            <svg className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-400">Total Postings</p>
                            <p className="mt-2 text-3xl font-bold text-white">{paidJobs.length}</p>
                        </div>
                        <div className="rounded-full bg-purple-500/20 p-3">
                            <svg className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment History Table */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">Payment History</h2>
                        <p className="mt-1 text-sm text-slate-400">View all your job posting payments and receipts</p>
                    </div>
                    <Link
                        href="/organization/jobs/new"
                        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
                    >
                        + Post New Job
                    </Link>
                </div>

                {paidJobs.length === 0 ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-12 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/40">
                            <svg className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-200">No payment history yet</h3>
                        <p className="mt-2 text-sm text-slate-400">
                            Post your first job to see your payment history here
                        </p>
                        <Link
                            href="/organization/jobs/new"
                            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Post Your First Job
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-800 text-left text-sm font-semibold text-slate-400">
                                    <th className="pb-3">Job Title</th>
                                    <th className="pb-3">Package</th>
                                    <th className="pb-3">Amount</th>
                                    <th className="pb-3">Posted Date</th>
                                    <th className="pb-3">Expires</th>
                                    <th className="pb-3">Status</th>
                                    <th className="pb-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {paidJobs.map((job) => (
                                    <tr key={job.id} className="text-sm hover:bg-slate-800/30">
                                        <td className="py-4">
                                            <Link href={`/jobs-training/${job.id}`} className="font-medium text-white hover:text-emerald-400">
                                                {job.title}
                                            </Link>
                                            <p className="text-xs text-slate-500">{job.location}</p>
                                        </td>
                                        <td className="py-4">
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                                                job.productType === "FEATURED"
                                                    ? "bg-amber-500/10 text-amber-400"
                                                    : job.productType === "FREE_POSTING"
                                                        ? "bg-emerald-500/10 text-emerald-400"
                                                        : job.productType === "SUBSCRIPTION"
                                                            ? "bg-blue-500/10 text-blue-400"
                                                            : "bg-slate-500/10 text-slate-400"
                                                }`}>
                                                {job.productType === "FEATURED" ? (
                                                    <>
                                                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                        </svg>
                                                        Featured
                                                    </>
                                                ) : job.productType === "FREE_POSTING" ? (
                                                    <>
                                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                                                        </svg>
                                                        Free Post
                                                    </>
                                                ) : job.productType === "SUBSCRIPTION" ? (
                                                    "Subscription"
                                                ) : (
                                                    "Single Post"
                                                )}
                                            </span>
                                        </td>
                                        <td className="py-4 font-semibold text-emerald-400">
                                            ${((job.amountPaid || 0) / 100).toFixed(2)}
                                        </td>
                                        <td className="py-4 text-slate-300">
                                            {formatDate(job.createdAt)}
                                        </td>
                                        <td className="py-4 text-slate-300">
                                            {formatDate(job.expiresAt)}
                                        </td>
                                        <td className="py-4">
                                            {getStatusBadge(job)}
                                        </td>
                                        <td className="py-4">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={`/organization/jobs/${job.id}/edit`}
                                                    className="text-slate-400 transition hover:text-emerald-400"
                                                    title="Edit job"
                                                >
                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </Link>
                                                <Link
                                                    href={`/jobs-training/${job.id}`}
                                                    className="text-slate-400 transition hover:text-blue-400"
                                                    title="View job"
                                                >
                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Payment Tips */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
                <div className="flex items-start gap-4">
                    <div className="rounded-full bg-emerald-500/20 p-2">
                        <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-emerald-400">Payment & Billing Tips</h3>
                        <ul className="mt-2 space-y-2 text-sm text-slate-300">
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-500">ΓÇó</span>
                                <span>Job postings automatically expire after their purchased duration (30 or 45 days)</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-500">ΓÇó</span>
                                <span>You&apos;ll receive email notifications 7 days before expiration</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-500">ΓÇó</span>
                                <span>Featured jobs ($300) get premium placement and branding</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-500">ΓÇó</span>
                                <span>All payments are processed securely through Stripe</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
