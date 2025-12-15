"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AcademicCapIcon, BriefcaseIcon } from "@heroicons/react/24/outline";
import { PageShell } from "@/components/PageShell";
import TrainingCard from "@/components/training/TrainingCard";
import TrainingFilters from "@/components/training/TrainingFilters";
import { listTrainingPrograms } from "@/lib/firestore";
import type { TrainingProgram } from "@/lib/types";

function TrainingContent() {
    const searchParams = useSearchParams();
    const [programs, setPrograms] = useState<TrainingProgram[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [filters, setFilters] = useState({
        search: "",
        category: "",
        format: "",
        costType: "",
        location: ""
    });

    useEffect(() => {
        async function loadPrograms() {
            setLoading(true);
            try {
                const data = await listTrainingPrograms({ isActive: true });
                setPrograms(data);
            } catch (err) {
                console.error("Failed to load training programs", err);
                setError("Unable to load training programs at this time.");
            } finally {
                setLoading(false);
            }
        }
        loadPrograms();
    }, []);

    const filteredPrograms = useMemo(() => {
        return programs.filter(program => {
            // Search
            if (filters.search) {
                const term = filters.search.toLowerCase();
                const text = `${program.title} ${program.description} ${program.provider?.name || ''}`.toLowerCase();
                if (!text.includes(term)) return false;
            }

            // Category
            if (filters.category && program.category !== filters.category) return false;

            // Format
            if (filters.format && program.format !== filters.format) return false;

            // Cost
            if (filters.costType && program.costType !== filters.costType) return false;

            return true;
        });
    }, [programs, filters]);

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilters({
            search: "",
            category: "",
            format: "",
            costType: "",
            location: ""
        });
    };

    const hasActiveFilters = Object.values(filters).some(Boolean);

    return (
        <PageShell>
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-800 via-violet-900 to-slate-900 px-6 py-16 sm:px-12 sm:py-24 mb-12">
                <div className="absolute inset-0 opacity-20">
                    <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                            <pattern id="training-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                                <path d="M0 10 L10 0" stroke="white" strokeWidth="0.5" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#training-grid)" />
                    </svg>
                </div>

                <div className="relative mx-auto max-w-3xl text-center">
                    <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/20 px-3 py-1 text-sm font-medium text-purple-300 mb-6 border border-purple-500/30">
                        <AcademicCapIcon className="h-4 w-4" />
                        <span>Skill Building & Education</span>
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                        Training & Development
                    </h1>
                    <p className="mt-4 text-lg text-purple-100">
                        Discover courses, workshops, and certification programs designed to advance your career.
                    </p>

                    <div className="mt-8 flex justify-center gap-4">
                        <Link href="/jobs" className="flex items-center gap-2 text-sm font-semibold text-purple-300 hover:text-white transition-colors">
                            <BriefcaseIcon className="h-4 w-4" />
                            Looking for Jobs?
                        </Link>
                    </div>
                </div>
            </div>

            <TrainingFilters
                filters={filters}
                onChange={handleFilterChange}
                onClear={clearFilters}
                hasActiveFilters={hasActiveFilters}
            />

            {error && (
                <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-80 animate-pulse rounded-2xl bg-slate-800/50" />
                    ))}
                </div>
            ) : filteredPrograms.length === 0 ? (
                <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-12 text-center">
                    <div className="mx-auto h-16 w-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
                        <AcademicCapIcon className="h-8 w-8 text-slate-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">No programs found</h3>
                    <p className="text-slate-400 mb-6">
                        Try adjusting your filters to find more opportunities.
                    </p>
                    <button
                        onClick={clearFilters}
                        className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-6 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
                    >
                        Clear Filters
                    </button>
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredPrograms.map(program => (
                        <TrainingCard key={program.id} program={program} />
                    ))}
                </div>
            )}
        </PageShell>
    );
}

export default function TrainingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#020617]" />}>
            <TrainingContent />
        </Suspense>
    );
}
