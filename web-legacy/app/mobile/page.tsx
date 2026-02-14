"use client";

import { useState, FormEvent } from "react";
import { createContactSubmission } from "@/lib/firestore";
import Image from "next/image";

export default function MobileAppPage() {
    const [email, setEmail] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!email.trim()) {
            setError("Please enter your email address.");
            return;
        }

        setSubmitting(true);
        setError(null);
        setSuccess(false);

        try {
            await createContactSubmission({
                name: "Mobile Waitlist",
                email,
                subject: "Mobile App Waitlist",
                message: `I'd like to be notified when the IOPPS mobile app launches.`,
            });

            setSuccess(true);
            setEmail("");

            setTimeout(() => setSuccess(false), 5000);
        } catch (err) {
            console.error("Waitlist signup error:", err);
            setError("Failed to join waitlist. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--background)]">
            {/* Hero Section */}
            <section className="relative overflow-hidden border-b border-[var(--border)] bg-gradient-to-b from-white to-slate-50">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.08),transparent_50%)]" />

                <div className="relative mx-auto max-w-7xl px-4 py-20 sm:py-32">
                    <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
                        {/* Left Column - Text Content */}
                        <div className="flex flex-col justify-center">
                            <div className="inline-flex items-center gap-2 rounded-full border border-[#14B8A6]/30 bg-accent/10 px-4 py-1.5 w-fit">
                                <div className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                                <span className="text-sm font-semibold text-[#14B8A6]">Coming Soon</span>
                            </div>

                            <h1 className="mt-6 text-5xl font-bold tracking-tight text-[var(--text-primary)] sm:text-6xl">
                                Indigenous opportunities,
                                <span className="bg-gradient-to-r from-[#14B8A6] to-[#0D9488] bg-clip-text text-transparent"> now mobile</span>
                            </h1>

                            <p className="mt-6 text-lg leading-relaxed text-[var(--text-secondary)]">
                                Access jobs, scholarships, conferences, and Indigenous businesses on the go.
                                Get instant alerts for new opportunities that match your profile. Available soon on iOS and Android.
                            </p>

                            {/* Waitlist Form */}
                            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                                <div>
                                    <label htmlFor="email" className="sr-only">
                                        Email address
                                    </label>
                                    <div className="flex gap-3">
                                        <input
                                            type="email"
                                            id="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="Enter your email"
                                            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/30"
                                            required
                                        />
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="rounded-lg bg-accent px-6 py-3 font-semibold text-[var(--text-primary)] transition hover:bg-[#0F9488] disabled:opacity-50"
                                        >
                                            {submitting ? "Joining..." : "Join Waitlist"}
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                                        {error}
                                    </div>
                                )}

                                {success && (
                                    <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-600">
                                        ✓ You&apos;re on the list! We&apos;ll notify you when the app launches.
                                    </div>
                                )}
                            </form>

                            <p className="mt-4 text-sm text-foreground0">
                                Be the first to know when the IOPPS mobile app is available.
                            </p>
                        </div>

                        {/* Right Column - Phone Mockup */}
                        <div className="relative flex items-center justify-center">
                            <div className="relative">
                                {/* Glow effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-[#14B8A6]/30 to-[#0D9488]/30 blur-3xl" />

                                {/* Phone frame */}
                                <div className="relative rounded-[3rem] border-8 border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-2xl">
                                    <div className="h-[600px] w-[280px] overflow-hidden rounded-[2rem] bg-gradient-to-b from-white to-slate-50">
                                        {/* Notch */}
                                        <div className="mx-auto mt-2 h-6 w-32 rounded-full bg-surface" />

                                        {/* App Preview Content */}
                                        <div className="p-6 space-y-6">
                                            <div>
                                                <h2 className="text-2xl font-bold text-[var(--text-primary)]">IOPPS</h2>
                                                <p className="text-xs text-foreground0">Indigenous Opportunities</p>
                                            </div>

                                            {/* Sample Card */}
                                            <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 w-2 rounded-full bg-green-500" />
                                                    <span className="text-xs font-medium text-green-400">New Job</span>
                                                </div>
                                                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Software Developer</h3>
                                                <p className="text-xs text-foreground0">Remote • Full-time</p>
                                            </div>

                                            <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                                                    <span className="text-xs font-medium text-blue-400">Scholarship</span>
                                                </div>
                                                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Indigenous Youth Grant</h3>
                                                <p className="text-xs text-foreground0">Deadline in 14 days</p>
                                            </div>

                                            <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 w-2 rounded-full bg-purple-500" />
                                                    <span className="text-xs font-medium text-purple-400">Conference</span>
                                                </div>
                                                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Indigenous Career Fair</h3>
                                                <p className="text-xs text-foreground0">Vancouver • May 15</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="mx-auto max-w-7xl px-4 py-20">
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
                        Everything you need, in your pocket
                    </h2>
                    <p className="mt-4 text-lg text-foreground0">
                        The IOPPS mobile app brings the power of our platform to your fingertips.
                    </p>
                </div>

                <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                        {
                            icon: "🔔",
                            title: "Instant Alerts",
                            description: "Get notified immediately when new opportunities match your profile and interests.",
                        },
                        {
                            icon: "💼",
                            title: "Easy Applications",
                            description: "Apply to jobs with one tap using your saved resume and profile information.",
                        },
                        {
                            icon: "📱",
                            title: "Offline Access",
                            description: "Save opportunities for later and access them even without an internet connection.",
                        },
                        {
                            icon: "🎯",
                            title: "Personalized Feed",
                            description: "See opportunities tailored to your skills, location, and career goals.",
                        },
                        {
                            icon: "🔖",
                            title: "Save & Share",
                            description: "Bookmark opportunities and easily share them with friends and family.",
                        },
                        {
                            icon: "📊",
                            title: "Track Progress",
                            description: "Monitor your applications and see your career journey unfold in real-time.",
                        },
                    ].map((feature) => (
                        <div
                            key={feature.title}
                            className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 transition hover:border-[#14B8A6]/30 hover:bg-[var(--background)] active:border-[#14B8A6]/30"
                        >
                            <div className="text-4xl">{feature.icon}</div>
                            <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
                                {feature.title}
                            </h3>
                            <p className="mt-2 text-sm leading-relaxed text-foreground0">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Platform Stats */}
            <section className="border-t border-[var(--border)] bg-gradient-to-b from-slate-50 to-white">
                <div className="mx-auto max-w-7xl px-4 py-20">
                    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { label: "Active Jobs", value: "500+" },
                            { label: "Scholarships", value: "200+" },
                            { label: "Community Members", value: "5,000+" },
                            { label: "Employers", value: "100+" },
                        ].map((stat) => (
                            <div key={stat.label} className="text-center">
                                <div className="text-4xl font-bold text-[#14B8A6]">
                                    {stat.value}
                                </div>
                                <div className="mt-2 text-sm font-medium text-foreground0">
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="border-t border-[var(--border)]">
                <div className="mx-auto max-w-4xl px-4 py-20 text-center">
                    <h2 className="text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
                        Stay connected to your community
                    </h2>
                    <p className="mt-4 text-lg text-[var(--text-secondary)]">
                        Join Indigenous community members and employers already using IOPPS.
                    </p>

                    <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                        <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-6 py-3 shadow-sm">
                            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                            </svg>
                            <div className="text-left">
                                <div className="text-xs text-foreground0">Download on the</div>
                                <div className="text-sm font-semibold text-[var(--text-primary)]">App Store</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-6 py-3 shadow-sm">
                            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                            </svg>
                            <div className="text-left">
                                <div className="text-xs text-foreground0">Get it on</div>
                                <div className="text-sm font-semibold text-[var(--text-primary)]">Google Play</div>
                            </div>
                        </div>
                    </div>

                    <p className="mt-6 text-sm text-foreground0">
                        App stores coming soon. Join the waitlist above to be notified.
                    </p>
                </div>
            </section>
        </div>
    );
}
