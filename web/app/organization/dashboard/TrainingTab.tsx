"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getEmployerProfile } from "@/lib/firestore/employers";
import {
    listTrainingPrograms,
    createTrainingProgram,
    updateTrainingProgram,
    deleteTrainingProgram
} from "@/lib/firestore/training";
import type { TrainingProgram } from "@/lib/types";
import {
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
    AcademicCapIcon,
    XMarkIcon
} from "@heroicons/react/24/outline";

export default function TrainingTab() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [programs, setPrograms] = useState<TrainingProgram[]>([]);
    const [employerId, setEmployerId] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingProgram, setEditingProgram] = useState<TrainingProgram | null>(null);
    const [saving, setSaving] = useState(false);

    // Form State - using any for flexible form handling
    const [formData, setFormData] = useState<any>({
        title: "",
        description: "",
        shortDescription: "",
        category: "professional",
        format: "online",
        duration: "",
        cost: "",
        costType: "free",
        externalUrl: "",
        isActive: true,
        isFeatured: false
    });

    useEffect(() => {
        async function loadData() {
            if (!user) return;
            try {
                const profile = await getEmployerProfile(user.uid);
                if (profile) {
                    setEmployerId(profile.id); // Typically same as user.uid but good to be explicit
                    const data = await listTrainingPrograms({ organizationId: profile.id });
                    setPrograms(data);
                }
            } catch (err) {
                console.error("Failed to load training data", err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [user]);

    const handleOpenModal = (program?: TrainingProgram) => {
        if (program) {
            setEditingProgram(program);
            setFormData({ ...program });
        } else {
            setEditingProgram(null);
            setFormData({
                title: "",
                description: "",
                shortDescription: "",
                category: "professional",
                format: "online",
                duration: "",
                cost: "",
                costType: "free",
                externalUrl: "",
                isActive: true,
                isFeatured: false
            });
        }
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!employerId || !user) return;
        setSaving(true);
        try {
            // Need to fetch full profile for provider info usually, but here we just need ID and basic info
            // Ideally backend handles enrichment or we assume profile is loaded.
            // For simplicity, we trust the ID. Enriched provider info is handled by list logic or backend functions.
            // Wait, createTrainingProgram expects Omit<TrainingProgram, "id"...>
            // We need to attach provider info (minified)

            // Re-fetch profile to be sure we have latest name/logo
            const profile = await getEmployerProfile(user.uid);
            if (!profile) throw new Error("Profile not found");

            const programData: any = {
                ...formData,
                organizationId: employerId,
                provider: {
                    name: profile.organizationName,
                    logo: profile.logoUrl,
                    isVerified: profile.status === 'approved' // approximate check
                }
            };

            if (editingProgram) {
                await updateTrainingProgram(editingProgram.id, programData);
            } else {
                // Pass false for isVerifiedOrganization (safe default)
                await createTrainingProgram(programData, false);
            }

            // Reload
            const data = await listTrainingPrograms({ organizationId: employerId });
            setPrograms(data);
            setShowModal(false);
        } catch (err) {
            console.error("Failed to save program", err);
            alert("Failed to save. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this program?")) return;
        try {
            await deleteTrainingProgram(id);
            setPrograms(prev => prev.filter(p => p.id !== id));
        } catch (err) {
            console.error("Failed to delete", err);
            alert("Failed to delete.");
        }
    };

    if (loading) return <div className="text-slate-400 p-4">Loading training programs...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">Training Programs</h2>
                    <p className="text-sm text-slate-400">Manage your courses, workshops, and certifications.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500"
                >
                    <PlusIcon className="h-4 w-4" />
                    Add Program
                </button>
            </div>

            {programs.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-800/30 p-12 text-center">
                    <AcademicCapIcon className="mx-auto h-12 w-12 text-slate-600" />
                    <h3 className="mt-4 text-lg font-medium text-white">No programs yet</h3>
                    <p className="mt-2 text-slate-400">Create your first training program to start accepting enrollments.</p>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {programs.map(program => (
                        <div key={program.id} className="group relative overflow-hidden rounded-xl border border-slate-700 bg-slate-800 p-5 hover:border-teal-500/50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${program.isActive ? "bg-teal-500/10 text-teal-400" : "bg-slate-700 text-slate-400"
                                    }`}>
                                    {program.isActive ? "Active" : "Inactive"}
                                </span>
                                <div className="flex gap-2">
                                    <button onClick={() => handleOpenModal(program)} className="text-slate-400 hover:text-white">
                                        <PencilSquareIcon className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => handleDelete(program.id)} className="text-slate-400 hover:text-red-400">
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <h3 className="font-semibold text-white mb-1 line-clamp-1">{program.title}</h3>
                            <p className="text-sm text-slate-400 line-clamp-2 mb-4">{program.description}</p>
                            <div className="text-xs text-slate-500 space-y-1">
                                <p>{program.format} • {program.duration}</p>
                                <p>{program.startDate ? `Starts: ${program.startDate}` : "Flexible Start"}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-800 p-6">
                            <h3 className="text-lg font-bold text-white">
                                {editingProgram ? "Edit Program" : "New Training Program"}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
                                <input
                                    required
                                    className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:border-teal-500 focus:outline-none"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                                <textarea
                                    required
                                    rows={3}
                                    className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:border-teal-500 focus:outline-none"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                                    <select
                                        className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:border-teal-500 focus:outline-none"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                                    >
                                        <option value="professional">Professional</option>
                                        <option value="trades">Trades</option>
                                        <option value="cultural">Cultural</option>
                                        <option value="workplace">Workplace</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Format</label>
                                    <select
                                        className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:border-teal-500 focus:outline-none"
                                        value={formData.format}
                                        onChange={e => setFormData({ ...formData, format: e.target.value as any })}
                                    >
                                        <option value="online">Online</option>
                                        <option value="in-person">In-Person</option>
                                        <option value="hybrid">Hybrid</option>
                                        <option value="self-paced">Self-Paced</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Duration</label>
                                    <input
                                        placeholder="e.g. 12 weeks"
                                        className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:border-teal-500 focus:outline-none"
                                        value={formData.duration}
                                        onChange={e => setFormData({ ...formData, duration: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Cost</label>
                                    <input
                                        placeholder="e.g. Free, $299, Sponsored"
                                        className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:border-teal-500 focus:outline-none"
                                        value={formData.cost}
                                        onChange={e => setFormData({ ...formData, cost: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Start Date (Optional)</label>
                                    <input
                                        type="date"
                                        className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:border-teal-500 focus:outline-none"
                                        value={formData.startDate}
                                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Active?</label>
                                    <div className="flex items-center h-10">
                                        <input
                                            type="checkbox"
                                            className="h-5 w-5 rounded border-slate-700 bg-slate-800 text-teal-600 focus:ring-teal-500"
                                            checked={formData.isActive}
                                            onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                        />
                                        <span className="ml-2 text-sm text-slate-400">Visible to public</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">External Registration URL</label>
                                <input
                                    className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:border-teal-500 focus:outline-none"
                                    value={formData.registrationUrl}
                                    onChange={e => setFormData({ ...formData, registrationUrl: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-2 rounded-lg bg-teal-600 font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
                                >
                                    {saving ? "Saving..." : "Save Program"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
