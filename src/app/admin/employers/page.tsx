"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  AdminDataTable,
  AdminEmptyState,
  AdminFilterBar,
  AdminFilterTabs,
  AdminPageHeader,
  AdminPagination,
  AdminSearchField,
  AdminSelectField,
  AdminStatGrid,
  type AdminFilterOption,
} from "@/components/admin";
import { formatDate } from "@/lib/format-date";
import type { AdminEmployerRow } from "@/lib/admin/view-types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

type EmployerStatus = "all" | "pending" | "approved" | "rejected";
type EmployerTypeFilter = "all" | "business" | "school";

interface EmployersSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  schools: number;
  businesses: number;
}

const EMPTY_SUMMARY: EmployersSummary = {
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  schools: 0,
  businesses: 0,
};

const statusBadgeStyles: Record<AdminEmployerRow["status"], string> = {
  pending: "border-warning/20 bg-warning/10 text-warning",
  approved: "border-success/20 bg-success/10 text-success",
  rejected: "border-error/20 bg-error/10 text-error",
  disabled: "border-error/20 bg-error/10 text-error",
  incomplete: "border-[var(--card-border)] bg-[var(--muted)] text-[var(--text-secondary)]",
};

function StatusBadge({ status }: { status: AdminEmployerRow["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize",
        statusBadgeStyles[status],
      )}
    >
      {status}
    </span>
  );
}

function AccountTypeBadge({ type }: { type: AdminEmployerRow["accountType"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize",
        type === "school"
          ? "bg-info/10 text-info"
          : "bg-accent/10 text-accent",
      )}
    >
      {type}
    </span>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "h-4 w-4"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "h-4 w-4"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "h-5 w-5"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

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

  const handleClose = useCallback(() => {
    setReason("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [handleClose, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/65"
        onClick={handleClose}
        aria-label="Close modal"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Reject ${employerName}`}
        className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Reject account</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              This will move <span className="font-medium text-foreground">{employerName}</span> back out of the approved queue.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--muted)] hover:text-foreground"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        <label className="block text-sm font-medium text-foreground" htmlFor="rejection-reason">
          Reason sent to the applicant
        </label>
        <textarea
          id="rejection-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Explain what they need to fix before approval."
          rows={4}
          className="mt-2 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm text-foreground placeholder:text-[var(--text-muted)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-accent/20"
          autoFocus
        />

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--card-border-hover)] hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim() || loading}
            className="inline-flex items-center gap-2 rounded-xl bg-error px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            Reject account
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminEmployersPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialStatus = (searchParams.get("status") as EmployerStatus | null) || "all";
  const initialType = (searchParams.get("type") as EmployerTypeFilter | null) || "all";

  const [employers, setEmployers] = useState<AdminEmployerRow[]>([]);
  const [summary, setSummary] = useState<EmployersSummary>(EMPTY_SUMMARY);
  const [statusFilter, setStatusFilter] = useState<EmployerStatus>(initialStatus);
  const [typeFilter, setTypeFilter] = useState<EmployerTypeFilter>(initialType);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rejectModal, setRejectModal] = useState<{
    open: boolean;
    employerId: string;
    employerName: string;
  }>({ open: false, employerId: "", employerName: "" });

  const statusTabs = useMemo<AdminFilterOption[]>(
    () => [
      { label: "All", value: "all", count: summary.total },
      { label: "Pending", value: "pending", count: summary.pending },
      { label: "Approved", value: "approved", count: summary.approved },
      { label: "Rejected", value: "rejected", count: summary.rejected },
    ],
    [summary],
  );

  const typeOptions = useMemo<AdminFilterOption[]>(
    () => [
      { label: "All accounts", value: "all" },
      { label: `Businesses (${summary.businesses})`, value: "business" },
      { label: `Schools (${summary.schools})`, value: "school" },
    ],
    [summary],
  );

  const fetchEmployers = useCallback(async () => {
    const currentUser = user;
    if (!currentUser) return;

    setLoading(true);
    setError(null);

    try {
      const token = await currentUser!.getIdToken();
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);

      const res = await fetch(`/api/admin/employers${params.size ? `?${params.toString()}` : ""}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Failed to fetch employers (${res.status})`);

      const data = await res.json();
      setEmployers(data.employers || []);
      setSummary(data.summary || EMPTY_SUMMARY);
    } catch (err) {
      console.error("Error fetching employers:", err);
      setError("Failed to load businesses and schools.");
      setEmployers([]);
      setSummary(EMPTY_SUMMARY);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, user]);

  useEffect(() => {
    fetchEmployers();
  }, [fetchEmployers]);

  const handleApprove = async (employer: AdminEmployerRow) => {
    const currentUser = user;
    if (!currentUser) return;
    if (!window.confirm(`Approve ${employer.displayName}? This will make the account live for use.`)) {
      return;
    }

    setActionLoading(employer.id);

    try {
      const token = await currentUser!.getIdToken();
      const res = await fetch("/api/admin/employers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ employerId: employer.id, action: "approve" }),
      });

      if (!res.ok) throw new Error("Failed to approve employer");

      toast.success(`${employer.displayName} approved`);
      await fetchEmployers();
    } catch (err) {
      console.error("Error approving employer:", err);
      toast.error(`Failed to approve ${employer.displayName}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (reason: string) => {
    const currentUser = user;
    if (!currentUser || !rejectModal.employerId) return;
    setActionLoading(rejectModal.employerId);

    try {
      const token = await currentUser!.getIdToken();
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

      toast.success(`${rejectModal.employerName} rejected`);
      setRejectModal({ open: false, employerId: "", employerName: "" });
      await fetchEmployers();
    } catch (err) {
      console.error("Error rejecting employer:", err);
      toast.error(`Failed to reject ${rejectModal.employerName}`);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredEmployers = useMemo(() => {
    if (!searchQuery.trim()) return employers;
    const query = searchQuery.toLowerCase();
    return employers.filter((employer) =>
      [
        employer.displayName,
        employer.contactName,
        employer.contactEmail,
        employer.accountType,
        employer.slug,
      ]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [employers, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter]);

  const totalPages = Math.ceil(filteredEmployers.length / PAGE_SIZE);
  const paginatedEmployers = filteredEmployers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const topStats = [
    {
      label: "Pending review",
      value: summary.pending,
      helper: "Accounts still waiting for approval",
      tone: "warning" as const,
      href: "/admin/employers?status=pending",
      icon: <CheckIcon className="h-5 w-5" />,
    },
    {
      label: "Approved accounts",
      value: summary.approved,
      helper: "Currently approved businesses and schools",
      tone: "success" as const,
      icon: <CheckIcon className="h-5 w-5" />,
    },
    {
      label: "Schools",
      value: summary.schools,
      helper: "School accounts in the directory pipeline",
      tone: "info" as const,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 11 9-7 9 7" />
          <path d="M5 10v10h14V10" />
          <path d="M9 14h6" />
        </svg>
      ),
    },
    {
      label: "Businesses",
      value: summary.businesses,
      helper: "Business accounts in the directory pipeline",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
          <path d="M9 22v-4h6v4" />
        </svg>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="People"
        title="Businesses & Schools"
        description="Review signups, verify which accounts are schools versus businesses, and approve or reject applicants with enough context to act quickly."
        meta={
          <p className="text-sm text-[var(--text-muted)]">
            Queue size: <span className="font-semibold text-foreground">{summary.total}</span> total accounts
          </p>
        }
      />

      <AdminStatGrid items={topStats} />

      <AdminFilterBar>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <AdminFilterTabs
            options={statusTabs}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as EmployerStatus)}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center xl:w-[26rem]">
            <AdminSelectField
              value={typeFilter}
              onChange={(value) => setTypeFilter(value as EmployerTypeFilter)}
              options={typeOptions}
              ariaLabel="Filter by account type"
            />
            <AdminSearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search organization, contact, or email"
            />
          </div>
        </div>
      </AdminFilterBar>

      {error && (
        <div className="rounded-2xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] skeleton" />
          ))}
        </div>
      ) : filteredEmployers.length === 0 ? (
        <AdminEmptyState
          title="No matching accounts"
          description="Try changing the queue filters or search terms. Approved, rejected, business, and school filters can all be combined."
        />
      ) : (
        <AdminDataTable
          data={paginatedEmployers}
          keyExtractor={(employer) => employer.id}
          columns={[
            {
              key: "organization",
              header: "Organization",
              render: (employer) => (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/employers/${employer.id}`}
                      className="text-sm font-semibold text-foreground transition-colors hover:text-accent"
                    >
                      {employer.displayName}
                    </Link>
                    <AccountTypeBadge type={employer.accountType} />
                  </div>
                  <div className="space-y-1 text-xs leading-5 text-[var(--text-secondary)]">
                    <p>
                      Contact: <span className="text-foreground">{employer.contactName}</span>
                      {employer.contactEmail && (
                        <span className="text-[var(--text-muted)]"> · {employer.contactEmail}</span>
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {employer.planLabel && (
                        <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
                          {employer.planLabel}
                        </span>
                      )}
                      {employer.verificationSummary && (
                        <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                          {employer.verificationSummary}
                        </span>
                      )}
                      <Link href={employer.publicHref} className="text-accent hover:underline">
                        View public page
                      </Link>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (employer) => (
                <div className="space-y-2">
                  <StatusBadge status={employer.status} />
                  <p className="text-xs text-[var(--text-muted)]">
                    {employer.status === "pending"
                      ? "Needs an admin decision"
                      : employer.status === "approved"
                        ? "Ready for use"
                        : employer.status === "rejected"
                          ? "Not approved"
                          : employer.status === "disabled"
                            ? "Access removed"
                            : "Missing required setup"}
                  </p>
                </div>
              ),
            },
            {
              key: "created",
              header: "Created",
              render: (employer) => (
                <div className="space-y-1">
                  <p className="text-sm text-foreground">{formatDate(employer.createdAt)}</p>
                  <p className="text-xs text-[var(--text-muted)]">{employer.slug}</p>
                </div>
              ),
            },
            {
              key: "actions",
              header: "Actions",
              headerClassName: "text-right",
              className: "text-right",
              render: (employer) => (
                <div className="flex flex-wrap justify-end gap-2">
                  {(employer.status === "pending" || employer.status === "rejected") && (
                    <button
                      type="button"
                      onClick={() => handleApprove(employer)}
                      disabled={actionLoading === employer.id}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-success/10 px-3 py-2 text-xs font-medium text-success transition-colors hover:bg-success/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckIcon className="h-3.5 w-3.5" />
                      Approve
                    </button>
                  )}
                  {(employer.status === "pending" || employer.status === "approved") && (
                    <button
                      type="button"
                      onClick={() =>
                        setRejectModal({
                          open: true,
                          employerId: employer.id,
                          employerName: employer.displayName,
                        })
                      }
                      disabled={actionLoading === employer.id}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-error/10 px-3 py-2 text-xs font-medium text-error transition-colors hover:bg-error/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  )}
                </div>
              ),
            },
          ]}
          mobileCard={(employer) => (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/employers/${employer.id}`}
                      className="text-sm font-semibold text-foreground transition-colors hover:text-accent"
                    >
                      {employer.displayName}
                    </Link>
                    <AccountTypeBadge type={employer.accountType} />
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {employer.contactName}
                    {employer.contactEmail ? ` · ${employer.contactEmail}` : ""}
                  </p>
                </div>
                <StatusBadge status={employer.status} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                <span>Created {formatDate(employer.createdAt)}</span>
                <span className="rounded-full bg-[var(--muted)] px-2 py-0.5">{employer.slug}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(employer.status === "pending" || employer.status === "rejected") && (
                  <button
                    type="button"
                    onClick={() => handleApprove(employer)}
                    disabled={actionLoading === employer.id}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-success/10 px-3 py-2 text-xs font-medium text-success transition-colors hover:bg-success/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckIcon className="h-3.5 w-3.5" />
                    Approve
                  </button>
                )}
                {(employer.status === "pending" || employer.status === "approved") && (
                  <button
                    type="button"
                    onClick={() =>
                      setRejectModal({
                        open: true,
                        employerId: employer.id,
                        employerName: employer.displayName,
                      })
                    }
                    disabled={actionLoading === employer.id}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-error/10 px-3 py-2 text-xs font-medium text-error transition-colors hover:bg-error/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                    Reject
                  </button>
                )}
                <Link
                  href={employer.publicHref}
                  className="inline-flex items-center rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--card-border-hover)] hover:text-foreground"
                >
                  View public page
                </Link>
              </div>
            </div>
          )}
          footer={
            <AdminPagination
              page={currentPage}
              totalPages={totalPages}
              totalItems={filteredEmployers.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          }
        />
      )}

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
