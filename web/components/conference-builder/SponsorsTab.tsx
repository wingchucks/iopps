"use client";

import { useState } from "react";
import Image from "next/image";
import { type Conference, type ConferenceSponsor } from "@/lib/types";
import { uploadEventImage } from "@/lib/firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { PlusIcon, TrashIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";

interface SponsorsTabProps {
    conference: Conference;
    onChange: (updates: Partial<Conference>) => void;
}

const TIERS = [
    { id: "platinum", label: "Platinum", color: "bg-slate-300 border-slate-400" }, // Simplified coloring
    { id: "gold", label: "Gold", color: "bg-amber-500/20 border-amber-500" },
    { id: "silver", label: "Silver", color: "bg-slate-400/20 border-slate-400" },
    { id: "bronze", label: "Bronze", color: "bg-orange-700/20 border-orange-700" },
    { id: "community", label: "Community", color: "bg-teal-500/20 border-teal-500" },
] as const;

export function SponsorsTab({ conference, onChange }: SponsorsTabProps) {
    const [uploadingId, setUploadingId] = useState<string | null>(null);

    const sponsors = conference.sponsors || [];

    const addSponsor = (tier: ConferenceSponsor['tier']) => {
        const newSponsor: ConferenceSponsor = {
            id: uuidv4(),
            name: "New Sponsor",
            tier,
            logoUrl: "",
            websiteUrl: "",
        };
        onChange({ sponsors: [...sponsors, newSponsor] });
    };

    const removeSponsor = (id: string) => {
        if (!confirm("Remove this sponsor?")) return;
        onChange({ sponsors: sponsors.filter((s) => s.id !== id) });
    };

    const updateSponsor = (id: string, updates: Partial<ConferenceSponsor>) => {
        onChange({
            sponsors: sponsors.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        });
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, sponsorId: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingId(sponsorId);
        try {
            const result = await uploadEventImage(file, conference.id);
            updateSponsor(sponsorId, { logoUrl: result.url });
            toast.success("Logo uploaded");
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload logo");
        } finally {
            setUploadingId(null);
        }
    };

    return (
        <div className="p-6 space-y-8">
            {TIERS.map((tier) => {
                const tierSponsors = sponsors.filter((s) => s.tier === tier.id);
                return (
                    <div key={tier.id} className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className={`text-sm font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${tier.color} bg-opacity-20 inline-block`}>
                                {tier.label} Sponsors
                            </h3>
                            <button
                                onClick={() => addSponsor(tier.id as any)}
                                className="text-xs flex items-center gap-1 text-slate-400 hover:text-white"
                            >
                                <PlusIcon className="h-4 w-4" /> Add
                            </button>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {tierSponsors.length === 0 && (
                                <div className="col-span-full py-8 text-center text-sm text-slate-500 border border-dashed border-slate-800 rounded-lg">
                                    No {tier.label.toLowerCase()} sponsors yet.
                                </div>
                            )}
                            {tierSponsors.map((sponsor) => (
                                <div key={sponsor.id} className="relative group rounded-lg border border-slate-700 bg-slate-800 p-4 transition-all hover:border-slate-600">
                                    <button
                                        onClick={() => removeSponsor(sponsor.id)}
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity z-10"
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </button>

                                    <div className="flex items-start gap-4">
                                        {/* Logo Upload */}
                                        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded bg-white p-1">
                                            {sponsor.logoUrl ? (
                                                <Image src={sponsor.logoUrl} alt={sponsor.name} fill className="object-contain" />
                                            ) : (
                                                <PhotoIcon className="h-full w-full text-slate-300" />
                                            )}
                                            <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                                                <span className="text-[10px] text-white font-medium text-center">
                                                    {uploadingId === sponsor.id ? "..." : "Upload Logo"}
                                                </span>
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e, sponsor.id)} disabled={uploadingId === sponsor.id} />
                                            </label>
                                        </div>

                                        <div className="flex-1 space-y-2">
                                            <input
                                                type="text"
                                                value={sponsor.name}
                                                onChange={(e) => updateSponsor(sponsor.id, { name: e.target.value })}
                                                placeholder="Sponsor Name"
                                                className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm text-white focus:border-[#14B8A6] focus:outline-none"
                                            />
                                            <input
                                                type="url"
                                                value={sponsor.websiteUrl || ""}
                                                onChange={(e) => updateSponsor(sponsor.id, { websiteUrl: e.target.value })}
                                                placeholder="https://"
                                                className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 text-xs text-slate-400 focus:border-[#14B8A6] focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
