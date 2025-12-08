"use client";

import { useEffect, useState } from "react";

interface StatItem {
    label: string;
    value: number;
    suffix?: string;
}

const stats: StatItem[] = [
    { label: "Jobs", value: 500, suffix: "+" },
    { label: "Conferences", value: 50, suffix: "+" },
    { label: "Scholarships", value: 75, suffix: "+" },
    { label: "Indigenous Vendors", value: 100, suffix: "+" },
];

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
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

export function StatsCounter() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 500);
        return () => clearTimeout(timer);
    }, []);

    if (!isVisible) return null;

    return (
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {stats.map((stat, index) => (
                <div
                    key={stat.label}
                    className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500"
                    style={{ animationDelay: `${index * 100}ms` }}
                >
                    <div className="text-3xl font-bold text-white md:text-4xl">
                        <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                    </div>
                    <div className="mt-1 text-sm text-slate-400">{stat.label}</div>
                </div>
            ))}
        </div>
    );
}
