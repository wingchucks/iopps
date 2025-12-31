"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    UserGroupIcon,
    DocumentTextIcon,
    ChatBubbleLeftRightIcon,
    MagnifyingGlassIcon,
    CheckCircleIcon,
    SparklesIcon,
    ArrowLeftIcon,
    BuildingOffice2Icon,
} from "@heroicons/react/24/outline";
import { TALENT_POOL_PRODUCTS } from "@/lib/stripe";
import { useAuth } from "@/components/AuthProvider";

export default function TalentPoolPricingPage() {
    const { user, role } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubscribe = async (tier: "MONTHLY" | "ANNUAL") => {
        if (!user) {
            // Redirect to sign in
            router.push("/signin?redirect=/organization/talent/pricing");
            return;
        }

        if (role !== "employer") {
            setError("Talent Pool access is only available to employer accounts.");
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
                body: JSON.stringify({ tier }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to create checkout session");
            }

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
            description: "Access complete member profiles and downloadable resumes from qualified Indigenous professionals",
        },
        {
            icon: ChatBubbleLeftRightIcon,
            title: "Direct Messaging",
            description: "Contact candidates directly through our secure messaging system",
        },
        {
            icon: MagnifyingGlassIcon,
            title: "Advanced Search",
            description: "Filter talent by skills, location, experience, and availability",
        },
        {
            icon: UserGroupIcon,
            title: "Talent Invitations",
            description: "Invite qualified candidates to apply to your job postings",
        },
    ];

    const testimonials = [
        {
            quote: "IOPPS helped us connect with incredible Indigenous talent we wouldn't have found otherwise.",
            author: "Sarah M.",
            role: "HR Director",
        },
        {
            quote: "The talent pool has been invaluable for our commitment to TRC Call #92.",
            author: "James T.",
            role: "Talent Acquisition Manager",
        },
    ];

    return (
        <div className="min-h-screen bg-[#020306]">
            {/* Navigation */}
            <div className="border-b border-slate-800 bg-[#08090C]">
                <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                    <Link
                        href="/organization"
                        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </div>
            </div>

            {/* Hero Section */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-transparent to-emerald-500/10" />
                <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/20 mb-8">
                        <UserGroupIcon className="h-10 w-10 text-teal-400" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                        Indigenous Talent Pool Access
                    </h1>
                    <p className="text-xl text-slate-400 max-w-3xl mx-auto">
                        Connect with qualified Indigenous professionals actively seeking opportunities.
                        Build an inclusive workforce and support reconciliation efforts through meaningful employment.
                    </p>
                </div>
            </div>

            {/* Features Section */}
            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                <h2 className="text-2xl font-bold text-white text-center mb-12">
                    What&apos;s Included
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature) => (
                        <div
                            key={feature.title}
                            className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 text-center"
                        >
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-teal-500/10 mb-4">
                                <feature.icon className="h-7 w-7 text-teal-400" />
                            </div>
                            <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                            <p className="text-sm text-slate-400">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mx-auto max-w-3xl px-4">
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-center text-red-400 mb-8">
                        {error}
                    </div>
                </div>
            )}

            {/* Pricing Section */}
            <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
                <h2 className="text-2xl font-bold text-white text-center mb-12">
                    Choose Your Plan
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Monthly Plan */}
                    <div className="relative rounded-2xl border border-slate-700 bg-slate-800/50 p-8">
                        <h3 className="text-xl font-semibold text-white">Monthly Access</h3>
                        <div className="mt-6 flex items-baseline gap-1">
                            <span className="text-5xl font-bold text-white">
                                ${(TALENT_POOL_PRODUCTS.MONTHLY.price / 100).toFixed(0)}
                            </span>
                            <span className="text-slate-400">/month</span>
                        </div>
                        <p className="mt-4 text-slate-400">
                            {TALENT_POOL_PRODUCTS.MONTHLY.description}
                        </p>
                        <ul className="mt-8 space-y-4">
                            {TALENT_POOL_PRODUCTS.MONTHLY.features.map((feature) => (
                                <li key={feature} className="flex items-start gap-3 text-slate-300">
                                    <CheckCircleIcon className="h-6 w-6 flex-shrink-0 text-teal-400" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={() => handleSubscribe("MONTHLY")}
                            disabled={loading !== null}
                            className="mt-8 w-full rounded-lg border-2 border-teal-500 bg-transparent px-6 py-4 font-semibold text-teal-400 transition-colors hover:bg-teal-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading === "MONTHLY" ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
                                    Processing...
                                </span>
                            ) : (
                                "Get Monthly Access"
                            )}
                        </button>
                    </div>

                    {/* Annual Plan - Recommended */}
                    <div className="relative rounded-2xl border-2 border-teal-500 bg-slate-800/50 p-8">
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-teal-500 px-4 py-1.5 text-sm font-semibold text-slate-900">
                            <SparklesIcon className="h-4 w-4" />
                            BEST VALUE
                        </div>
                        <h3 className="text-xl font-semibold text-white">Annual Access</h3>
                        <div className="mt-6 flex items-baseline gap-1">
                            <span className="text-5xl font-bold text-white">
                                ${(TALENT_POOL_PRODUCTS.ANNUAL.price / 100).toFixed(0)}
                            </span>
                            <span className="text-slate-400">/year</span>
                        </div>
                        <p className="mt-4 text-slate-400">
                            {TALENT_POOL_PRODUCTS.ANNUAL.description}
                        </p>
                        <div className="mt-3 inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400">
                            Save $290 vs monthly
                        </div>
                        <ul className="mt-6 space-y-4">
                            {TALENT_POOL_PRODUCTS.ANNUAL.features.map((feature) => (
                                <li key={feature} className="flex items-start gap-3 text-slate-300">
                                    <CheckCircleIcon className="h-6 w-6 flex-shrink-0 text-teal-400" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={() => handleSubscribe("ANNUAL")}
                            disabled={loading !== null}
                            className="mt-8 w-full rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-4 font-semibold text-slate-900 shadow-lg shadow-teal-500/25 transition-all hover:shadow-xl hover:shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading === "ANNUAL" ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                                    Processing...
                                </span>
                            ) : (
                                "Get Annual Access"
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* TRC 92 Section */}
            <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-8 text-center">
                    <h3 className="text-xl font-bold text-amber-400 mb-4">
                        Supporting TRC Call to Action #92
                    </h3>
                    <p className="text-slate-400">
                        The Truth and Reconciliation Commission&apos;s Call to Action #92 calls upon the corporate sector
                        to adopt the United Nations Declaration on the Rights of Indigenous Peoples and commit to meaningful
                        consultation and economic opportunities for Indigenous peoples. By using IOPPS, you&apos;re actively
                        supporting reconciliation through inclusive hiring practices.
                    </p>
                </div>
            </div>

            {/* Testimonials */}
            <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
                <h2 className="text-2xl font-bold text-white text-center mb-12">
                    What Employers Say
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {testimonials.map((testimonial, index) => (
                        <div
                            key={index}
                            className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6"
                        >
                            <p className="text-slate-300 italic mb-4">&quot;{testimonial.quote}&quot;</p>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700">
                                    <BuildingOffice2Icon className="h-5 w-5 text-slate-400" />
                                </div>
                                <div>
                                    <p className="font-medium text-white">{testimonial.author}</p>
                                    <p className="text-sm text-slate-400">{testimonial.role}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer CTA */}
            <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 text-center">
                <p className="text-slate-500 mb-4">
                    All subscriptions include full access to the talent pool. Cancel anytime.
                </p>
                <p className="text-sm text-slate-600">
                    Questions? Contact us at{" "}
                    <a href="mailto:support@iopps.ca" className="text-teal-400 hover:underline">
                        support@iopps.ca
                    </a>
                </p>
            </div>
        </div>
    );
}
