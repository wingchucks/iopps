"use client";

import { useState } from "react";
import { JOB_POSTING_PRODUCTS } from "@/lib/stripe";

// Mirror Job Posting type loosely for preview
interface PartialJobPosting {
    title: string;
    location: string;
    employmentType: string;
    description: string;
    responsibilities: string[];
    qualifications: string[];
    salaryRange: string;
}

interface Step4Props {
    data: PartialJobPosting;
    onSubmit: (product: "SINGLE" | "SUBSCRIPTION" | "FREE_POSTING") => void;
    onBack: () => void;
    subscription?: { active: boolean; tier: string; remainingCredits: number };
    isSubmitting: boolean;
    freePostingEnabled: boolean;
}

export default function Step4Preview({
    data,
    onSubmit,
    onBack,
    subscription,
    isSubmitting,
    freePostingEnabled,
}: Step4Props) {
    const [selectedProduct, setSelectedProduct] = useState<
        "SINGLE" | "SUBSCRIPTION" | "FREE_POSTING"
    >(
        freePostingEnabled
            ? "FREE_POSTING"
            : subscription?.active && subscription.remainingCredits > 0
                ? "SUBSCRIPTION"
                : "SINGLE"
    );

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-bold text-slate-100">Review & Publish</h2>
                <p className="text-sm text-slate-400">
                    Double check everything looks good.
                </p>
            </div>

            {/* Mini Preview Card */}
            <div className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 shadow-xl">
                <div className="border-b border-slate-800 pb-4 mb-4">
                    <h3 className="text-2xl font-bold text-slate-100">{data.title}</h3>
                    <div className="mt-2 flex gap-4 text-sm text-slate-400">
                        <span>{data.location}</span>
                        <span>•</span>
                        <span>{data.employmentType}</span>
                        {data.salaryRange && (
                            <>
                                <span>•</span>
                                <span>{data.salaryRange}</span>
                            </>
                        )}
                    </div>
                </div>
                <div className="space-y-4">
                    <h4 className="font-semibold text-slate-200">Description</h4>
                    <p className="text-sm text-slate-300 line-clamp-3">{data.description}</p>
                </div>
            </div>

            {/* Payment Selection */}
            <div className="space-y-4">
                <h3 className="font-semibold text-slate-100">Select Posting Plan</h3>

                <div className="grid gap-4 md:grid-cols-2">
                    {/* Free Posting (Admin Override) */}
                    {freePostingEnabled && (
                        <div
                            onClick={() => setSelectedProduct("FREE_POSTING")}
                            className={`cursor-pointer rounded-xl border p-4 transition-all ${selectedProduct === "FREE_POSTING"
                                    ? "border-emerald-500 bg-emerald-500/10"
                                    : "border-slate-800 bg-slate-900 hover:border-slate-700"
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-emerald-400">Admin Access</h4>
                                <span className="text-lg font-bold text-slate-100">Free</span>
                            </div>
                            <p className="mt-1 text-sm text-slate-400">Unlimited posting enabled.</p>
                        </div>
                    )}

                    {/* Subscription */}
                    {subscription && !freePostingEnabled && (
                        <div
                            onClick={() => setSelectedProduct("SUBSCRIPTION")}
                            className={`cursor-pointer rounded-xl border p-4 transition-all ${selectedProduct === "SUBSCRIPTION"
                                    ? "border-emerald-500 bg-emerald-500/10"
                                    : "border-slate-800 bg-slate-900 hover:border-slate-700"
                                } ${subscription.remainingCredits <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-emerald-400">Membership</h4>
                                <span className="text-lg font-bold text-slate-100">Credit</span>
                            </div>
                            <p className="mt-1 text-sm text-slate-400">
                                {subscription.remainingCredits} credits remaining
                            </p>
                        </div>
                    )}

                    {/* Single Post */}
                    {!freePostingEnabled && (
                        <div
                            onClick={() => setSelectedProduct("SINGLE")}
                            className={`cursor-pointer rounded-xl border p-4 transition-all ${selectedProduct === "SINGLE"
                                    ? "border-[#14B8A6] bg-[#14B8A6]/10"
                                    : "border-slate-800 bg-slate-900 hover:border-slate-700"
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-[#14B8A6]">Single Post</h4>
                                <span className="text-lg font-bold text-slate-100">
                                    ${JOB_POSTING_PRODUCTS.SINGLE.price / 100}
                                </span>
                            </div>
                            <p className="mt-1 text-sm text-slate-400">standard 30-day listing</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-between pt-6">
                <button
                    onClick={onBack}
                    disabled={isSubmitting}
                    className="text-sm font-semibold text-slate-400 hover:text-slate-200"
                >
                    Back
                </button>
                <button
                    onClick={() => onSubmit(selectedProduct)}
                    disabled={isSubmitting}
                    className="rounded-xl bg-[#14B8A6] px-8 py-3 font-semibold text-slate-900 transition-all hover:bg-[#16cdb8] disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
                >
                    {isSubmitting && (
                        <svg className="animate-spin h-4 w-4 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    )}
                    {selectedProduct === 'SINGLE' ? 'Proceed to Payment' : 'Post Job Now'}
                </button>
            </div>
        </div>
    );
}
