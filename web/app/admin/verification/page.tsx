"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { auth as firebaseAuth } from "@/lib/firebase";
import {
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BuildingOfficeIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  AdminLoadingState,
  AdminEmptyState,
  StatusBadge,
  ConfirmationModal,
} from "@/components/admin";
import toast from "react-hot-toast";

// ============================================================================
// Types
// ============================================================================

interface VerificationRequest {
  employerId: string;
  organizationName: string;
  logoUrl: string | null;
  industry: string | null;
  location: string | null;
  website: string | null;
  contactEmail: string | null;
  employerStatus: string;
  verification: {
    status: "pending" | "approved" | "rejected";
    isIndigenousOwned: boolean;
    isIndigenousLed: boolean;
    nationAffiliation: string | null;
    certifications: string[];
    requestNotes: string | null;
    requestedAt: string | null;
    reviewedAt: string | null;
    reviewedBy: string | null;
    reviewNotes: string | null;
    rejectionReason: string | null;
  };
}

interface Counts {
  pending: number;
  approved: number;
  rejected: number;
}

type FilterStatus = "all" | "pending" | "approved" | "rejected";

// ============================================================================
// Helpers
// ============================================================================

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = firebaseAuth?.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

// ============================================================================
// Stats Cards
// ============================================================================

function StatsRow({ counts }: { counts: Counts }) {
  const total = counts.pending + counts.approved + counts.rejected;
  const stats = [
    { label: "Pending", value: counts.pending, color: "text-amber-400", bg: "bg-amber-500/10", icon: ClockIcon },
    { label: "Approved", value: counts.approved, color: "text-emerald-400", bg: "bg-emerald-500/10", icon: CheckCircleIcon },
    { label: "Rejected", value: counts.rejected, color: "text-red-400", bg: "bg-red-500/10", icon: XCircleIcon },
    { label: "Total", value: total, color: "text-slate-300", bg: "bg-slate-500/10", icon: ShieldCheckIcon },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-slate-800 bg-[#08090C] p-4"
        >
          <div className="flex items-center gap-3">
            <div className={`rounded-lg ${s.bg} p-2`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Review Modal
// ============================================================================

function ReviewModal({
  request,
  onClose,
  onAction,
  loading,
}: {
  request: VerificationRequest;
  onClose: () => void;
  onAction: (action: "approve" | "reject", notes: string, reason: string) => void;
  loading: boolean;
}) {
  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [confirmReject, setConfirmReject] = useState(false);

  const v = request.verification;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-[#0B0D10] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            {request.logoUrl ? (
              <img
                src={request.logoUrl}
                alt=""
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800">
                <BuildingOfficeIcon className="h-5 w-5 text-slate-500" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                {request.organizationName}
              </h2>
              <p className="text-sm text-slate-400">
                Verification Request
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-5">
          {/* Organization Info */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-300">
              Organization Details
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {request.industry && (
                <div>
                  <span className="text-slate-500">Industry:</span>{" "}
                  <span className="text-slate-300">{request.industry}</span>
                </div>
              )}
              {request.location && (
                <div>
                  <span className="text-slate-500">Location:</span>{" "}
                  <span className="text-slate-300">{request.location}</span>
                </div>
              )}
              {request.website && (
                <div>
                  <span className="text-slate-500">Website:</span>{" "}
                  <a
                    href={request.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-400 hover:underline"
                  >
                    {request.website}
                  </a>
                </div>
              )}
              {request.contactEmail && (
                <div>
                  <span className="text-slate-500">Contact:</span>{" "}
                  <span className="text-slate-300">{request.contactEmail}</span>
                </div>
              )}
            </div>
          </div>

          {/* Verification Claims */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-300">
              Verification Claims
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    v.isIndigenousOwned ? "bg-emerald-500" : "bg-slate-600"
                  }`}
                />
                <span className="text-sm text-slate-300">
                  Indigenous Owned (51%+):{" "}
                  <span className={v.isIndigenousOwned ? "text-emerald-400 font-medium" : "text-slate-500"}>
                    {v.isIndigenousOwned ? "Yes" : "No"}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    v.isIndigenousLed ? "bg-emerald-500" : "bg-slate-600"
                  }`}
                />
                <span className="text-sm text-slate-300">
                  Indigenous Led:{" "}
                  <span className={v.isIndigenousLed ? "text-emerald-400 font-medium" : "text-slate-500"}>
                    {v.isIndigenousLed ? "Yes" : "No"}
                  </span>
                </span>
              </div>
              {v.nationAffiliation && (
                <div className="mt-2 text-sm">
                  <span className="text-slate-500">Nation Affiliation:</span>{" "}
                  <span className="text-slate-200 font-medium">{v.nationAffiliation}</span>
                </div>
              )}
              {v.certifications && v.certifications.length > 0 && (
                <div className="mt-2">
                  <span className="text-sm text-slate-500">Certifications:</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {v.certifications.map((cert: string) => (
                      <span
                        key={cert}
                        className="rounded-full bg-teal-500/10 px-2.5 py-0.5 text-xs font-medium text-teal-400"
                      >
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Request Notes */}
          {v.requestNotes && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-300">
                Employer&apos;s Notes
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {v.requestNotes}
              </p>
            </div>
          )}

          {/* Previous Review Info (if re-reviewing) */}
          {v.reviewedAt && (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <h3 className="mb-2 text-sm font-semibold text-blue-400">
                Previous Review
              </h3>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-slate-500">Status:</span>{" "}
                  <span className="capitalize text-slate-300">{v.status}</span>
                </div>
                <div>
                  <span className="text-slate-500">Reviewed:</span>{" "}
                  <span className="text-slate-300">{formatDate(v.reviewedAt)}</span>
                </div>
                {v.reviewNotes && (
                  <div>
                    <span className="text-slate-500">Notes:</span>{" "}
                    <span className="text-slate-300">{v.reviewNotes}</span>
                  </div>
                )}
                {v.rejectionReason && (
                  <div>
                    <span className="text-slate-500">Rejection Reason:</span>{" "}
                    <span className="text-red-400">{v.rejectionReason}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Review Form */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-300">
              Admin Review
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Review Notes (optional)
                </label>
                <textarea
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  rows={2}
                  placeholder="Internal notes about this verification..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />
              </div>

              {confirmReject && (
                <div>
                  <label className="block text-sm text-red-400 mb-1">
                    Rejection Reason *
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    rows={2}
                    placeholder="Explain why the verification was not approved..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            {!confirmReject ? (
              <>
                <button
                  onClick={() => setConfirmReject(true)}
                  disabled={loading}
                  className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  onClick={() => onAction("approve", reviewNotes, "")}
                  disabled={loading}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Approve"}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setConfirmReject(false)}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
                >
                  Back
                </button>
                <button
                  onClick={() => onAction("reject", reviewNotes, rejectionReason)}
                  disabled={loading || !rejectionReason.trim()}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Processing..." : "Confirm Rejection"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function AdminVerificationPage() {
  const { user, role, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [counts, setCounts] = useState<Counts>({ pending: 0, approved: 0, rejected: 0 });
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const res = await fetch("/api/admin/verification?status=all", { headers });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setRequests(data.requests || []);
      setCounts(data.counts || { pending: 0, approved: 0, rejected: 0 });
    } catch (err) {
      console.error("Error loading verification requests:", err);
      toast.error("Failed to load verification requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user || (role !== "admin" && role !== "moderator")) return;
    loadRequests();
  }, [user, role, authLoading, loadRequests]);

  async function handleAction(action: "approve" | "reject", notes: string, reason: string) {
    if (!selectedRequest) return;
    setActionLoading(true);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/admin/verification", {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          employerId: selectedRequest.employerId,
          action,
          reviewNotes: notes || undefined,
          rejectionReason: reason || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }

      toast.success(
        action === "approve"
          ? `${selectedRequest.organizationName} verified successfully`
          : `${selectedRequest.organizationName} verification rejected`
      );
      setSelectedRequest(null);
      loadRequests();
    } catch (err: any) {
      console.error("Error:", err);
      toast.error(err.message || "Failed to process verification");
    } finally {
      setActionLoading(false);
    }
  }

  // Client-side filtering
  const filteredRequests =
    filter === "all"
      ? requests
      : requests.filter((r) => r.verification.status === filter);

  if (authLoading || loading) {
    return <AdminLoadingState message="Loading verification requests..." />;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">
          Indigenous Verification
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Review and manage Indigenous business verification requests
        </p>
      </div>

      {/* Stats */}
      <StatsRow counts={counts} />

      {/* Filter Tabs */}
      <div className="mb-4 flex gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => {
          const label = f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1);
          const count =
            f === "all"
              ? counts.pending + counts.approved + counts.rejected
              : counts[f as keyof Counts];
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                filter === f
                  ? "bg-teal-600/20 text-teal-400"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-300"
              }`}
            >
              {label}
              <span className="ml-1.5 text-xs opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      {filteredRequests.length === 0 ? (
        <AdminEmptyState
          title="No verification requests"
          message={
            filter === "pending"
              ? "No pending verification requests at this time."
              : `No ${filter} requests found.`
          }
          icon={<ShieldCheckIcon className="h-12 w-12" />}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#08090C]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left">
                  <th className="px-4 py-3 font-medium text-slate-400">Organization</th>
                  <th className="hidden px-4 py-3 font-medium text-slate-400 md:table-cell">Nation</th>
                  <th className="hidden px-4 py-3 font-medium text-slate-400 sm:table-cell">Claims</th>
                  <th className="hidden px-4 py-3 font-medium text-slate-400 lg:table-cell">Requested</th>
                  <th className="px-4 py-3 font-medium text-slate-400">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredRequests.map((req) => (
                  <tr
                    key={req.employerId}
                    className="hover:bg-slate-800/30 transition cursor-pointer"
                    onClick={() => setSelectedRequest(req)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {req.logoUrl ? (
                          <img
                            src={req.logoUrl}
                            alt=""
                            className="h-8 w-8 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800">
                            <BuildingOfficeIcon className="h-4 w-4 text-slate-500" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-slate-200">
                            {req.organizationName}
                          </div>
                          {req.industry && (
                            <div className="text-xs text-slate-500">{req.industry}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className="text-slate-300">
                        {req.verification.nationAffiliation || "—"}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <div className="flex gap-1.5">
                        {req.verification.isIndigenousOwned && (
                          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                            OWNED
                          </span>
                        )}
                        {req.verification.isIndigenousLed && (
                          <span className="rounded bg-teal-500/15 px-1.5 py-0.5 text-[10px] font-bold text-teal-400">
                            LED
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-400 lg:table-cell whitespace-nowrap">
                      {formatDate(req.verification.requestedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={
                          req.verification.status === "approved"
                            ? "active"
                            : req.verification.status === "rejected"
                            ? "inactive"
                            : "pending"
                        }
                        variant={
                          req.verification.status === "approved"
                            ? "success"
                            : req.verification.status === "rejected"
                            ? "error"
                            : "warning"
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRequest(req);
                        }}
                        className="rounded-md px-2.5 py-1 text-xs font-medium text-teal-400 hover:bg-teal-500/10 transition"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedRequest && (
        <ReviewModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onAction={handleAction}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
