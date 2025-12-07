"use client";

import { useState } from "react";
import Image from "next/image";
import { type Conference, type ConferenceSpeaker } from "@/lib/types";
import { uploadEventImage } from "@/lib/firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { PlusIcon, TrashIcon, PencilIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";

interface SpeakersTabProps {
    conference: Conference;
    onChange: (updates: Partial<Conference>) => void;
}

export function SpeakersTab({ conference, onChange }: SpeakersTabProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const speakers = conference.speakers || [];

    const addSpeaker = () => {
        const newSpeaker: ConferenceSpeaker = {
            id: uuidv4(),
            name: "",
            title: "",
            organization: "",
            bio: "",
        };
        const newSpeakers = [...speakers, newSpeaker];
        onChange({ speakers: newSpeakers });
        setEditingId(newSpeaker.id);
    };

    const removeSpeaker = (id: string) => {
        if (!confirm("Remove this speaker?")) return;
        const newSpeakers = speakers.filter((s) => s.id !== id);
        onChange({ speakers: newSpeakers });
        if (editingId === id) setEditingId(null);
    };

    const updateSpeaker = (id: string, updates: Partial<ConferenceSpeaker>) => {
        const newSpeakers = speakers.map((s) => (s.id === id ? { ...s, ...updates } : s));
        onChange({ speakers: newSpeakers });
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, speakerId: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const result = await uploadEventImage(file, conference.id);
            updateSpeaker(speakerId, { photoUrl: result.url });
            toast.success("Photo uploaded");
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload photo");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex h-full min-h-[500px] gap-6 p-6">
            {/* List View */}
            <div className="w-1/3 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Speaker Lineup</h3>
                    <span className="text-xs text-slate-500">{speakers.length} total</span>
                </div>

                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                    {speakers.map((speaker) => (
                        <div
                            key={speaker.id}
                            onClick={() => setEditingId(speaker.id)}
                            className={`group flex items-center gap-3 rounded-lg border p-3 hover:cursor-pointer transition-all ${editingId === speaker.id
                                    ? "border-[#14B8A6] bg-[#14B8A6]/10"
                                    : "border-slate-800 bg-slate-800/50 hover:border-slate-600"
                                }`}
                        >
                            <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-slate-700">
                                {speaker.photoUrl ? (
                                    <Image src={speaker.photoUrl} alt={speaker.name} fill className="object-cover" />
                                ) : (
                                    <UserCircleIcon className="h-full w-full text-slate-500" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className={`truncate text-sm font-medium ${editingId === speaker.id ? 'text-white' : 'text-slate-200'}`}>
                                    {speaker.name || "Unnamed Speaker"}
                                </p>
                                <p className="truncate text-xs text-slate-500">
                                    {speaker.title && speaker.organization
                                        ? `${speaker.title}, ${speaker.organization}`
                                        : speaker.title || speaker.organization || "No details"}
                                </p>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeSpeaker(speaker.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity"
                            >
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        </div>
                    ))}

                    <button
                        onClick={addSpeaker}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 py-3 text-sm text-slate-400 hover:border-slate-500 hover:text-white"
                    >
                        <PlusIcon className="h-4 w-4" />
                        Add Speaker
                    </button>
                </div>
            </div>

            {/* Editor View */}
            <div className="flex-1 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                {editingId ? (
                    (() => {
                        const speaker = speakers.find((s) => s.id === editingId);
                        if (!speaker) return null;
                        return (
                            <div className="space-y-6 animate-in fade-in duration-200">
                                <div className="flex items-start gap-6">
                                    {/* Photo Upload */}
                                    <div className="group relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
                                        {speaker.photoUrl ? (
                                            <Image src={speaker.photoUrl} alt={speaker.name} fill className="object-cover" />
                                        ) : (
                                            <div className="flex h-full w-full flex-col items-center justify-center text-slate-500">
                                                <UserCircleIcon className="h-12 w-12" />
                                                <span className="text-xs">No Photo</span>
                                            </div>
                                        )}
                                        <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 text-xs font-medium text-white">
                                            {uploading ? '...' : 'Upload'}
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e, speaker.id)} disabled={uploading} />
                                        </label>
                                    </div>

                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <label className="text-xs uppercase text-slate-500 font-semibold mb-1 block">Full Name</label>
                                            <input
                                                type="text"
                                                value={speaker.name}
                                                onChange={(e) => updateSpeaker(speaker.id, { name: e.target.value })}
                                                className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:border-[#14B8A6] focus:outline-none"
                                                placeholder="e.g. Dr. Jane Doe"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs uppercase text-slate-500 font-semibold mb-1 block">Job Title</label>
                                                <input
                                                    type="text"
                                                    value={speaker.title || ""}
                                                    onChange={(e) => updateSpeaker(speaker.id, { title: e.target.value })}
                                                    className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:border-[#14B8A6] focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs uppercase text-slate-500 font-semibold mb-1 block">Organization</label>
                                                <input
                                                    type="text"
                                                    value={speaker.organization || ""}
                                                    onChange={(e) => updateSpeaker(speaker.id, { organization: e.target.value })}
                                                    className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:border-[#14B8A6] focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs uppercase text-slate-500 font-semibold mb-1 block">Nation / Community</label>
                                        <input
                                            type="text"
                                            value={speaker.nation || ""}
                                            onChange={(e) => updateSpeaker(speaker.id, { nation: e.target.value })}
                                            className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:border-[#14B8A6] focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase text-slate-500 font-semibold mb-1 block">LinkedIn URL</label>
                                        <input
                                            type="url"
                                            value={speaker.linkedinUrl || ""}
                                            onChange={(e) => updateSpeaker(speaker.id, { linkedinUrl: e.target.value })}
                                            className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:border-[#14B8A6] focus:outline-none"
                                            placeholder="https://linkedin.com/in/..."
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs uppercase text-slate-500 font-semibold mb-1 block">Biography</label>
                                    <textarea
                                        rows={6}
                                        value={speaker.bio || ""}
                                        onChange={(e) => updateSpeaker(speaker.id, { bio: e.target.value })}
                                        className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:border-[#14B8A6] focus:outline-none"
                                        placeholder="Short bio..."
                                    />
                                </div>
                            </div>
                        );
                    })()
                ) : (
                    <div className="flex h-full flex-col items-center justify-center text-slate-500">
                        <UserCircleIcon className="mb-2 h-16 w-16 opacity-20" />
                        <p className="text-sm">Select a speaker to edit details</p>
                    </div>
                )}
            </div>
        </div>
    );
}
