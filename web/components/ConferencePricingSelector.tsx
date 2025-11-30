"use client";

import { useState } from "react";
import { CONFERENCE_PRODUCTS, ConferenceProductType } from "@/lib/stripe";

interface ConferencePricingSelectorProps {
    conferenceId: string;
    userId: string;
}

export default function ConferencePricingSelector({ conferenceId, userId }: ConferencePricingSelectorProps) {
    const [loading, setLoading] = useState<ConferenceProductType | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSelectPlan = async (productType: ConferenceProductType) => {
        try {
            setLoading(productType);
            setError(null);

            // Create checkout session
            const response = await fetch("/api/stripe/checkout-conference", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    conferenceId,
                    productType,
                    userId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to create checkout session");
            }

            // Redirect to Stripe checkout using the URL from the session
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error("No checkout URL received");
            }
        } catch (err: any) {
            console.error("Checkout error:", err);
            setError(err.message || "Something went wrong");
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white">Choose Your Conference Listing Package</h2>
                <p className="mt-2 text-slate-400">Select the best option to promote your event</p>
            </div>

            {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-center">
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
                {/* Standard Listing */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-white">{CONFERENCE_PRODUCTS.STANDARD.name}</h3>
                        <div className="mt-2 flex items-baseline gap-1">
                            <span className="text-4xl font-bold text-emerald-400">${CONFERENCE_PRODUCTS.STANDARD.price / 100}</span>
                            <span className="text-slate-500">CAD</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-400">{CONFERENCE_PRODUCTS.STANDARD.description}</p>
                    </div>

                    <ul className="mb-6 space-y-3 text-sm">
                        <li className="flex items-start gap-2 text-slate-300">
                            <svg className="h-5 w-5 flex-shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Visible for {CONFERENCE_PRODUCTS.STANDARD.duration} days</span>
                        </li>
                        <li className="flex items-start gap-2 text-slate-300">
                            <svg className="h-5 w-5 flex-shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Full event details with banner image</span>
                        </li>
                        <li className="flex items-start gap-2 text-slate-300">
                            <svg className="h-5 w-5 flex-shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Registration link included</span>
                        </li>
                        <li className="flex items-start gap-2 text-slate-300">
                            <svg className="h-5 w-5 flex-shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Standard positioning</span>
                        </li>
                    </ul>

                    <button
                        onClick={() => handleSelectPlan("STANDARD")}
                        disabled={loading === "STANDARD"}
                        className="w-full rounded-lg border border-slate-700 bg-slate-800/40 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                    >
                        {loading === "STANDARD" ? "Processing..." : "Select Standard"}
                    </button>
                </div>

                {/* Featured Listing */}
                <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-600/5 p-6 shadow-lg ring-2 ring-amber-500/20 transition hover:ring-amber-500/30">
                    <div className="mb-4">
                        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400">
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            BEST VALUE
                        </div>
                        <h3 className="text-lg font-semibold text-white">{CONFERENCE_PRODUCTS.FEATURED.name}</h3>
                        <div className="mt-2 flex items-baseline gap-1">
                            <span className="text-4xl font-bold text-amber-400">${CONFERENCE_PRODUCTS.FEATURED.price / 100}</span>
                            <span className="text-slate-500">CAD</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-400">{CONFERENCE_PRODUCTS.FEATURED.description}</p>
                    </div>

                    <ul className="mb-6 space-y-3 text-sm">
                        <li className="flex items-start gap-2 text-slate-300">
                            <svg className="h-5 w-5 flex-shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Visible for {CONFERENCE_PRODUCTS.FEATURED.duration} days</span>
                        </li>
                        <li className="flex items-start gap-2 text-slate-300">
                            <svg className="h-5 w-5 flex-shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Featured badge &amp; banner image</span>
                        </li>
                        <li className="flex items-start gap-2 text-slate-300">
                            <svg className="h-5 w-5 flex-shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Top positioning spotlight</span>
                        </li>
                        <li className="flex items-start gap-2 text-slate-300">
                            <svg className="h-5 w-5 flex-shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Premium analytics</span>
                        </li>
                        <li className="flex items-start gap-2 text-slate-300">
                            <svg className="h-5 w-5 flex-shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Social media promotion</span>
                        </li>
                    </ul>

                    <button
                        onClick={() => handleSelectPlan("FEATURED")}
                        disabled={loading === "FEATURED"}
                        className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-amber-600 hover:to-amber-700 disabled:opacity-50"
                    >
                        {loading === "FEATURED" ? "Processing..." : "Select Featured"}
                    </button>
                </div>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
                <p className="text-sm text-slate-300">
                    <span className="font-semibold text-emerald-400">💡 Tip:</span> Featured listings get 3x more views and registrations on average
                </p>
            </div>
        </div>
    );
}
