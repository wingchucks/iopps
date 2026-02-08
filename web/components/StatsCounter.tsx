"use client";

import { useEffect, useState } from "react";

interface StatItem {
    label: string;
    value: number;
    suffix?: string;
}

interface StatsData {
    jobs: number;
    conferences: number;
    scholarships: number;
    vendors: number;
}

const defaultStats: StatsData = {
    jobs: 500,
    conferences: 50,
    scholarships: 75,
    vendors: 100,
};

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (value === 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: reset animation counter
            setCount(0);
            return;
        }

        const duration = 2000;
        const steps = 60;
        const stepValue = value / steps;
        let current = 0;

        const timer = setInterval(() => {
            current += stepValue;
            if (current >= value) {
                setCount(value);
                clearInterval(timer);
            } else {
                setCount(Math.floor(current));
            }
        }, duration / steps);

        return () => clearInterval(timer);
    }, [value]);

    return (
        <span className="tabular-nums">
            {count.toLocaleString()}{suffix}
        </span>
    );
}

function StatSkeleton() {
    return (
        <div className="text-center animate-pulse">
            <div className="h-10 w-20 mx-auto rounded bg-slate-700/50" />
            <div className="mt-2 h-4 w-24 mx-auto rounded bg-slate-700/30" />
        </div>
    );
}

export function StatsCounter() {
    const [stats, setStats] = useState<StatsData | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch("/api/stats");
                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                } else {
                    setStats(defaultStats);
                }
            } catch {
                setStats(defaultStats);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();

        const timer = setTimeout(() => setIsVisible(true), 300);
        return () => clearTimeout(timer);
    }, []);

    if (!isVisible) return null;

    // Filter out stats that are 0 or not publicly visible yet
    const statItems: StatItem[] = stats
        ? [
            { label: "Jobs", value: stats.jobs, suffix: "+" },
            { label: "Conferences", value: stats.conferences, suffix: "+" },
            { label: "Scholarships", value: stats.scholarships, suffix: "+" },
            // Vendors hidden until Shop Indigenous marketplace is publicly visible
            // { label: "Indigenous Vendors", value: stats.vendors, suffix: "+" },
        ].filter(stat => stat.value > 0)
        : [];

    return (
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {isLoading ? (
                <>
                    <StatSkeleton />
                    <StatSkeleton />
                    <StatSkeleton />
                    <StatSkeleton />
                </>
            ) : (
                statItems.map((stat, index) => (
                    <div
                        key={stat.label}
                        className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500"
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        <div className="text-3xl font-bold text-white md:text-4xl">
                            <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                        </div>
                        <div className="mt-1 text-sm text-[var(--text-muted)]">{stat.label}</div>
                    </div>
                ))
            )}
        </div>
    );
}
