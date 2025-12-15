"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    CalendarIcon,
    MapPinIcon,
    CurrencyDollarIcon,
    AcademicCapIcon,
    ShareIcon,
    BuildingLibraryIcon,
    CheckBadgeIcon,
    ArrowTopRightOnSquareIcon
} from "@heroicons/react/24/outline";
import { PageShell } from "@/components/PageShell";
import { getTrainingProgram, enrollInProgram } from "@/lib/firestore";
import type { TrainingProgram } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";

// Helper to format date
const formatDate = (timestamp: any) => {
    if (!timestamp) return 'To be announced';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

function TrainingDetailContent() {
    const params = useParams();
    const router = useRouter();
    const { user, role } = useAuth();
    const [program, setProgram] = useState<TrainingProgram | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [enrolling, setEnrolling] = useState(false);

    useEffect(() => {
        async function loadProgram() {
            if (!params.id) return;
            setLoading(true);
            try {
                const data = await getTrainingProgram(params.id as string);
                if (data) {
                    setProgram(data);
                } else {
                    setError("Program not found");
                }
            } catch (err) {
                console.error("Failed to load program", err);
                setError("Failed to load program details");
            } finally {
                setLoading(false);
            }
        }
        loadProgram();
    }, [params.id]);

    const handleEnroll = async () => {
        if (!user) {
            router.push(`/login?redirect=/jobs/training/${params.id}`);
            return;
        }

        if (program?.externalUrl) {
            window.open(program.externalUrl, '_blank');
            return;
        }

        // Internal enrollment logic
        setEnrolling(true);
        try {
            if (program) {
                await enrollInProgram(user.uid, program.id, program.title, program.organizationId);
                router.push('/member/dashboard');
            }
        } catch (err) {
            console.error("Enrollment failed", err);
            alert("Failed to enroll. Please try again.");
        } finally {
            setEnrolling(false);
        }
    };

    if (loading) {
        return (
            <PageShell>
                <div className="mx-auto max-w-4xl animate-pulse">
                    <div className="h-64 rounded-3xl bg-slate-800/50 mb-8" />
                    <div className="h-8 w-2/3 rounded bg-slate-800/50 mb-4" />
                    <div className="h-4 w-1/3 rounded bg-slate-800/50 mb-8" />
                    <div className="space-y-4">
                        <div className="h-4 w-full rounded bg-slate-800/50" />
                        <div className="h-4 w-full rounded bg-slate-800/50" />
                        <div className="h-4 w-2/3 rounded bg-slate-800/50" />
                    </div>
                </div>
            </PageShell>
        );
    }

    if (error || !program) {
        return (
            <PageShell>
                <div className="mx-auto max-w-4xl text-center py-20">
                    <h2 className="text-2xl font-bold text-white mb-4">Program Not Found</h2>
                    <p className="text-slate-400 mb-8">{error || "The requested training program could not be found."}</p>
                    <Link href="/jobs/training" className="text-teal-400 hover:text-teal-300">
                        ← Back to Training Programs
                    </Link>
                </div>
            </PageShell>
        );
    }

    return (
        <PageShell>
            <div className="mx-auto max-w-5xl">
                {/* Breadcrumb */}
                <div className="mb-6 flex items-center gap-2 text-sm text-slate-400">
                    <Link href="/jobs" className="hover:text-white">Jobs & Training</Link>
                    <span>/</span>
                    <Link href="/jobs/training" className="hover:text-white">Training Programs</Link>
                    <span>/</span>
                    <span className="text-white truncate max-w-[200px]">{program.title}</span>
                </div>

                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Main Content */}
                    <div className="lg:col-span-2">
                        {/* Header */}
                        <div className="rounded-3xl border border-slate-700/50 bg-slate-800/30 p-8 mb-8 backdrop-blur-sm">
                            <div className="flex flex-wrap gap-2 mb-4">
                                <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-sm font-medium">
                                    {program.category}
                                </span>
                                <span className="px-3 py-1 rounded-full bg-slate-700 text-slate-300 text-sm font-medium">
                                    {program.format.replace('-', ' ')}
                                </span>
                            </div>

                            <h1 className="text-3xl font-bold text-white mb-4 sm:text-4xl">
                                {program.title}
                            </h1>

                            <div className="flex items-center gap-3 text-slate-300 mb-6">
                                <BuildingLibraryIcon className="h-5 w-5 text-slate-500" />
                                <span className="font-medium text-teal-400">{program.provider.name}</span>
                                {program.provider.isVerified && (
                                    <CheckBadgeIcon className="h-5 w-5 text-blue-400" title="Verified Provider" />
                                )}
                            </div>

                            <p className="text-lg text-slate-300 leading-relaxed">
                                {program.shortDescription}
                            </p>
                        </div>

                        {/* Description */}
                        <div className="prose prose-invert prose-lg max-w-none mb-12">
                            <h3 className="text-xl font-bold text-white mb-4">About this Program</h3>
                            <div className="whitespace-pre-line text-slate-300">
                                {program.description}
                            </div>
                        </div>

                        {/* Syllabus/Curriculum would go here if available */}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Key Info Card */}
                        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
                            <h3 className="text-lg font-bold text-white mb-6">Program Details</h3>

                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <CalendarIcon className="h-5 w-5 text-slate-500 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase font-semibold">Start Date</p>
                                        <p className="text-white">{formatDate(program.startDate)}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <CalendarIcon className="h-5 w-5 text-slate-500 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase font-semibold">Duration</p>
                                        <p className="text-white">{program.duration}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <CurrencyDollarIcon className="h-5 w-5 text-slate-500 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase font-semibold">Cost</p>
                                        <p className="text-white">
                                            {program.costType === 'free' ? <span className="text-green-400 font-bold">Free</span> : program.cost}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <MapPinIcon className="h-5 w-5 text-slate-500 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase font-semibold">Location</p>
                                        <p className="text-white">
                                            {program.location.isRemote ? 'Online / Remote' : `${program.location.city}, ${program.location.province}`}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <AcademicCapIcon className="h-5 w-5 text-slate-500 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase font-semibold">Certification</p>
                                        <p className="text-white">{program.certification}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-700/50">
                                {program.externalUrl ? (
                                    <a
                                        href={program.externalUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-500/20 transition-all hover:bg-teal-600 hover:scale-[1.02]"
                                    >
                                        Visit Website
                                        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                                    </a>
                                ) : (
                                    <button
                                        onClick={handleEnroll}
                                        disabled={enrolling}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-500/20 transition-all hover:bg-teal-600 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {enrolling ? 'Enrolling...' : 'Enroll Now'}
                                    </button>
                                )}

                                {program.enrollmentDeadline && (
                                    <p className="mt-3 text-center text-xs text-slate-400">
                                        Deadline: {formatDate(program.enrollmentDeadline)}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Provider Card logic could be here */}

                        {/* Share */}
                        <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/30 px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700">
                            <ShareIcon className="h-4 w-4" />
                            Share Program
                        </button>
                    </div>
                </div>
            </div>
        </PageShell>
    );
}

export default function TrainingDetailPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#020617]" />}>
            <TrainingDetailContent />
        </Suspense>
    );
}
