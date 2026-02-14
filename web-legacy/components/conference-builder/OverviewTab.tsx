"use client";

import { useState } from "react";
import Image from "next/image";
import { type Conference } from "@/lib/types";
import { uploadEventImage } from "@/lib/firebase/storage";
import { toast } from "react-hot-toast";

interface OverviewTabProps {
    conference: Conference;
    onChange: (updates: Partial<Conference>) => void;
}

export function OverviewTab({ conference, onChange }: OverviewTabProps) {
    const [uploading, setUploading] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const result = await uploadEventImage(file, conference.id);
            onChange({ bannerImageUrl: result.url });
            toast.success("Banner updated");
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload image");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6 p-6">
            <div className="grid gap-6 md:grid-cols-2">
                {/* Basic Info */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground">
                            Conference Title
                        </label>
                        <input
                            type="text"
                            value={conference.title}
                            onChange={(e) => onChange({ title: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground focus:border-[#14B8A6] focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground">
                            Description
                        </label>
                        <textarea
                            rows={5}
                            value={conference.description}
                            onChange={(e) => onChange({ description: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground focus:border-[#14B8A6] focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={typeof conference.startDate === 'string' ? conference.startDate : ''}
                                onChange={(e) => onChange({ startDate: e.target.value })}
                                className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground focus:border-[#14B8A6] focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground">
                                End Date
                            </label>
                            <input
                                type="date"
                                value={typeof conference.endDate === 'string' ? conference.endDate : ''}
                                onChange={(e) => onChange({ endDate: e.target.value })}
                                className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground focus:border-[#14B8A6] focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Media & Location */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Banner Image
                        </label>
                        <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-[var(--card-border)] bg-surface">
                            {conference.bannerImageUrl ? (
                                <Image
                                    src={conference.bannerImageUrl}
                                    alt="Banner"
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center text-foreground0">
                                    No image uploaded
                                </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                                <label className="cursor-pointer rounded-lg bg-[var(--card-bg)]/10 px-4 py-2 font-medium text-white hover:bg-[var(--card-bg)]/20">
                                    {uploading ? "Uploading..." : "Change Image"}
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        disabled={uploading}
                                    />
                                </label>
                            </div>
                        </div>
                        <p className="mt-1 text-xs text-foreground0">
                            Recommended: 1200x630px JPG or PNG
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground">
                            Location Name
                        </label>
                        <input
                            type="text"
                            value={conference.location}
                            onChange={(e) => onChange({ location: e.target.value })}
                            placeholder="e.g. Vancouver Convention Centre"
                            className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground focus:border-[#14B8A6] focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground">
                                Cost Info
                            </label>
                            <input
                                type="text"
                                value={conference.cost || ""}
                                onChange={(e) => onChange({ cost: e.target.value })}
                                placeholder="Free / $500"
                                className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground focus:border-[#14B8A6] focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground">
                                Registration Link
                            </label>
                            <input
                                type="url"
                                value={conference.registrationLink || ""}
                                onChange={(e) => onChange({ registrationLink: e.target.value })}
                                placeholder="https://"
                                className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground focus:border-[#14B8A6] focus:outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
