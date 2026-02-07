"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
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
import type { Conference } from "@/lib/types";
import {
  AdminLoadingState,
  AdminEmptyState,
  StatusBadge,
  EntityActionsMenu,
  ConfirmationModal,
  type ActionItem,
  type ActionGroup,
} from "@/components/admin";
import {
  CurrencyDollarIcon,
  StarIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface ConferenceWithEmployer extends Conference {
  employerLogoUrl?: string;
}

function AdminConferencesContent() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status");

  const [loading, setLoading] = useState(true);
  const [conferences, setConferences] = useState<ConferenceWithEmployer[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "inactive" | "featured" | "paid">(
    statusFilter === "active" ? "active" :
    statusFilter === "inactive" ? "inactive" :
    statusFilter === "featured" ? "featured" :
    statusFilter === "paid" ? "paid" : "all"
  );
  const [processing, setProcessing] = useState<string | null>(null);

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

    loadConferences();
  }, [user, role, authLoading, router]);

  async function loadConferences() {
    try {
      setLoading(true);

      // Get all conferences
      const conferencesRef = collection(db!, "conferences");
      const conferencesSnap = await getDocs(
        query(conferencesRef, orderBy("createdAt", "desc"))
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

      const conferencesList: ConferenceWithEmployer[] = conferencesSnap.docs.map(
        (doc) => {
          const data = doc.data() as Conference;
          const employer = employerMap.get(data.employerId);
          return {
            ...data,
            id: doc.id,
            employerName: employer?.name || data.employerName || "Unknown Employer",
            employerLogoUrl: employer?.logoUrl,
          };
        }
      );

      setConferences(conferencesList);
    } catch (error) {
      console.error("Error loading conferences:", error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleConferenceStatus(conferenceId: string, currentStatus: boolean) {
    if (!user) return;

    try {
      setProcessing(conferenceId);
      const conferenceRef = doc(db!, "conferences", conferenceId);
      await updateDoc(conferenceRef, {
        active: !currentStatus,
        updatedAt: serverTimestamp(),
      });

      // Update local state
      setConferences((prev) =>
        prev.map((conf) =>
          conf.id === conferenceId ? { ...conf, active: !currentStatus } : conf
        )
      );
    } catch (error) {
      console.error("Error toggling conference status:", error);
      toast.error("Failed to update conference status. Please try again.");
    } finally {
      setProcessing(null);
    }
  }

  async function deleteConference(conferenceId: string, conferenceTitle: string) {
    if (!user) return;

    try {
      setProcessing(conferenceId);
      const conferenceRef = doc(db!, "conferences", conferenceId);
      await deleteDoc(conferenceRef);

      // Update local state
      setConferences((prev) => prev.filter((conf) => conf.id !== conferenceId));
    } catch (error) {
      console.error("Error deleting conference:", error);
      toast.error("Failed to delete conference. Please try again.");
    } finally {
      setProcessing(null);
    }
  }

  if (authLoading || loading) {
    return <AdminLoadingState message="Loading conferences..." />;
  }

  if (!user || (role !== "admin" && role !== "moderator")) {
    return null;
  }

  const filteredConferences = conferences.filter((conf) => {
    if (filter === "all") return true;
    if (filter === "active") return conf.active === true;
    if (filter === "inactive") return conf.active === false;
    if (filter === "featured") return conf.featured === true;
    if (filter === "paid") return conf.paymentStatus === "paid";
    return true;
  });

  const activeCount = conferences.filter((c) => c.active === true).length;
  const inactiveCount = conferences.filter((c) => c.active === false).length;
  const featuredCount = conferences.filter((c) => c.featured === true).length;
  const paidCount = conferences.filter((c) => c.paymentStatus === "paid").length;

  function getPaymentBadge(conference: ConferenceWithEmployer) {
    if (conference.paymentStatus === "paid") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
          <CurrencyDollarIcon className="h-3 w-3" />
          Paid
        </span>
      );
    }
    if (conference.paymentStatus === "pending") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-400">
          Pending
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2 py-0.5 text-xs font-medium text-[var(--text-muted)]">
        Free/Grant
      </span>
    );
  }

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
                Conferences Moderation
              </h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {filteredConferences.length} conference
                {filteredConferences.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Link
              href="/organization/conferences/new"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#16cdb8]"
            >
              + Create New
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-[var(--card-border)] bg-surface p-4">
            <p className="text-sm font-medium text-[var(--text-muted)]">Total</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{conferences.length}</p>
          </div>
          <div className="rounded-lg border border-[var(--card-border)] bg-surface p-4">
            <p className="text-sm font-medium text-[var(--text-muted)]">Active</p>
            <p className="mt-1 text-2xl font-bold text-green-400">{activeCount}</p>
          </div>
          <div className="rounded-lg border border-[var(--card-border)] bg-surface p-4">
            <p className="text-sm font-medium text-[var(--text-muted)]">Featured</p>
            <p className="mt-1 text-2xl font-bold text-amber-400">{featuredCount}</p>
          </div>
          <div className="rounded-lg border border-[var(--card-border)] bg-surface p-4">
            <p className="text-sm font-medium text-[var(--text-muted)]">Paid</p>
            <p className="mt-1 text-2xl font-bold text-accent">{paidCount}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === "all"
                ? "bg-accent text-slate-900"
                : "border border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[#14B8A6]"
              }`}
          >
            All ({conferences.length})
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
          <button
            onClick={() => setFilter("featured")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === "featured"
                ? "bg-amber-500 text-slate-900"
                : "border border-[var(--card-border)] text-[var(--text-secondary)] hover:border-amber-500"
              }`}
          >
            Featured ({featuredCount})
          </button>
          <button
            onClick={() => setFilter("paid")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === "paid"
                ? "bg-accent text-slate-900"
                : "border border-[var(--card-border)] text-[var(--text-secondary)] hover:border-accent"
              }`}
          >
            Paid ({paidCount})
          </button>
        </div>

        {/* Conferences List */}
        <div className="space-y-4">
          {filteredConferences.length === 0 ? (
            <AdminEmptyState
              title="No conferences found"
              message="No conferences match the current filter."
            />
          ) : (
            filteredConferences.map((conference) => {
              const isProcessing = processing === conference.id;
              const isActive = conference.active === true;

              return (
                <div
                  key={conference.id}
                  className="rounded-2xl border border-[var(--card-border)] bg-slate-900/60 p-6 transition hover:border-[var(--card-border)]"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    {/* Conference Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        {conference.employerLogoUrl && (
                          <img
                            src={conference.employerLogoUrl}
                            alt={conference.employerName}
                            className="h-16 w-16 rounded-lg border border-[var(--card-border)] object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-xl font-semibold text-foreground">
                                  {conference.title}
                                </h3>
                                {conference.featured && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
                                    <StarIcon className="h-3 w-3" />
                                    Featured
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-sm text-[var(--text-muted)]">
                                {conference.employerName}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <StatusBadge status={isActive ? "active" : "inactive"} />
                              {getPaymentBadge(conference)}
                            </div>
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
                              {conference.location}
                            </span>
                          </div>

                          {conference.description && (
                            <p className="mt-3 text-sm text-[var(--text-secondary)] line-clamp-2">
                              {conference.description}
                            </p>
                          )}

                          {conference.cost && (
                            <p className="mt-2 text-sm font-medium text-green-400">
                              {conference.cost}
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap gap-4 text-xs text-foreground0">
                            {conference.startDate && (
                              <span>
                                Start:{" "}
                                {typeof conference.startDate === "string"
                                  ? conference.startDate
                                  : new Date(
                                    conference.startDate.seconds * 1000
                                  ).toLocaleDateString()}
                              </span>
                            )}
                            {conference.endDate && (
                              <span>
                                End:{" "}
                                {typeof conference.endDate === "string"
                                  ? conference.endDate
                                  : new Date(
                                    conference.endDate.seconds * 1000
                                  ).toLocaleDateString()}
                              </span>
                            )}
                            {typeof conference.viewsCount === "number" && (
                              <span className="flex items-center gap-1">
                                <EyeIcon className="h-3 w-3" />
                                {conference.viewsCount} views
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/conferences/${conference.id}`}
                        className="rounded-md border border-[var(--card-border)] px-4 py-2 text-sm text-foreground transition hover:border-[#14B8A6] hover:text-[#14B8A6] text-center"
                      >
                        View
                      </Link>

                      <EntityActionsMenu
                        actions={[
                          {
                            id: `edit-${conference.id}`,
                            label: "Edit",
                            href: `/admin/conferences/${conference.id}/edit`,
                          },
                          {
                            id: `products-${conference.id}`,
                            label: "Manage Products",
                            href: `/admin/employers/${conference.employerId}/products`,
                          },
                          {
                            id: `status-${conference.id}`,
                            items: [
                              {
                                id: `toggle-${conference.id}`,
                                label: isActive ? "Deactivate" : "Activate",
                                onClick: () => toggleConferenceStatus(conference.id, isActive),
                                variant: isActive ? "warning" : "success",
                                disabled: isProcessing,
                              },
                            ],
                          },
                          {
                            id: `danger-${conference.id}`,
                            items: [
                              {
                                id: `delete-${conference.id}`,
                                label: "Delete",
                                onClick: () => {
                                  openConfirmModal({
                                    title: "Delete Conference",
                                    message: `Are you sure you want to delete "${conference.title}"? This action cannot be undone.`,
                                    variant: "danger",
                                    confirmText: "Delete",
                                    onConfirm: () => deleteConference(conference.id, conference.title),
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
    </div>
  );
}

export default function AdminConferencesPage() {
  return (
    <Suspense fallback={<AdminLoadingState message="Loading conferences..." />}>
      <AdminConferencesContent />
    </Suspense>
  );
}
