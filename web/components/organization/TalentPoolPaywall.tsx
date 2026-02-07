"use client";

import { useState } from "react";
import {
    UserGroupIcon,
    DocumentTextIcon,
    ChatBubbleLeftRightIcon,
    MagnifyingGlassIcon,
    CheckCircleIcon,
    SparklesIcon,
} from "@heroicons/react/24/outline";
import { TALENT_POOL_PRODUCTS } from "@/lib/stripe";
import { useAuth } from "@/components/AuthProvider";

interface TalentPoolPaywallProps {
    employerId: string;
}

export default function TalentPoolPaywall({ employerId }: TalentPoolPaywallProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubscribe = async (tier: "MONTHLY" | "ANNUAL") => {
        if (!user) {
            setError("Please sign in to continue");
            return;
        }

        setLoading(tier);
        setError(null);

        try {
            const idToken = await user.getIdToken();
            const response = await fetch("/api/stripe/checkout-talent-pool", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    tier,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to create checkout session");
            }

            // Redirect to Stripe checkout
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
            setLoading(null);
        }
    };

    const features = [
        {
            icon: DocumentTextIcon,
            title: "View All Resumes",
            description: "Access complete member profiles and downloadable resumes",
        },
        {
            icon: ChatBubbleLeftRightIcon,
            title: "Direct Messaging",
            description: "Contact candidates directly through our messaging system",
        },
        {
            icon: MagnifyingGlassIcon,
            title: "Advanced Search",
            description: "Filter talent by skills, location, and availability",
        },
        {
            icon: UserGroupIcon,
            title: "Talent Invitations",
            description: "Invite qualified candidates to apply to your job postings",
        },
    ];

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-12">
            {/* Hero Section */}
            <div className="text-center max-w-2xl mx-auto mb-12">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/20 mb-6">
                    <UserGroupIcon className="h-10 w-10 text-accent" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-4">
                    Unlock the Indigenous Talent Pool
                </h1>
                <p className="text-lg text-[var(--text-muted)]">
                    Connect with qualified Indigenous professionals actively seeking opportunities.
                    View resumes, send direct messages, and build your inclusive workforce.
                </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto mb-12">
                {features.map((feature) => (
                    <div
                        key={feature.title}
                        className="flex items-start gap-4 rounded-xl border border-[var(--card-border)] bg-slate-800/30 p-4"
                    >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                            <feature.icon className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">{feature.title}</h3>
                            <p className="text-sm text-[var(--text-muted)]">{feature.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 max-w-3xl mx-auto w-full">
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-center text-red-400">
                        {error}
                    </div>
                </div>
            )}

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto w-full">
                {/* Monthly Plan */}
                <div className="relative rounded-2xl border border-[var(--card-border)] bg-surface p-6">
                    <h3 className="text-lg font-semibold text-white">Monthly Access</h3>
                    <div className="mt-4 flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-white">
                            ${(TALENT_POOL_PRODUCTS.MONTHLY.price / 100).toFixed(0)}
                        </span>
                        <span className="text-[var(--text-muted)]">/month</span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                        {TALENT_POOL_PRODUCTS.MONTHLY.description}
                    </p>
                    <ul className="mt-6 space-y-3">
                        {TALENT_POOL_PRODUCTS.MONTHLY.features.map((feature) => (
                            <li key={feature} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-accent" />
                                {feature}
                            </li>
                        ))}
                    </ul>
                    <button
                        onClick={() => handleSubscribe("MONTHLY")}
                        disabled={loading !== null}
                        className="mt-6 w-full rounded-lg border border-accent bg-transparent px-4 py-3 font-semibold text-accent transition-colors hover:bg-accent/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading === "MONTHLY" ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
                                Processing...
                            </span>
                        ) : (
                            "Subscribe Monthly"
                        )}
                    </button>
                </div>

                {/* Annual Plan - Recommended */}
                <div className="relative rounded-2xl border-2 border-accent bg-surface p-6">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-slate-900">
                        <SparklesIcon className="h-3.5 w-3.5" />
                        BEST VALUE
                    </div>
                    <h3 className="text-lg font-semibold text-white">Annual Access</h3>
                    <div className="mt-4 flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-white">
                            ${(TALENT_POOL_PRODUCTS.ANNUAL.price / 100).toFixed(0)}
                        </span>
                        <span className="text-[var(--text-muted)]">/year</span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                        {TALENT_POOL_PRODUCTS.ANNUAL.description}
                    </p>
                    <div className="mt-2 inline-flex items-center rounded-full bg-accent/10 px-2 py-1 text-xs font-medium text-accent">
                        Save $290 vs monthly
                    </div>
                    <ul className="mt-4 space-y-3">
                        {TALENT_POOL_PRODUCTS.ANNUAL.features.map((feature) => (
                            <li key={feature} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-accent" />
                                {feature}
                            </li>
                        ))}
                    </ul>
                    <button
                        onClick={() => handleSubscribe("ANNUAL")}
                        disabled={loading !== null}
                        className="mt-6 w-full rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 px-4 py-3 font-semibold text-slate-900 shadow-lg shadow-teal-500/25 transition-all hover:shadow-xl hover:shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading === "ANNUAL" ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                                Processing...
                            </span>
                        ) : (
                            "Subscribe Annually"
                        )}
                    </button>
                </div>
            </div>

            {/* Footer Note */}
            <p className="mt-8 text-center text-sm text-foreground0 max-w-lg">
                All subscriptions include full access to the talent pool. Cancel anytime.
                Your subscription helps support Indigenous employment initiatives.
            </p>
        </div>
    );
}
