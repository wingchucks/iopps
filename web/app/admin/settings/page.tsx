"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
    getPlatformSettings,
    updatePlatformSettings,
    PillarPaymentSettings,
    DEFAULT_PAYMENT_SETTINGS,
} from "@/lib/platformSettings";
import { toast } from "react-hot-toast";
import {
    BriefcaseIcon,
    CalendarDaysIcon,
    AcademicCapIcon,
    ShoppingBagIcon,
    SparklesIcon,
    CheckCircleIcon,
    CurrencyDollarIcon,
} from "@heroicons/react/24/outline";

interface PillarConfig {
    key: keyof PillarPaymentSettings;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
}

const pillars: PillarConfig[] = [
    {
        key: "jobs",
        label: "Jobs",
        description: "Job postings by employers",
        icon: BriefcaseIcon,
    },
    {
        key: "conferences",
        label: "Conferences",
        description: "Conference listings and events",
        icon: CalendarDaysIcon,
    },
    {
        key: "scholarships",
        label: "Scholarships",
        description: "Scholarship and grant postings",
        icon: AcademicCapIcon,
    },
    {
        key: "shop",
        label: "Shop Indigenous",
        description: "Vendor shop profiles and products",
        icon: ShoppingBagIcon,
    },
    {
        key: "powwows",
        label: "Pow Wows & Events",
        description: "Pow wow and cultural event listings",
        icon: SparklesIcon,
    },
];

export default function AdminSettingsPage() {
    const { user } = useAuth();
    const [settings, setSettings] = useState<PillarPaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        async function fetchSettings() {
            const platformSettings = await getPlatformSettings();
            setSettings(platformSettings.paymentRequired);
            setLoading(false);
        }
        fetchSettings();
    }, []);

    const handleToggle = async (pillar: keyof PillarPaymentSettings) => {
        const newValue = !settings[pillar];
        setSaving(pillar);

        // Optimistic update
        setSettings((prev) => ({ ...prev, [pillar]: newValue }));

        const success = await updatePlatformSettings(
            { [pillar]: newValue },
            user?.uid
        );

        if (success) {
            toast.success(
                `${pillars.find((p) => p.key === pillar)?.label} is now ${newValue ? "PAID" : "FREE"
                }`
            );
        } else {
            // Revert on failure
            setSettings((prev) => ({ ...prev, [pillar]: !newValue }));
            toast.error("Failed to update setting");
        }

        setSaving(null);
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-64 animate-pulse rounded bg-surface" />
                <div className="h-4 w-96 animate-pulse rounded bg-surface" />
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-20 animate-pulse rounded-lg bg-surface" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Platform Settings</h1>
                <p className="mt-1 text-[var(--text-muted)]">
                    Control which pillars require payment to post content.
                </p>
            </div>

            {/* Payment Controls */}
            <div className="rounded-xl border border-[var(--card-border)] bg-surface p-6">
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-foreground">
                        Payment Controls
                    </h2>
                    <p className="text-sm text-[var(--text-muted)]">
                        Toggle ON to require Stripe payment. Toggle OFF to allow free posting.
                    </p>
                </div>

                <div className="space-y-4">
                    {pillars.map((pillar) => {
                        const isEnabled = settings[pillar.key];
                        const isSaving = saving === pillar.key;
                        const Icon = pillar.icon;

                        return (
                            <div
                                key={pillar.key}
                                className={`flex items-center justify-between rounded-lg border p-4 transition-all ${isEnabled
                                        ? "border-amber-500/30 bg-amber-500/5"
                                        : "border-accent/30 bg-accent/5"
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${isEnabled ? "bg-amber-500/20" : "bg-accent/20"
                                            }`}
                                    >
                                        <Icon
                                            className={`h-5 w-5 ${isEnabled ? "text-amber-500" : "text-accent"
                                                }`}
                                        />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-foreground">{pillar.label}</h3>
                                        <p className="text-sm text-[var(--text-muted)]">{pillar.description}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {/* Status Badge */}
                                    <span
                                        className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${isEnabled
                                                ? "bg-amber-500/20 text-amber-400"
                                                : "bg-accent/20 text-accent"
                                            }`}
                                    >
                                        {isEnabled ? (
                                            <>
                                                <CurrencyDollarIcon className="h-3.5 w-3.5" />
                                                Paid
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircleIcon className="h-3.5 w-3.5" />
                                                Free
                                            </>
                                        )}
                                    </span>

                                    {/* Toggle */}
                                    <button
                                        onClick={() => handleToggle(pillar.key)}
                                        disabled={isSaving}
                                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#14B8A6] focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${isEnabled ? "bg-amber-500" : "bg-slate-600"
                                            }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[var(--card-bg)] shadow ring-0 transition duration-200 ease-in-out ${isEnabled ? "translate-x-5" : "translate-x-0"
                                                }`}
                                        />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Info Box */}
            <div className="rounded-lg border border-[var(--card-border)] bg-surface p-4">
                <h3 className="font-medium text-foreground">How it works</h3>
                <ul className="mt-2 space-y-1 text-sm text-[var(--text-muted)]">
                    <li>• <strong className="text-amber-400">Paid</strong> — Users must complete Stripe checkout to post</li>
                    <li>• <strong className="text-accent">Free</strong> — Users can post immediately without payment</li>
                    <li>• Changes take effect immediately for new posts</li>
                    <li>• Existing paid posts are not affected</li>
                </ul>
            </div>
        </div>
    );
}
