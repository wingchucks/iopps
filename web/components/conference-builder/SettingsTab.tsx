"use client";

import { useState } from "react";
import { type Conference } from "@/lib/types";
import { deleteConference } from "@/lib/firestore";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

interface SettingsTabProps {
    conference: Conference;
}

export function SettingsTab({ conference }: SettingsTabProps) {
    const router = useRouter();
    const [deleting, setDeleting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

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
