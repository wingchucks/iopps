"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format-date";

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EmployerStatus = "pending" | "approved" | "rejected" | "incomplete";

interface Employer {
  id: string;
  organizationName: string;
  status: EmployerStatus;
  createdAt: string;
  contactPerson?: string;
  email?: string;
}

// ---------------------------------------------------------------------------
// Status filter tabs
// ---------------------------------------------------------------------------

const STATUS_TABS: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

// ---------------------------------------------------------------------------
// Status badge component
// ---------------------------------------------------------------------------

const statusBadgeStyles: Record<EmployerStatus, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-success/10 text-success border-success/20",
  rejected: "bg-error/10 text-error border-error/20",
  incomplete: "bg-muted text-[var(--text-muted)] border-border",
};

function StatusBadge({ status }: { status: EmployerStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        statusBadgeStyles[status] || statusBadgeStyles.incomplete,
      )}
    >
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Inline SVG icons
// ---------------------------------------------------------------------------

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-5 w-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Rejection reason modal
// ---------------------------------------------------------------------------

function RejectModal({
  isOpen,
  employerName,
  onClose,
  onConfirm,
  loading,
}: {
  isOpen: boolean;
  employerName: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isOpen) {
      setReason("");
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Reject ${employerName}`}
        className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-xl animate-scale-in"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Reject Employer</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--card-bg)] hover:text-foreground"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        <p className="mb-3 text-sm text-[var(--text-secondary)]">
          Provide a reason for rejecting <strong className="text-foreground">{employerName}</strong>.
          This will be shared with the applicant.
        </p>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for rejection..."
          rows={4}
          className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-foreground placeholder:text-[var(--text-muted)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-accent/20"
          autoFocus
        />

        <div className="mt-4 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim() || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-error px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            Reject Employer
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminEmployersPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "all";

  const [employers, setEmployers] = useState<Employer[]>([]);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Rejection modal state
  const [rejectModal, setRejectModal] = useState<{
    open: boolean;
    employerId: string;
    employerName: string;
  }>({ open: false, employerId: "", employerName: "" });

  // ---- Fetch employers ----
  const fetchEmployers = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/admin/employers${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Failed to fetch employers (${res.status})`);

      const data = await res.json();
      setEmployers(data.employers || data || []);
    } catch (err) {
      console.error("Error fetching employers:", err);
      setError("Failed to load employers.");
    } finally {
      setLoading(false);
    }
  }, [user, statusFilter]);

  useEffect(() => {
    fetchEmployers();
  }, [fetchEmployers]);

  // ---- Approve employer ----
  const handleApprove = async (employerId: string) => {
    if (!user) return;
    setActionLoading(employerId);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/employers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ employerId, action: "approve" }),
      });

      if (!res.ok) throw new Error("Failed to approve employer");

      toast.success("Employer approved successfully");
      fetchEmployers();
    } catch (err) {
      console.error("Error approving employer:", err);
      toast.error("Failed to approve employer");
    } finally {
      setActionLoading(null);
    }
  };

  // ---- Reject employer ----
  const handleReject = async (reason: string) => {
    if (!user || !rejectModal.employerId) return;
    setActionLoading(rejectModal.employerId);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/employers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employerId: rejectModal.employerId,
          action: "reject",
          reason,
        }),
      });

      if (!res.ok) throw new Error("Failed to reject employer");

      toast.success("Employer rejected");
      setRejectModal({ open: false, employerId: "", employerName: "" });
      fetchEmployers();
    } catch (err) {
      console.error("Error rejecting employer:", err);
      toast.error("Failed to reject employer");
    } finally {
      setActionLoading(null);
    }
  };

  // ---- Filtered list ----
  const filteredEmployers = useMemo(() => {
    if (!searchQuery.trim()) return employers;
    const q = searchQuery.toLowerCase();
    return employers.filter(
      (e) =>
        e.organizationName?.toLowerCase().includes(q) ||
        e.contactPerson?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q),
    );
  }, [employers, searchQuery]);

  // Reset page on filter/search change
  useEffect(() => { setCurrentPage(1); }, [statusFilter, searchQuery]);

  // ---- Pagination ----
  const totalPages = Math.ceil(filteredEmployers.length / PAGE_SIZE);
  const paginatedEmployers = filteredEmployers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = filteredEmployers.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredEmployers.length);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* ---- Header ---- */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Employer Management
        </h1>
        <p className="mt-1 text-[var(--text-secondary)]">
          Review and manage employer applications
        </p>
      </div>

      {/* ---- Filter tabs ---- */}
      <div className="animate-fade-in flex flex-wrap gap-2" style={{ animationDelay: "80ms" }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={cn(
              "rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-150",
              statusFilter === tab.value
                ? "bg-accent text-white shadow-sm"
                : "bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:border-accent/50 hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ---- Search ---- */}
      <div className="animate-fade-in relative" style={{ animationDelay: "120ms" }}>
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="search"
          placeholder="Search employers by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-[var(--text-muted)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-accent/20 sm:max-w-sm"
        />
      </div>

      {/* ---- Error state ---- */}
      {error && (
        <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {/* ---- Loading skeleton ---- */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 skeleton-shimmer" />
          ))}
        </div>
      )}

      {/* ---- Table / list ---- */}
      {!loading && filteredEmployers.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--card-bg)] py-16 text-center">
          <p className="text-[var(--text-muted)]">No employers found</p>
        </div>
      )}

      {!loading && filteredEmployers.length > 0 && (
        <div className="animate-fade-in rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Organization
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Created
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedEmployers.map((employer) => (
                  <tr
                    key={employer.id}
                    className="border-b border-[var(--card-border)] last:border-b-0 transition-colors hover:bg-muted/50"
                  >
                    <td className="px-5 py-4">
                      <Link href={`/admin/employers/${employer.id}`} className="text-sm font-medium text-foreground hover:text-accent transition-colors">
                        {employer.organizationName}
                      </Link>
                      {employer.contactPerson && (
                        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                          {employer.contactPerson}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={employer.status} />
                    </td>
                    <td className="px-5 py-4 text-sm text-[var(--text-muted)]">
                      {formatDate(employer.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {(employer.status === "pending" || employer.status === "rejected") && (
                          <button
                            onClick={() => handleApprove(employer.id)}
                            disabled={actionLoading === employer.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-success/10 px-3 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/20 disabled:opacity-50"
                          >
                            <CheckIcon className="h-3.5 w-3.5" />
                            Approve
                          </button>
                        )}
                        {(employer.status === "pending" || employer.status === "approved") && (
                          <button
                            onClick={() =>
                              setRejectModal({
                                open: true,
                                employerId: employer.id,
                                employerName: employer.organizationName,
                              })
                            }
                            disabled={actionLoading === employer.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-error/10 px-3 py-1.5 text-xs font-medium text-error transition-colors hover:bg-error/20 disabled:opacity-50"
                          >
                            <XIcon className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="divide-y divide-[var(--card-border)] sm:hidden">
            {paginatedEmployers.map((employer) => (
              <div key={employer.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Link href={`/admin/employers/${employer.id}`} className="text-sm font-medium text-foreground hover:text-accent transition-colors">
                      {employer.organizationName}
                    </Link>
                    {employer.contactPerson && (
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {employer.contactPerson}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={employer.status} />
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Created {formatDate(employer.createdAt)}
                </p>
                <div className="flex gap-2">
                  {(employer.status === "pending" || employer.status === "rejected") && (
                    <button
                      onClick={() => handleApprove(employer.id)}
                      disabled={actionLoading === employer.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-success/10 px-3 py-2 text-xs font-medium text-success transition-colors hover:bg-success/20 disabled:opacity-50"
                    >
                      <CheckIcon className="h-3.5 w-3.5" />
                      Approve
                    </button>
                  )}
                  {(employer.status === "pending" || employer.status === "approved") && (
                    <button
                      onClick={() =>
                        setRejectModal({
                          open: true,
                          employerId: employer.id,
                          employerName: employer.organizationName,
                        })
                      }
                      disabled={actionLoading === employer.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-error/10 px-3 py-2 text-xs font-medium text-error transition-colors hover:bg-error/20 disabled:opacity-50"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 pt-4 pb-4 border-t border-[var(--card-border)]">
            <p className="text-sm text-[var(--text-muted)]">Showing {rangeStart}-{rangeEnd} of {filteredEmployers.length}</p>
            <div className="flex gap-2">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1.5 text-sm rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-accent/10 disabled:opacity-40">Previous</button>
              <span className="text-sm px-3 py-1.5">{currentPage} / {totalPages}</span>
              <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1.5 text-sm rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-accent/10 disabled:opacity-40">Next</button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Rejection modal ---- */}
      <RejectModal
        isOpen={rejectModal.open}
        employerName={rejectModal.employerName}
        onClose={() => setRejectModal({ open: false, employerId: "", employerName: "" })}
        onConfirm={handleReject}
        loading={actionLoading === rejectModal.employerId}
      />
    </div>
  );
}
