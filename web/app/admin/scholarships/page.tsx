"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  collection,
  query,
  getDocs,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Scholarship } from "@/lib/types";
import toast from "react-hot-toast";

interface ScholarshipWithEmployer extends Scholarship {
  employerLogoUrl?: string;
  expiredAt?: Timestamp | null;
  expirationReason?: string;
  deletedAt?: Timestamp | null;
}

type AdminAction =
  | "force_publish"
  | "force_unpublish"
  | "mark_expired"
  | "reopen"
  | "flag_spam"
  | "unflag_spam"
  | "delete"
  | "restore";

import { Suspense } from "react";

function AdminScholarshipsContent() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status");

  const [loading, setLoading] = useState(true);
  const [scholarships, setScholarships] = useState<ScholarshipWithEmployer[]>([]);
  type FilterType = "all" | "active" | "inactive" | "expired" | "spam" | "deleted";
  const [filter, setFilter] = useState<FilterType>(
    (statusFilter as FilterType) || "all"
  );
  const [processing, setProcessing] = useState<string | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [reasonModalOpen, setReasonModalOpen] = useState<{ scholarshipId: string; action: AdminAction } | null>(null);
  const [reason, setReason] = useState("");

  // Helper to check if scholarship deadline has passed
  const isExpired = (scholarship: ScholarshipWithEmployer): boolean => {
    if (!scholarship.deadline) return false;
    const deadline = scholarship.deadline instanceof Timestamp
      ? scholarship.deadline.toDate()
      : typeof scholarship.deadline === "object" && "seconds" in scholarship.deadline
        ? new Date((scholarship.deadline as { seconds: number }).seconds * 1000)
        : new Date(scholarship.deadline as string);
    return deadline < new Date();
  };

  // Perform admin action via API
  async function performAdminAction(scholarshipId: string, action: AdminAction, actionReason?: string) {
    if (!user) return;

    try {
      setProcessing(scholarshipId);
      const token = await user.getIdToken();
      if (!token) {
        toast.error("Authentication error. Please try again.");
        return;
      }

      const response = await fetch(`/api/admin/scholarships/${scholarshipId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, reason: actionReason }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to perform action");
      }

      toast.success(`Successfully performed ${action.replace("_", " ")}`);
      await loadScholarships();
    } catch (error) {
      console.error("Error performing admin action:", error);
      toast.error(error instanceof Error ? error.message : "Failed to perform action");
    } finally {
      setProcessing(null);
      setActionMenuOpen(null);
      setReasonModalOpen(null);
      setReason("");
    }
  }

  // Handle action that may require reason
  function handleAction(scholarshipId: string, action: AdminAction) {
    if (action === "flag_spam" || action === "delete" || action === "mark_expired") {
      setReasonModalOpen({ scholarshipId, action });
    } else {
      performAdminAction(scholarshipId, action);
    }
  }

  useEffect(() => {
    if (authLoading) return;

    if (!user || (role !== "admin" && role !== "moderator")) {
      router.push("/");
      return;
    }

    loadScholarships();
  }, [user, role, authLoading, router]);

  async function loadScholarships() {
    try {
      setLoading(true);

      // Get all scholarships
      const scholarshipsRef = collection(db!, "scholarships");
      const scholarshipsSnap = await getDocs(
        query(scholarshipsRef, orderBy("createdAt", "desc"))
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

      const scholarshipsList: ScholarshipWithEmployer[] = scholarshipsSnap.docs.map(
        (doc) => {
          const data = doc.data() as Scholarship;
          const employer = employerMap.get(data.employerId);
          return {
            ...data,
            id: doc.id,
            employerName: employer?.name || data.employerName || "Unknown Employer",
            employerLogoUrl: employer?.logoUrl,
          };
        }
      );

      setScholarships(scholarshipsList);
    } catch (error) {
      console.error("Error loading scholarships:", error);
    } finally {
      setLoading(false);
    }
  }


  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-[var(--text-muted)]">Loading scholarships...</p>
        </div>
      </div>
    );
  }

  if (!user || (role !== "admin" && role !== "moderator")) {
    return null;
  }

  const filteredScholarships = scholarships.filter((scholarship) => {
    // Always exclude permanently deleted unless viewing deleted
    if (scholarship.deletedAt && filter !== "deleted") return false;

    switch (filter) {
      case "all":
        return !scholarship.deletedAt;
      case "active":
        return scholarship.active === true && !scholarship.adminOverride?.flaggedAsSpam;
      case "inactive":
        return scholarship.active === false && !scholarship.adminOverride?.flaggedAsSpam && !scholarship.deletedAt;
      case "expired":
        return isExpired(scholarship) || scholarship.expiredAt != null;
      case "spam":
        return scholarship.adminOverride?.flaggedAsSpam === true;
      case "deleted":
        return scholarship.deletedAt != null;
      default:
        return true;
    }
  });

  const activeCount = scholarships.filter((s) => s.active === true && !s.adminOverride?.flaggedAsSpam && !s.deletedAt).length;
  const inactiveCount = scholarships.filter((s) => s.active === false && !s.adminOverride?.flaggedAsSpam && !s.deletedAt).length;
  const expiredCount = scholarships.filter((s) => isExpired(s) || s.expiredAt != null).length;
  const spamCount = scholarships.filter((s) => s.adminOverride?.flaggedAsSpam === true).length;
  const deletedCount = scholarships.filter((s) => s.deletedAt != null).length;

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
                Scholarships Moderation
              </h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {filteredScholarships.length} scholarship
                {filteredScholarships.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Link
              href="/organization/scholarships/new"
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-accent/90"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New
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
            All ({scholarships.filter(s => !s.deletedAt).length})
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
            onClick={() => setFilter("expired")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === "expired"
              ? "bg-amber-500 text-slate-900"
              : "border border-[var(--card-border)] text-[var(--text-secondary)] hover:border-amber-500"
              }`}
          >
            Expired ({expiredCount})
          </button>
          {spamCount > 0 && (
            <button
              onClick={() => setFilter("spam")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === "spam"
                ? "bg-red-500 text-white"
                : "border border-red-500/50 text-red-400 hover:border-red-500"
                }`}
            >
              Spam ({spamCount})
            </button>
          )}
          {deletedCount > 0 && (
            <button
              onClick={() => setFilter("deleted")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === "deleted"
                ? "bg-slate-600 text-white"
                : "border border-[var(--card-border)] text-[var(--text-muted)] hover:border-slate-500"
                }`}
            >
              Deleted ({deletedCount})
            </button>
          )}
        </div>

        {/* Scholarships List */}
        <div className="space-y-4">
          {filteredScholarships.length === 0 ? (
            <div className="rounded-2xl border border-[var(--card-border)] bg-slate-900/60 p-12 text-center">
              <p className="text-[var(--text-muted)]">
                No scholarships found for this filter.
              </p>
            </div>
          ) : (
            filteredScholarships.map((scholarship) => {
              const isProcessing = processing === scholarship.id;
              const isActive = scholarship.active === true;

              return (
                <div
                  key={scholarship.id}
                  className="rounded-2xl border border-[var(--card-border)] bg-slate-900/60 p-6 transition hover:border-[var(--card-border)]"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    {/* Scholarship Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        {scholarship.employerLogoUrl && (
                          <img
                            src={scholarship.employerLogoUrl}
                            alt={scholarship.employerName}
                            className="h-16 w-16 rounded-lg border border-[var(--card-border)] object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-semibold text-foreground">
                                {scholarship.title}
                              </h3>
                              <p className="mt-1 text-sm text-[var(--text-muted)]">
                                {scholarship.provider || scholarship.employerName}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ${isActive
                                  ? "bg-green-500/10 text-green-400"
                                  : "bg-slate-500/10 text-[var(--text-muted)]"
                                  }`}
                              >
                                {isActive ? "Active" : "Inactive"}
                              </span>
                              {isExpired(scholarship) && (
                                <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
                                  Expired
                                </span>
                              )}
                              {scholarship.adminOverride?.flaggedAsSpam && (
                                <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400">
                                  Spam
                                </span>
                              )}
                              {scholarship.adminOverride?.forcePublished && (
                                <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-400">
                                  Force Published
                                </span>
                              )}
                              {scholarship.deletedAt && (
                                <span className="rounded-full bg-slate-500/10 px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
                                  Deleted
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-3 text-sm text-[var(--text-muted)]">
                            {scholarship.amount && (
                              <span className="font-medium text-green-400">
                                {scholarship.amount}
                              </span>
                            )}
                            <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-xs text-purple-400">
                              {scholarship.level}
                            </span>
                            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                              {scholarship.type}
                            </span>
                            {scholarship.region && (
                              <span className="text-xs text-foreground0">
                                {scholarship.region}
                              </span>
                            )}
                          </div>

                          {scholarship.description && (
                            <p className="mt-3 text-sm text-[var(--text-secondary)] line-clamp-2">
                              {scholarship.description}
                            </p>
                          )}

                          <div className="mt-3 flex gap-4 text-xs text-foreground0">
                            {scholarship.deadline && (
                              <span>
                                Deadline:{" "}
                                {typeof scholarship.deadline === "string"
                                  ? scholarship.deadline
                                  : (scholarship.deadline && typeof scholarship.deadline === "object" && "seconds" in scholarship.deadline)
                                    ? new Date((scholarship.deadline as any).seconds * 1000).toLocaleDateString()
                                    : scholarship.deadline
                                      ? new Date(scholarship.deadline as any).toLocaleDateString()
                                      : ""}
                              </span>
                            )}
                            {scholarship.createdAt && (
                              <span>
                                Posted:{" "}
                                {new Date(
                                  scholarship.createdAt.seconds * 1000
                                ).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 lg:flex-col relative">
                      <Link
                        href={`/education/scholarships/${scholarship.id}`}
                        className="rounded-md border border-[var(--card-border)] px-4 py-2 text-sm text-foreground transition hover:border-[#14B8A6] hover:text-[#14B8A6] text-center"
                      >
                        View
                      </Link>

                      {/* Quick Actions */}
                      {!scholarship.deletedAt && (
                        <>
                          {isActive ? (
                            <button
                              onClick={() => handleAction(scholarship.id, "force_unpublish")}
                              disabled={isProcessing}
                              className="rounded-md border border-[var(--card-border)] px-4 py-2 text-sm text-[var(--text-muted)] transition hover:bg-surface disabled:opacity-50"
                            >
                              {isProcessing ? "..." : "Unpublish"}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAction(scholarship.id, "force_publish")}
                              disabled={isProcessing}
                              className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-500 disabled:opacity-50"
                            >
                              {isProcessing ? "..." : "Publish"}
                            </button>
                          )}
                        </>
                      )}

                      {/* More Actions Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setActionMenuOpen(actionMenuOpen === scholarship.id ? null : scholarship.id)}
                          className="rounded-md border border-[var(--card-border)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:border-[var(--card-border)]"
                        >
                          More ▼
                        </button>

                        {actionMenuOpen === scholarship.id && (
                          <div className="absolute right-0 top-full mt-1 z-10 w-48 rounded-lg border border-[var(--card-border)] bg-surface py-1 shadow-lg">
                            {!scholarship.deletedAt && (
                              <>
                                {isExpired(scholarship) && !scholarship.adminOverride?.forcePublished && (
                                  <button
                                    onClick={() => handleAction(scholarship.id, "reopen")}
                                    className="w-full px-4 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-surface"
                                  >
                                    🔓 Reopen Scholarship
                                  </button>
                                )}
                                {!isExpired(scholarship) && (
                                  <button
                                    onClick={() => handleAction(scholarship.id, "mark_expired")}
                                    className="w-full px-4 py-2 text-left text-sm text-amber-400 hover:bg-surface"
                                  >
                                    ⏰ Mark as Expired
                                  </button>
                                )}
                                {scholarship.adminOverride?.flaggedAsSpam ? (
                                  <button
                                    onClick={() => handleAction(scholarship.id, "unflag_spam")}
                                    className="w-full px-4 py-2 text-left text-sm text-green-400 hover:bg-surface"
                                  >
                                    ✓ Remove Spam Flag
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleAction(scholarship.id, "flag_spam")}
                                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-surface"
                                  >
                                    🚩 Flag as Spam
                                  </button>
                                )}
                                <hr className="my-1 border-[var(--card-border)]" />
                                <button
                                  onClick={() => handleAction(scholarship.id, "delete")}
                                  className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10"
                                >
                                  🗑️ Delete
                                </button>
                              </>
                            )}
                            {scholarship.deletedAt && (
                              <button
                                onClick={() => handleAction(scholarship.id, "restore")}
                                className="w-full px-4 py-2 text-left text-sm text-green-400 hover:bg-surface"
                              >
                                ↩️ Restore
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Reason Modal */}
      {reasonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl border border-[var(--card-border)] bg-surface p-6">
            <h3 className="text-lg font-semibold text-white">
              {reasonModalOpen.action === "flag_spam" && "Flag as Spam"}
              {reasonModalOpen.action === "delete" && "Delete Scholarship"}
              {reasonModalOpen.action === "mark_expired" && "Mark as Expired"}
            </h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {reasonModalOpen.action === "flag_spam" &&
                "This will hide the scholarship and flag it for review."}
              {reasonModalOpen.action === "delete" &&
                "This will soft-delete the scholarship. It can be restored later."}
              {reasonModalOpen.action === "mark_expired" &&
                "This will mark the scholarship as expired and hide it from listings."}
            </p>

            <div className="mt-4">
              <label className="block text-sm font-medium text-[var(--text-secondary)]">
                Reason (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Enter reason for this action..."
                className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setReasonModalOpen(null);
                  setReason("");
                }}
                className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-surface"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  performAdminAction(
                    reasonModalOpen.scholarshipId,
                    reasonModalOpen.action,
                    reason
                  )
                }
                disabled={processing === reasonModalOpen.scholarshipId}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                  reasonModalOpen.action === "delete" || reasonModalOpen.action === "flag_spam"
                    ? "bg-red-600 text-white hover:bg-red-500"
                    : "bg-amber-600 text-white hover:bg-amber-500"
                }`}
              >
                {processing ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close action menu */}
      {actionMenuOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setActionMenuOpen(null)}
        />
      )}
    </div>
  );
}

export default function AdminScholarshipsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-[var(--text-muted)]">Loading scholarships...</p>
        </div>
      </div>
    }>
      <AdminScholarshipsContent />
    </Suspense>
  );
}
