"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format-date";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PowWowStatus = "upcoming" | "active" | "past";

interface PowWow {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  description: string;
  status: PowWowStatus;
  featured: boolean;
  createdAt: string;
}

interface PowWowFormData {
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  description: string;
  status: PowWowStatus;
  featured: boolean;
}

const EMPTY_FORM: PowWowFormData = {
  name: "",
  startDate: "",
  endDate: "",
  location: "",
  description: "",
  status: "upcoming",
  featured: false,
};

// ---------------------------------------------------------------------------
// Status filter tabs
// ---------------------------------------------------------------------------

const STATUS_TABS: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Past", value: "past" },
  { label: "Featured", value: "featured" },
];

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const statusBadgeStyles: Record<PowWowStatus, string> = {
  upcoming: "bg-accent/10 text-accent border-accent/20",
  active: "bg-success/10 text-success border-success/20",
  past: "bg-muted text-[var(--text-muted)] border-[var(--card-border)]",
};

function StatusBadge({ status }: { status: PowWowStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        statusBadgeStyles[status] || statusBadgeStyles.upcoming,
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

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}

function StarIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
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

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin", className || "h-4 w-4")} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Pow Wow form modal
// ---------------------------------------------------------------------------

function PowWowFormModal({
  isOpen,
  editingId,
  initialData,
  onClose,
  onSubmit,
  loading,
}: {
  isOpen: boolean;
  editingId: string | null;
  initialData: PowWowFormData;
  onClose: () => void;
  onSubmit: (data: PowWowFormData) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<PowWowFormData>(initialData);

  useEffect(() => {
    if (isOpen) {
      setForm(initialData);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, initialData]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

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
        aria-label={editingId ? "Edit Pow Wow" : "Add New Pow Wow"}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-xl animate-scale-in"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {editingId ? "Edit Pow Wow" : "Add New Pow Wow"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--card-bg)] hover:text-foreground"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="pw-name" className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
              Name
            </label>
            <input
              id="pw-name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Pow wow name"
              className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-foreground placeholder:text-[var(--text-muted)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-accent/20"
              autoFocus
            />
          </div>

          {/* Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pw-start" className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                Start Date
              </label>
              <input
                id="pw-start"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-foreground focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div>
              <label htmlFor="pw-end" className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                End Date
              </label>
              <input
                id="pw-end"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-foreground focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="pw-location" className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
              Location
            </label>
            <input
              id="pw-location"
              type="text"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="City, Province"
              className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-foreground placeholder:text-[var(--text-muted)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="pw-desc" className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
              Description
            </label>
            <textarea
              id="pw-desc"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of the pow wow..."
              className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-foreground placeholder:text-[var(--text-muted)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {/* Status + Featured row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pw-status" className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                Status
              </label>
              <select
                id="pw-status"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as PowWowStatus }))}
                className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-foreground focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="past">Past</option>
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                  className="h-4 w-4 rounded border-[var(--input-border)] accent-accent"
                />
                Featured
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!form.name.trim() || loading}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && <SpinnerIcon />}
              {editingId ? "Save Changes" : "Create Pow Wow"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminPowWowsPage() {
  const { user } = useAuth();

  const [powwows, setPowwows] = useState<PowWow[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form modal state
  const [formModal, setFormModal] = useState<{
    open: boolean;
    editingId: string | null;
    data: PowWowFormData;
  }>({ open: false, editingId: null, data: EMPTY_FORM });

  // ---- Fetch pow wows ----
  const fetchPowWows = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/powwows", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Failed to fetch pow wows (${res.status})`);

      const data = await res.json();
      setPowwows(data.powwows || data || []);
    } catch (err) {
      console.error("Error fetching pow wows:", err);
      setError("Failed to load pow wows.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPowWows();
  }, [fetchPowWows]);

  // ---- Create / Update ----
  const handleFormSubmit = async (data: PowWowFormData) => {
    if (!user) return;
    const editingId = formModal.editingId;
    setActionLoading(editingId || "__create__");

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/powwows", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          editingId
            ? { action: "update", powwowId: editingId, ...data }
            : { action: "create", ...data },
        ),
      });

      if (!res.ok) throw new Error(editingId ? "Failed to update pow wow" : "Failed to create pow wow");

      toast.success(editingId ? "Pow wow updated" : "Pow wow created");
      setFormModal({ open: false, editingId: null, data: EMPTY_FORM });
      fetchPowWows();
    } catch (err) {
      console.error("Error saving pow wow:", err);
      toast.error(editingId ? "Failed to update pow wow" : "Failed to create pow wow");
    } finally {
      setActionLoading(null);
    }
  };

  // ---- Delete ----
  const handleDelete = async (powwow: PowWow) => {
    if (!user) return;
    if (!window.confirm(`Are you sure you want to delete "${powwow.name}"? This action cannot be undone.`)) {
      return;
    }

    setActionLoading(powwow.id);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/powwows", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "delete", powwowId: powwow.id }),
      });

      if (!res.ok) throw new Error("Failed to delete pow wow");

      toast.success("Pow wow deleted");
      fetchPowWows();
    } catch (err) {
      console.error("Error deleting pow wow:", err);
      toast.error("Failed to delete pow wow");
    } finally {
      setActionLoading(null);
    }
  };

  // ---- Feature / Unfeature ----
  const handleToggleFeatured = async (powwow: PowWow) => {
    if (!user) return;
    setActionLoading(powwow.id);

    try {
      const token = await user.getIdToken();
      const action = powwow.featured ? "unfeature" : "feature";
      const res = await fetch("/api/admin/powwows", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, powwowId: powwow.id }),
      });

      if (!res.ok) throw new Error(`Failed to ${action} pow wow`);

      toast.success(powwow.featured ? "Pow wow unfeatured" : "Pow wow featured");
      fetchPowWows();
    } catch (err) {
      console.error("Error toggling featured:", err);
      toast.error("Failed to update featured status");
    } finally {
      setActionLoading(null);
    }
  };

  // ---- Open edit modal ----
  const openEditModal = (powwow: PowWow) => {
    setFormModal({
      open: true,
      editingId: powwow.id,
      data: {
        name: powwow.name || "",
        startDate: powwow.startDate || "",
        endDate: powwow.endDate || "",
        location: powwow.location || "",
        description: powwow.description || "",
        status: powwow.status || "upcoming",
        featured: powwow.featured || false,
      },
    });
  };

  // ---- Filtered list ----
  const filteredPowWows = useMemo(() => {
    let list = powwows;

    // Status / featured filter
    if (statusFilter === "featured") {
      list = list.filter((pw) => pw.featured);
    } else if (statusFilter !== "all") {
      list = list.filter((pw) => pw.status === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (pw) =>
          pw.name?.toLowerCase().includes(q) ||
          pw.location?.toLowerCase().includes(q),
      );
    }

    return list;
  }, [powwows, statusFilter, searchQuery]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* ---- Header ---- */}
      <div className="animate-fade-in flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Pow Wow Management
          </h1>
          <p className="mt-1 text-[var(--text-secondary)]">
            Manage pow wow events across the platform
          </p>
        </div>
        <button
          onClick={() => setFormModal({ open: true, editingId: null, data: EMPTY_FORM })}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          <PlusIcon className="h-4 w-4" />
          Add New Pow Wow
        </button>
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
          placeholder="Search by name or location..."
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

      {/* ---- Empty state ---- */}
      {!loading && filteredPowWows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--card-bg)] py-16 text-center">
          <p className="text-[var(--text-muted)]">No pow wows found</p>
        </div>
      )}

      {/* ---- Table / list ---- */}
      {!loading && filteredPowWows.length > 0 && (
        <div className="animate-fade-in rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Name
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Date
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Location
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Featured
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPowWows.map((powwow) => (
                  <tr
                    key={powwow.id}
                    className="border-b border-[var(--card-border)] last:border-b-0 transition-colors hover:bg-muted/50"
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-foreground">
                        {powwow.name}
                      </p>
                      {powwow.description && (
                        <p className="mt-0.5 max-w-xs truncate text-xs text-[var(--text-muted)]">
                          {powwow.description}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-[var(--text-muted)]">
                      <span>{formatDate(powwow.startDate)}</span>
                      {powwow.endDate && powwow.endDate !== powwow.startDate && (
                        <span> &ndash; {formatDate(powwow.endDate)}</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-[var(--text-muted)]">
                      {powwow.location || "\u2014"}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={powwow.status} />
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleToggleFeatured(powwow)}
                        disabled={actionLoading === powwow.id}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50",
                          powwow.featured
                            ? "bg-accent/10 text-accent hover:bg-accent/20"
                            : "bg-muted text-[var(--text-muted)] hover:bg-muted/80 hover:text-foreground",
                        )}
                        title={powwow.featured ? "Unfeature" : "Feature"}
                      >
                        <StarIcon className="h-3.5 w-3.5" filled={powwow.featured} />
                        {powwow.featured ? "Featured" : "Feature"}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(powwow)}
                          disabled={actionLoading === powwow.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
                          title="Edit"
                        >
                          <EditIcon className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(powwow)}
                          disabled={actionLoading === powwow.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-error/10 px-3 py-1.5 text-xs font-medium text-error transition-colors hover:bg-error/20 disabled:opacity-50"
                          title="Delete"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="divide-y divide-[var(--card-border)] sm:hidden">
            {filteredPowWows.map((powwow) => (
              <div key={powwow.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {powwow.name}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {powwow.location || "\u2014"}
                    </p>
                  </div>
                  <StatusBadge status={powwow.status} />
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                  <span>{formatDate(powwow.startDate)}</span>
                  {powwow.featured && (
                    <span className="inline-flex items-center gap-1 text-accent">
                      <StarIcon className="h-3 w-3" filled />
                      Featured
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleFeatured(powwow)}
                    disabled={actionLoading === powwow.id}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50",
                      powwow.featured
                        ? "bg-accent/10 text-accent hover:bg-accent/20"
                        : "bg-muted text-[var(--text-muted)] hover:text-foreground",
                    )}
                  >
                    <StarIcon className="h-3.5 w-3.5" filled={powwow.featured} />
                    {powwow.featured ? "Unfeature" : "Feature"}
                  </button>
                  <button
                    onClick={() => openEditModal(powwow)}
                    disabled={actionLoading === powwow.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
                  >
                    <EditIcon className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(powwow)}
                    disabled={actionLoading === powwow.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-error/10 px-3 py-2 text-xs font-medium text-error transition-colors hover:bg-error/20 disabled:opacity-50"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Form modal ---- */}
      <PowWowFormModal
        isOpen={formModal.open}
        editingId={formModal.editingId}
        initialData={formModal.data}
        onClose={() => setFormModal({ open: false, editingId: null, data: EMPTY_FORM })}
        onSubmit={handleFormSubmit}
        loading={actionLoading !== null}
      />
    </div>
  );
}
