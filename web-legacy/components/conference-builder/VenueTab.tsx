"use client";

import { type Conference } from "@/lib/types";

interface VenueTabProps {
    conference: Conference;
    onChange: (updates: Partial<Conference>) => void;
}

export function VenueTab({ conference, onChange }: VenueTabProps) {
    const venue = conference.venue || { name: "" };

    const updateVenue = (updates: Partial<typeof venue>) => {
        onChange({ venue: { ...venue, ...updates } });
    };

    const updateAccessibility = (feature: string, checked: boolean) => {
        const current = new Set(conference.accessibilityFeatures || []);
        if (checked) current.add(feature);
        else current.delete(feature);
        onChange({ accessibilityFeatures: Array.from(current) });
    };

    const COMMON_FEATURES = [
        "Wheelchair Accessible",
        "Gender Neutral Washrooms",
        "ASL Interpretation",
        "Quiet Room",
        "Live Captioning",
        "Childcare Services",
    ];

    return (
        <div className="p-6 max-w-3xl space-y-8">
            {/* Basic Venue Info */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">Venue Details</h3>
                <div>
                    <label className="block text-sm font-medium text-foreground">Venue Name</label>
                    <input
                        type="text"
                        value={venue.name}
                        onChange={(e) => updateVenue({ name: e.target.value })}
                        placeholder="e.g. Grand Hotel & Suites"
                        className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground focus:border-[#14B8A6] focus:outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground">Full Address</label>
                    <input
                        type="text"
                        value={venue.address || ""}
                        onChange={(e) => updateVenue({ address: e.target.value })}
                        placeholder="123 Main St"
                        className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground focus:border-[#14B8A6] focus:outline-none"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground">City</label>
                        <input
                            type="text"
                            value={venue.city || ""}
                            onChange={(e) => updateVenue({ city: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground focus:border-[#14B8A6] focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground">Province/State</label>
                        <input
                            type="text"
                            value={venue.province || ""}
                            onChange={(e) => updateVenue({ province: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground focus:border-[#14B8A6] focus:outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Logistics */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">Logistics</h3>
                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-foreground">Parking Info</label>
                        <textarea
                            rows={3}
                            value={venue.parkingInfo || ""}
                            onChange={(e) => updateVenue({ parkingInfo: e.target.value })}
                            placeholder="Is there free parking? Valet?"
                            className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground focus:border-[#14B8A6] focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground">Transit / Directions</label>
                        <textarea
                            rows={3}
                            value={venue.transitInfo || ""}
                            onChange={(e) => updateVenue({ transitInfo: e.target.value })}
                            placeholder="Nearest bus stop or train station"
                            className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground focus:border-[#14B8A6] focus:outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Accessibility */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">Accessibility Features</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                    {COMMON_FEATURES.map((feature) => (
                        <label key={feature} className="flex items-center gap-3 rounded-lg border border-[var(--card-border)] bg-surface p-3 hover:border-[var(--card-border)] cursor-pointer">
                            <input
                                type="checkbox"
                                checked={conference.accessibilityFeatures?.includes(feature)}
                                onChange={(e) => updateAccessibility(feature, e.target.checked)}
                                className="h-4 w-4 rounded border-[var(--card-border)] bg-slate-700 text-[#14B8A6] focus:ring-[#14B8A6]"
                            />
                            <span className="text-sm text-foreground">{feature}</span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
}
