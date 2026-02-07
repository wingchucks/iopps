"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";
import {
  AdminLoadingState,
  EntityActionsMenu,
  ConfirmationModal,
  type ActionItem,
  type ActionGroup,
} from "@/components/admin";
import {
  collection,
  query,
  getDocs,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadPowwowImage } from "@/lib/firebase/storage";
import type { PowwowEvent } from "@/lib/types";
import toast from "react-hot-toast";

interface PowwowWithEmployer extends PowwowEvent {
  employerName?: string;
  employerLogoUrl?: string;
}

import { Suspense } from "react";

function AdminPowwowsContent() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status");

  const [loading, setLoading] = useState(true);
  const [powwows, setPowwows] = useState<PowwowWithEmployer[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">(
    statusFilter === "active" ? "active" : statusFilter === "inactive" ? "inactive" : "all"
  );
  const [processing, setProcessing] = useState<string | null>(null);

  // Edit modal state
  const [editingPowwow, setEditingPowwow] = useState<PowwowWithEmployer | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    host: "",
    location: "",
    description: "",
    dateRange: "",
    registrationStatus: "",
    livestream: false,
    imageUrl: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: "danger" | "warning" | "success" | "info";
    confirmText: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    variant: "danger",
    confirmText: "Confirm",
    onConfirm: () => {},
  });

  const openConfirmModal = (config: Omit<typeof confirmModal, "isOpen">) => {
    setConfirmModal({ ...config, isOpen: true });
  };

  const closeConfirmModal = () => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    if (authLoading) return;

    if (!user || (role !== "admin" && role !== "moderator")) {
      router.push("/");
      return;
    }

    loadPowwows();
  }, [user, role, authLoading, router]);

  async function loadPowwows() {
    try {
      setLoading(true);

      // Get all pow wows
      const powwowsRef = collection(db!, "powwows");
      const powwowsSnap = await getDocs(
        query(powwowsRef, orderBy("createdAt", "desc"))
      );

      // Get employer info
      const employersRef = collection(db!, "employers");
      const employersSnap = await getDocs(employersRef);
      const employerMap = new Map<string, { name: string; logoUrl?: string }>();
      employersSnap.forEach((doc) => {
        const data = doc.data();
        employerMap.set(doc.id, {
          name: data.organizationName,
          logoUrl: data.logoUrl,
        });
      });

      const powwowsList: PowwowWithEmployer[] = powwowsSnap.docs.map((doc) => {
        const data = doc.data() as PowwowEvent;
        const employer = employerMap.get(data.employerId);
        return {
          ...data,
          id: doc.id,
          employerName: employer?.name || "Unknown Organizer",
          employerLogoUrl: employer?.logoUrl,
        };
      });

      setPowwows(powwowsList);
    } catch (error) {
      console.error("Error loading pow wows:", error);
    } finally {
      setLoading(false);
    }
  }

  async function togglePowwowStatus(powwowId: string, currentStatus: boolean) {
    if (!user) return;

    try {
      setProcessing(powwowId);
      const powwowRef = doc(db!, "powwows", powwowId);
      await updateDoc(powwowRef, {
        active: !currentStatus,
        updatedAt: serverTimestamp(),
      });

      // Update local state
      setPowwows((prev) =>
        prev.map((powwow) =>
          powwow.id === powwowId ? { ...powwow, active: !currentStatus } : powwow
        )
      );
    } catch (error) {
      console.error("Error toggling pow wow status:", error);
      toast.error("Failed to update pow wow status. Please try again.");
    } finally {
      setProcessing(null);
    }
  }

  async function deletePowwow(powwowId: string, powwowName: string) {
    if (!user) return;

    try {
      setProcessing(powwowId);
      const powwowRef = doc(db!, "powwows", powwowId);
      await deleteDoc(powwowRef);

      // Update local state
      setPowwows((prev) => prev.filter((powwow) => powwow.id !== powwowId));
    } catch (error) {
      console.error("Error deleting pow wow:", error);
      toast.error("Failed to delete pow wow. Please try again.");
    } finally {
      setProcessing(null);
    }
  }

  function openEditModal(powwow: PowwowWithEmployer) {
    setEditingPowwow(powwow);
    setEditForm({
      name: powwow.name || "",
      host: powwow.host || "",
      location: powwow.location || "",
      description: powwow.description || "",
      dateRange: powwow.dateRange || "",
      registrationStatus: powwow.registrationStatus || "",
      livestream: powwow.livestream || false,
      imageUrl: powwow.imageUrl || "",
    });
  }

  function closeEditModal() {
    setEditingPowwow(null);
    setEditForm({
      name: "",
      host: "",
      location: "",
      description: "",
      dateRange: "",
      registrationStatus: "",
      livestream: false,
      imageUrl: "",
    });
    setAnalyzeError(null);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editingPowwow || !user) return;

    setUploading(true);
    setUploadProgress(0);
    setAnalyzeError(null);

    try {
      // Upload the image to Firebase Storage
      const result = await uploadPowwowImage(file, editingPowwow.id, (progress) => {
        setUploadProgress(progress.progress);
      });
      setEditForm((prev) => ({ ...prev, imageUrl: result.url }));

      // Now analyze the poster with AI to auto-fill fields
      setAnalyzing(true);
      try {
        const token = await user.getIdToken();
        const formData = new FormData();
        formData.append("image", file);
        formData.append("eventType", "powwow");

        const response = await fetch("/api/ai/analyze-poster", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.result?.data) {
            const extracted = data.result.data;
            // Auto-fill the form with extracted data (only fill empty or update existing)
            setEditForm((prev) => ({
              ...prev,
              name: extracted.name || prev.name,
              host: extracted.host || prev.host,
              location: extracted.location || prev.location,
              description: extracted.description || prev.description,
              dateRange: extracted.dateRange || prev.dateRange,
              registrationStatus: extracted.registrationStatus || prev.registrationStatus,
              livestream: extracted.livestream ?? prev.livestream,
            }));
          }
        } else {
          const errorData = await response.json();
          setAnalyzeError(errorData.error || "Failed to analyze poster");
        }
      } catch (analyzeErr) {
        console.error("Error analyzing poster:", analyzeErr);
        setAnalyzeError("Could not analyze poster. You can still fill in the details manually.");
      } finally {
        setAnalyzing(false);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to upload image: ${errorMessage}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  async function saveEditedPowwow() {
    if (!editingPowwow || !user) return;

    setSaving(true);
    try {
      const powwowRef = doc(db!, "powwows", editingPowwow.id);
      await updateDoc(powwowRef, {
        name: editForm.name || "",
        host: editForm.host ?? null,
        location: editForm.location || "",
        description: editForm.description ?? null,
        dateRange: editForm.dateRange ?? null,
        registrationStatus: editForm.registrationStatus ?? null,
        livestream: editForm.livestream ?? false,
        imageUrl: editForm.imageUrl ?? null,
        updatedAt: serverTimestamp(),
      });

      // Update local state
      setPowwows((prev) =>
        prev.map((p) =>
          p.id === editingPowwow.id
            ? { ...p, ...editForm }
            : p
        )
      );

      closeEditModal();
      toast.success("Pow wow updated successfully!");
    } catch (error) {
      console.error("Error saving pow wow:", error);
      toast.error("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-[var(--text-muted)]">Loading events...</p>
        </div>
      </div>
    );
  }

  if (!user || (role !== "admin" && role !== "moderator")) {
    return null;
  }

  const filteredPowwows = powwows.filter((powwow) => {
    if (filter === "all") return true;
    if (filter === "active") return powwow.active === true;
    if (filter === "inactive") return powwow.active === false;
    return true;
  });

  const activeCount = powwows.filter((p) => p.active === true).length;
  const inactiveCount = powwows.filter((p) => p.active === false).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-[var(--card-border)] bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/admin"
                className="text-sm text-[var(--text-muted)] hover:text-[#14B8A6]"
              >
                ← Admin Dashboard
              </Link>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                Pow Wows & Events Moderation
              </h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {filteredPowwows.length} event{filteredPowwows.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Link
              href="/organization/powwows/new"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#16cdb8]"
            >
              + Create New
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === "all"
                ? "bg-accent text-slate-900"
                : "border border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[#14B8A6]"
              }`}
          >
            All ({powwows.length})
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === "active"
                ? "bg-green-500 text-slate-900"
                : "border border-[var(--card-border)] text-[var(--text-secondary)] hover:border-green-500"
              }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setFilter("inactive")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === "inactive"
                ? "bg-slate-500 text-slate-900"
                : "border border-[var(--card-border)] text-[var(--text-secondary)] hover:border-slate-500"
              }`}
          >
            Inactive ({inactiveCount})
          </button>
        </div>

        {/* Pow Wows List */}
        <div className="space-y-4">
          {filteredPowwows.length === 0 ? (
            <div className="rounded-2xl border border-[var(--card-border)] bg-slate-900/60 p-12 text-center">
              <p className="text-[var(--text-muted)]">No pow wows found for this filter.</p>
            </div>
          ) : (
            filteredPowwows.map((powwow) => {
              const isProcessing = processing === powwow.id;
              const isActive = powwow.active === true;

              return (
                <div
                  key={powwow.id}
                  className="rounded-2xl border border-[var(--card-border)] bg-slate-900/60 p-6 transition hover:border-[var(--card-border)]"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    {/* Pow Wow Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        {powwow.employerLogoUrl && (
                          <img
                            src={powwow.employerLogoUrl}
                            alt={powwow.employerName}
                            className="h-16 w-16 rounded-lg border border-[var(--card-border)] object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-semibold text-foreground">
                                {powwow.name}
                              </h3>
                              {powwow.host && (
                                <p className="mt-1 text-sm text-[var(--text-muted)]">
                                  Hosted by: {powwow.host}
                                </p>
                              )}
                              <p className="text-xs text-foreground0">
                                Posted by: {powwow.employerName}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${isActive
                                  ? "bg-green-500/10 text-green-400"
                                  : "bg-slate-500/10 text-[var(--text-muted)]"
                                }`}
                            >
                              {isActive ? "Active" : "Inactive"}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-3 text-sm text-[var(--text-muted)]">
                            <span className="flex items-center gap-1">
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                              {powwow.location}
                            </span>
                            {powwow.season && (
                              <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-xs text-purple-400">
                                {powwow.season}
                              </span>
                            )}
                            {powwow.livestream && (
                              <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
                                Livestreamed
                              </span>
                            )}
                          </div>

                          {powwow.description && (
                            <p className="mt-3 text-sm text-[var(--text-secondary)] line-clamp-2">
                              {powwow.description}
                            </p>
                          )}

                          {powwow.registrationStatus && (
                            <p className="mt-2 text-sm font-medium text-[#14B8A6]">
                              Registration: {powwow.registrationStatus}
                            </p>
                          )}

                          <div className="mt-3 flex gap-4 text-xs text-foreground0">
                            {powwow.dateRange ? (
                              <span>{powwow.dateRange}</span>
                            ) : (
                              <>
                                {powwow.startDate && (
                                  <span>
                                    Start:{" "}
                                    {typeof powwow.startDate === "string"
                                      ? powwow.startDate
                                      : new Date(
                                        powwow.startDate.seconds * 1000
                                      ).toLocaleDateString()}
                                  </span>
                                )}
                                {powwow.endDate && (
                                  <span>
                                    End:{" "}
                                    {typeof powwow.endDate === "string"
                                      ? powwow.endDate
                                      : new Date(
                                        powwow.endDate.seconds * 1000
                                      ).toLocaleDateString()}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/powwows/${powwow.id}`}
                        className="rounded-md border border-[var(--card-border)] px-4 py-2 text-sm text-foreground transition hover:border-[#14B8A6] hover:text-[#14B8A6] text-center"
                      >
                        View
                      </Link>

                      <EntityActionsMenu
                        actions={[
                          {
                            id: `edit-${powwow.id}`,
                            label: "Quick Edit",
                            onClick: () => openEditModal(powwow),
                          },
                          {
                            id: `status-${powwow.id}`,
                            items: [
                              {
                                id: `toggle-${powwow.id}`,
                                label: isActive ? "Deactivate" : "Activate",
                                onClick: () => togglePowwowStatus(powwow.id, isActive),
                                variant: isActive ? "warning" : "success",
                                disabled: isProcessing,
                              },
                            ],
                          },
                          {
                            id: `danger-${powwow.id}`,
                            items: [
                              {
                                id: `delete-${powwow.id}`,
                                label: "Delete",
                                onClick: () => {
                                  openConfirmModal({
                                    title: "Delete Pow Wow",
                                    message: `Are you sure you want to delete "${powwow.name}"? This action cannot be undone.`,
                                    variant: "danger",
                                    confirmText: "Delete",
                                    onConfirm: () => deletePowwow(powwow.id, powwow.name),
                                  });
                                },
                                variant: "danger",
                                disabled: isProcessing,
                              },
                            ],
                          },
                        ]}
                        processing={isProcessing}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={() => {
          confirmModal.onConfirm();
          closeConfirmModal();
        }}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmText={confirmModal.confirmText}
      />

      {/* Edit Modal */}
      {editingPowwow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-surface border border-[var(--card-border)] p-6 shadow-xl my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Edit Pow Wow</h3>
              <button
                onClick={closeEditModal}
                className="p-2 rounded-lg hover:bg-surface text-[var(--text-muted)] hover:text-white transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              {/* Poster Image Upload */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Event Poster
                </label>
                <div className="flex items-start gap-4">
                  {editForm.imageUrl ? (
                    <div className="relative w-32 h-40 rounded-lg overflow-hidden border border-[var(--card-border)]">
                      <Image
                        src={editForm.imageUrl}
                        alt="Event poster"
                        fill
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setEditForm((prev) => ({ ...prev, imageUrl: "" }))}
                        className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white hover:bg-red-600"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="w-32 h-40 rounded-lg border-2 border-dashed border-[var(--card-border)] flex items-center justify-center">
                      <svg className="h-8 w-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || analyzing}
                      className="rounded-lg bg-surface px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
                    >
                      {uploading
                        ? `Uploading ${Math.round(uploadProgress)}%`
                        : analyzing
                        ? "Analyzing with AI..."
                        : editForm.imageUrl
                        ? "Change Poster"
                        : "Upload Poster"}
                    </button>
                    <p className="mt-2 text-xs text-foreground0">JPEG, PNG, WebP or GIF (max 10MB)</p>
                    {analyzing && (
                      <p className="mt-1 text-xs text-[#14B8A6]">
                        AI is reading the poster to auto-fill the form...
                      </p>
                    )}
                    {analyzeError && (
                      <p className="mt-1 text-xs text-amber-400">
                        {analyzeError}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Event Name *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg bg-surface border border-[var(--card-border)] px-4 py-3 text-white placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none"
                  required
                />
              </div>

              {/* Host */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Host / Organizer</label>
                <input
                  type="text"
                  value={editForm.host}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, host: e.target.value }))}
                  className="w-full rounded-lg bg-surface border border-[var(--card-border)] px-4 py-3 text-white placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Location *</label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
                  className="w-full rounded-lg bg-surface border border-[var(--card-border)] px-4 py-3 text-white placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none"
                  required
                />
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Date Range</label>
                <input
                  type="text"
                  value={editForm.dateRange}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, dateRange: e.target.value }))}
                  placeholder="e.g., June 15-17, 2025"
                  className="w-full rounded-lg bg-surface border border-[var(--card-border)] px-4 py-3 text-white placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full rounded-lg bg-surface border border-[var(--card-border)] px-4 py-3 text-white placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none resize-none"
                />
              </div>

              {/* Registration Status */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Registration Status</label>
                <select
                  value={editForm.registrationStatus}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, registrationStatus: e.target.value }))}
                  className="w-full rounded-lg bg-surface border border-[var(--card-border)] px-4 py-3 text-white focus:border-[#14B8A6] focus:outline-none"
                >
                  <option value="">Not specified</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="coming_soon">Coming Soon</option>
                </select>
              </div>

              {/* Livestream */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.livestream}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, livestream: e.target.checked }))}
                    className="h-5 w-5 rounded border-[var(--card-border)] bg-slate-700 text-[#14B8A6] focus:ring-[#14B8A6]"
                  />
                  <span className="text-[var(--text-secondary)]">This event will be livestreamed</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-[var(--card-border)]">
              <button
                type="button"
                onClick={closeEditModal}
                disabled={saving}
                className="px-6 py-3 rounded-lg text-[var(--text-secondary)] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEditedPowwow}
                disabled={saving || uploading || analyzing || !editForm.name || !editForm.location}
                className="px-6 py-3 rounded-lg bg-accent text-slate-900 font-semibold hover:bg-[#16cdb8] transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPowwowsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-[var(--text-muted)]">Loading events...</p>
        </div>
      </div>
    }>
      <AdminPowwowsContent />
    </Suspense>
  );
}
