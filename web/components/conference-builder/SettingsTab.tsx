"use client";

import { useState } from "react";
import { type Conference } from "@/lib/types";
import { deleteConference, updateConference } from "@/lib/firestore";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

interface SettingsTabProps {
    conference: Conference;
}

export function SettingsTab({ conference }: SettingsTabProps) {
    const router = useRouter();
    const [deleting, setDeleting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [isActive, setIsActive] = useState(conference.active ?? false);

    const handleTogglePublish = async () => {
        setPublishing(true);
        try {
            const newActiveState = !isActive;
            await updateConference(conference.id, { active: newActiveState });
            setIsActive(newActiveState);
            toast.success(newActiveState ? "Conference published!" : "Conference unpublished");
        } catch (error) {
            console.error(error);
            toast.error("Failed to update conference status");
        } finally {
            setPublishing(false);
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
        </div>
    );
}
