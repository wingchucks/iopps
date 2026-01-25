"use client";

import { useState } from "react";
import { type Conference } from "@/lib/types";
import { deleteConference, updateConference, computeVisibilityTier, FREE_VISIBILITY_DAYS } from "@/lib/firestore";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { useAuth } from "@/components/AuthProvider";
import { CONFERENCE_PRODUCTS } from "@/lib/stripe";
import { ClockIcon, SparklesIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

interface SettingsTabProps {
    conference: Conference;
}

// Helper to convert timestamp to Date
function toDate(timestamp: any): Date | null {
    if (!timestamp) return null;
    if (timestamp instanceof Date) return timestamp;
    if (timestamp._seconds) return new Date(timestamp._seconds * 1000);
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
    if (timestamp.toDate) return timestamp.toDate();
    if (typeof timestamp === "string") return new Date(timestamp);
    return null;
}

export function SettingsTab({ conference }: SettingsTabProps) {
    const router = useRouter();
    const { user } = useAuth();
    const [deleting, setDeleting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [isActive, setIsActive] = useState(conference.active ?? false);
    const [showBlockedModal, setShowBlockedModal] = useState(false);
    const [blockedReason, setBlockedReason] = useState("");
    const [checkingFeatured, setCheckingFeatured] = useState(false);

    const visibilityTier = computeVisibilityTier(conference);
    const publishedAt = toDate(conference.publishedAt);
    const freeVisibilityExpiresAt = toDate(conference.freeVisibilityExpiresAt);
    const featuredExpiresAt = toDate(conference.featuredExpiresAt);
    const startDate = toDate(conference.startDate);

    // Check if event is far in the future (>90 days)
    const now = new Date();
    const daysUntilEvent = startDate
        ? Math.floor((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
    const isFarFuture = daysUntilEvent > 90;

    // Calculate days remaining for free visibility
    const daysRemainingFree = freeVisibilityExpiresAt
        ? Math.max(0, Math.ceil((freeVisibilityExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : FREE_VISIBILITY_DAYS;

    const handleTogglePublish = async () => {
        if (isActive) {
            // Unpublishing - simple update
            setPublishing(true);
            try {
                await updateConference(conference.id, { active: false });
                setIsActive(false);
                toast.success("Conference unpublished");
            } catch (error) {
                console.error(error);
                toast.error("Failed to update conference status");
            } finally {
                setPublishing(false);
            }
            return;
        }

        // Publishing - use server-side API for enforcement
        setPublishing(true);
        try {
            if (!user) throw new Error("Not authenticated");
            const idToken = await user.getIdToken();

            const response = await fetch("/api/conferences/publish", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    conferenceId: conference.id,
                    willBeFeatured: false,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.blocked) {
                    setBlockedReason(data.reason);
                    setShowBlockedModal(true);
                    return;
                }
                throw new Error(data.error || "Failed to publish");
            }

            setIsActive(true);
            toast.success("Conference published!");

            // Show info about free visibility
            if (!data.alreadyPublished) {
                toast.success(`Your conference has ${FREE_VISIBILITY_DAYS} days of free visibility`, {
                    duration: 5000,
                    icon: "📅",
                });
            }
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Failed to publish conference");
        } finally {
            setPublishing(false);
        }
    };

    const handleFeatureCheckout = async (plan: "FEATURED_90" | "FEATURED_365") => {
        setCheckingFeatured(true);
        try {
            if (!user) throw new Error("Not authenticated");
            const idToken = await user.getIdToken();

            const response = await fetch("/api/stripe/checkout-conference", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    conferenceId: conference.id,
                    productType: plan,
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to start checkout");
        } finally {
            setCheckingFeatured(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await deleteConference(conference.id);
            toast.success("Conference deleted");
            router.push("/organization/dashboard");
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete conference");
            setDeleting(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl space-y-8">
            {/* Visibility Status Card */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Visibility Status</h3>

                {visibilityTier === "featured" && (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                        <SparklesIcon className="h-6 w-6 text-amber-400 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-amber-300">Featured</p>
                            <p className="text-sm text-slate-400 mt-1">
                                Your conference has premium visibility.
                                {featuredExpiresAt && (
                                    <> Expires {featuredExpiresAt.toLocaleDateString()}.</>
                                )}
                            </p>
                        </div>
                    </div>
                )}

                {visibilityTier === "standard" && publishedAt && (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                        <ClockIcon className="h-6 w-6 text-emerald-400 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-emerald-300">Standard Visibility</p>
                            <p className="text-sm text-slate-400 mt-1">
                                {daysRemainingFree > 0 ? (
                                    <>
                                        <span className="text-emerald-400 font-medium">{daysRemainingFree} days</span> of free visibility remaining.
                                        {freeVisibilityExpiresAt && (
                                            <> Expires {freeVisibilityExpiresAt.toLocaleDateString()}.</>
                                        )}
                                    </>
                                ) : (
                                    <>Free visibility period has ended.</>
                                )}
                            </p>
                        </div>
                    </div>
                )}

                {visibilityTier === "demoted" && (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-700/50 border border-slate-600">
                        <ExclamationTriangleIcon className="h-6 w-6 text-slate-400 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-slate-300">Reduced Visibility</p>
                            <p className="text-sm text-slate-400 mt-1">
                                Free visibility period has ended. Your conference is still accessible via direct link but won&apos;t appear in main listings. Feature it to restore visibility.
                            </p>
                        </div>
                    </div>
                )}

                {!publishedAt && (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                        <ClockIcon className="h-6 w-6 text-blue-400 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-blue-300">Not Published</p>
                            <p className="text-sm text-slate-400 mt-1">
                                When you publish, your conference will have {FREE_VISIBILITY_DAYS} days of free standard visibility.
                            </p>
                        </div>
                    </div>
                )}

                {/* Far future warning */}
                {isFarFuture && !conference.featured && (
                    <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <p className="text-sm text-amber-200">
                            <strong>Note:</strong> This event is more than 90 days away. Free listings have standard visibility for 45 days. Consider featuring your event to stay visible longer.
                        </p>
                    </div>
                )}
            </div>

            {/* Feature Your Conference */}
            {visibilityTier !== "featured" && (
                <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-6">
                    <h3 className="text-lg font-semibold text-white mb-2">Boost Your Visibility</h3>
                    <p className="text-sm text-slate-400 mb-4">
                        Get more registrations with featured placement and premium visibility.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <button
                            onClick={() => handleFeatureCheckout("FEATURED_90")}
                            disabled={checkingFeatured}
                            className="flex flex-col items-center justify-center rounded-lg border border-slate-600 bg-slate-800/50 p-4 text-center hover:border-amber-500/50 hover:bg-slate-800 transition-colors disabled:opacity-50"
                        >
                            <span className="text-lg font-bold text-white">${CONFERENCE_PRODUCTS.FEATURED_90.price / 100}</span>
                            <span className="text-sm text-slate-400">90 Days Featured</span>
                        </button>
                        <button
                            onClick={() => handleFeatureCheckout("FEATURED_365")}
                            disabled={checkingFeatured}
                            className="flex flex-col items-center justify-center rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-center hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                        >
                            <span className="inline-block mb-1 text-xs font-bold text-amber-400 uppercase">Best Value</span>
                            <span className="text-lg font-bold text-white">${CONFERENCE_PRODUCTS.FEATURED_365.price / 100}</span>
                            <span className="text-sm text-slate-400">1 Year Featured</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Publish Section */}
            <div className={`rounded-xl border p-6 ${isActive ? 'border-green-700/30 bg-green-900/10' : 'border-amber-700/30 bg-amber-900/10'}`}>
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className={`text-lg font-medium ${isActive ? 'text-green-200' : 'text-amber-200'}`}>
                            {isActive ? 'Published' : 'Draft'}
                        </h3>
                        <p className={`mt-1 text-sm ${isActive ? 'text-green-200/60' : 'text-amber-200/60'}`}>
                            {isActive
                                ? 'Your conference is live and visible on the public conferences page.'
                                : 'Your conference is saved as a draft and not visible to the public.'}
                        </p>
                    </div>
                    <button
                        onClick={handleTogglePublish}
                        disabled={publishing}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                            isActive
                                ? 'border border-amber-700 text-amber-400 hover:bg-amber-900/40'
                                : 'bg-green-600 text-white hover:bg-green-700'
                        } disabled:opacity-50`}
                    >
                        {publishing ? 'Updating...' : isActive ? 'Unpublish' : 'Publish Conference'}
                    </button>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="rounded-xl border border-red-900/30 bg-red-900/10 p-6">
                <h3 className="text-lg font-medium text-red-200">Danger Zone</h3>
                <p className="mt-1 text-sm text-red-200/60">
                    These actions cannot be undone.
                </p>

                <div className="mt-6">
                    {!showConfirm ? (
                        <button
                            onClick={() => setShowConfirm(true)}
                            className="rounded-lg border border-red-700 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-900/40"
                        >
                            Delete Conference
                        </button>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm font-medium text-red-300">
                                Are you absolutely sure? This will permanently delete the conference
                                <span className="font-bold text-white"> {conference.title}</span>.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                                >
                                    {deleting ? "Deleting..." : "Yes, delete it"}
                                </button>
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    disabled={deleting}
                                    className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Blocked Modal - Duplicate repost */}
            {showBlockedModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                                <ExclamationTriangleIcon className="h-6 w-6 text-amber-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Free Visibility Already Used</h2>
                        </div>

                        <p className="text-slate-300 mb-6">
                            {blockedReason || "This conference has already received its free 45-day visibility period. To extend visibility, choose a featured option."}
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    setShowBlockedModal(false);
                                    handleFeatureCheckout("FEATURED_90");
                                }}
                                className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 py-3 font-semibold text-white hover:from-amber-600 hover:to-orange-600 transition-colors"
                            >
                                Feature for 90 Days — ${CONFERENCE_PRODUCTS.FEATURED_90.price / 100}
                            </button>
                            <button
                                onClick={() => {
                                    setShowBlockedModal(false);
                                    handleFeatureCheckout("FEATURED_365");
                                }}
                                className="w-full rounded-lg border border-amber-500/50 bg-amber-500/10 py-3 font-semibold text-white hover:bg-amber-500/20 transition-colors"
                            >
                                Feature for 1 Year — ${CONFERENCE_PRODUCTS.FEATURED_365.price / 100}
                            </button>
                            <button
                                onClick={() => setShowBlockedModal(false)}
                                className="w-full rounded-lg border border-slate-700 py-3 font-medium text-slate-400 hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
