"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getEmployerProfile } from "@/lib/firestore/employers";
import {
    listUserServices,
    createService,
    updateService,
    deleteService
} from "@/lib/firestore/services";
import type { Service, ServiceCategory } from "@/lib/types";
import {
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
    WrenchScrewdriverIcon,
    XMarkIcon
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

export default function ServicesTab() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [services, setServices] = useState<Service[]>([]);
    const [employerId, setEmployerId] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [saving, setSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<Service>>({
        title: "",
        description: "",
        tagline: "",
        category: "Consulting",
        priceRange: "",
        serviceAreas: []
    });

    useEffect(() => {
        async function loadData() {
            if (!user) return;
            try {
                const profile = await getEmployerProfile(user.uid);
                if (profile) {
                    setEmployerId(profile.id);
                    const data = await listUserServices(user.uid);
                    setServices(data);
                }
            } catch (err) {
                console.error("Failed to load services data", err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [user]);

    const handleOpenModal = (service?: Service) => {
        if (service) {
            setEditingService(service);
            setFormData({ ...service });
        } else {
            setEditingService(null);
            setFormData({
                title: "",
                description: "",
                tagline: "",
                category: "Consulting",
                priceRange: "",
                serviceAreas: []
            });
        }
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!employerId || !user) return;
        setSaving(true);
        try {
            const profile = await getEmployerProfile(user.uid);
            if (!profile) throw new Error("Profile not found");

            const serviceData: any = {
                ...formData,
                organizationId: employerId,
                provider: {
                    name: profile.organizationName,
                    logo: profile.logoUrl,
                    isVerified: profile.status === 'approved'
                },
                location: { // Assuming basic location for now, or fetch from profile
                    city: profile.location?.split(',')[0] || "Remote",
                    province: profile.location?.split(',')[1]?.trim() || "ON"
                }
            };

            // Ensure serviceAreas is array (split string if manual input)
            // For now assume formData handles it correctly or simplified

            if (editingService) {
                await updateService(editingService.id, serviceData);
            } else {
                await createService(serviceData);
            }

            const data = await listUserServices(user.uid);
            setServices(data);
            setShowModal(false);
        } catch (err) {
            console.error("Failed to save service", err);
            toast.error("Failed to save. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this service?")) return;
        try {
            await deleteService(id);
            setServices(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            console.error("Failed to delete", err);
            toast.error("Failed to delete.");
        }
    };

    if (loading) return <div className="text-slate-400 p-4">Loading services...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">Services</h2>
                    <p className="text-sm text-slate-400">Manage the services you offer to the community.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                >
                    <PlusIcon className="h-4 w-4" />
                    Add Service
                </button>
            </div>

            {services.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-800/30 p-12 text-center">
                    <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-slate-600" />
                    <h3 className="mt-4 text-lg font-medium text-white">No services listed</h3>
                    <p className="mt-2 text-slate-400">List your professional services to reach new clients.</p>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {services.map(service => (
                        <div key={service.id} className="group relative overflow-hidden rounded-xl border border-slate-700 bg-slate-800 p-5 hover:border-blue-500/50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400">
                                    {service.category}
                                </span>
                                <div className="flex gap-2">
                                    <button onClick={() => handleOpenModal(service)} className="text-slate-400 hover:text-white">
                                        <PencilSquareIcon className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => handleDelete(service.id)} className="text-slate-400 hover:text-red-400">
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <h3 className="font-semibold text-white mb-1 line-clamp-1">{service.title}</h3>
                            <p className="text-sm text-slate-400 line-clamp-2 mb-4">{service.tagline}</p>
                            <div className="text-xs text-slate-500">
                                <p>{service.priceRange}</p>
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
                                {editingService ? "Edit Service" : "New Service"}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Service Title</label>
                                <input
                                    required
                                    className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Tagline (for cards)</label>
                                <input
                                    required
                                    className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                                    value={formData.tagline}
                                    onChange={e => setFormData({ ...formData, tagline: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Full Description</label>
                                <textarea
                                    required
                                    rows={4}
                                    className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                                    <select
                                        className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value as ServiceCategory })}
                                    >
                                        <option value="legal">Legal</option>
                                        <option value="accounting">Accounting</option>
                                        <option value="consulting">Consulting</option>
                                        <option value="creative">Creative</option>
                                        <option value="technology">Technology</option>
                                        <option value="construction">Construction</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Price Range</label>
                                    <input
                                        placeholder="e.g. $150/hr or Contact for Quote"
                                        className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                                        value={formData.priceRange}
                                        onChange={e => setFormData({ ...formData, priceRange: e.target.value })}
                                    />
                                </div>
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
                                    className="px-6 py-2 rounded-lg bg-blue-600 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                                >
                                    {saving ? "Saving..." : "Save Service"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
