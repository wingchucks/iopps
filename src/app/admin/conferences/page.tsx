"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format-date";
import toast from "react-hot-toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Conference {
  id: string;
  title: string;
  description?: string;
  date?: string;
  dates?: string;
  location?: string;
  organizer?: string;
  price?: string;
  status?: string;
  active?: boolean;
  featured?: boolean;
  createdAt?: unknown;
}

interface ConferenceFormData {
  title: string;
  description: string;
  date: string;
  dates: string;
  location: string;
  organizer: string;
  price: string;
  status: string;
  featured: boolean;
}

const EMPTY_FORM: ConferenceFormData = {
  title: "",
  description: "",
  date: "",
  dates: "",
  location: "",
  organizer: "",
  price: "",
  status: "active",
  featured: false,
};

// ---------------------------------------------------------------------------
// Status filter tabs
// ---------------------------------------------------------------------------

const STATUS_TABS: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Featured", value: "featured" },
];

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const statusBadgeStyles: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  inactive: "bg-muted text-[var(--text-muted)] border-[var(--card-border)]",
  featured: "bg-accent/10 text-accent border-accent/20",
};

function StatusBadge({ status, featured }: { status?: string; featured?: boolean }) {
  const display = featured ? "featured" : (status || "active");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        statusBadgeStyles[display] || statusBadgeStyles.active,
      )}
    >
      {display}
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
// Conference form modal
// ---------------------------------------------------------------------------

function ConferenceFormModal({
  isOpen,
  editingId,
  initialData,
  onClose,
  onSubmit,
  loading,
}: {
  isOpen: boolean;
  editingId: string | null;
  initialData: ConferenceFormData;
  onClose: () => void;
  onSubmit: (data: ConferenceFormData) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<ConferenceFormData>(initialData);

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
        aria-label={editingId ? "Edit Conference" : "Add New Conference"}
        className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-xl animate-scale-in"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {editingId ? "Edit Conference" : "Add New Conference"}
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
          {/* Title */}
          <div>
            <label htmlFor="conf-title" className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
              Title
            </label>
            <input
              id="conf-title"
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Conference title"
              className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-foreground placeholder:text-[var(--text-muted)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-accent/20"
              autoFocus
            />
          </div>

          {/* Organizer */}
          <div>
            <label htmlFor="conf-organizer" className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
              Organizer
            </label>
            <input
              id="conf-organizer"
              type="text"
              value={form.organizer}
              onChange={(e) => setForm((f) => ({ ...f, organizer: e.target.value }))}
              placeholder="Organizing body or group"
              className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-foreground placeholder:text-[var(--text-muted)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {/* Date + Dates row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="conf-date" className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                Date
              </label>
              <input
                id="conf-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-foreground focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div>
              <label htmlFor="conf-dates" className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                Date Range
              </label>
              <input
                id="conf-dates"
                type="text"
                value={form.dates}
                onChange={(e) => setForm((f) => ({ ...f, dates: e.target.value }))}
                placeholder="e.g. Jun 15-17, 2026"
                className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-foreground placeholder:text-[var(--text-muted)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </div>

          {/* Location + Price row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="conf-location" className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                Location
              </label>
              <input
                id="conf-location"
                type="text"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="City, Province"
                className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-foreground placeholder:text-[var(--text-muted)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div>
              <label htmlFor="conf-price" className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                Price
              </label>
              <input
                id="conf-price"
                type="text"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="Free / $50 / etc."
                className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-foreground placeholder:text-[var(--text-muted)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="conf-desc" className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
              Description
            </label>
            <textarea
              id="conf-desc"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of the conference..."
              className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-foreground placeholder:text-[var(--text-muted)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {/* Status + Featured row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="conf-status" className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                Status
              </label>
              <select
                id="conf-status"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-foreground focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
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
              disabled={!form.title.trim() || loading}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && <SpinnerIcon />}
              {editingId ? "Save Changes" : "Create Conference"}
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

export default function AdminConferencesPage() {
  const { user } = useAuth();

  const [conferences, setConferences] = useState<Conference[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form modal state
  const [formModal, setFormModal] = useState<{
    open: boolean;
    editingId: string | null;
    data: ConferenceFormData;
  }>({ open: false, editingId: null, data: EMPTY_FORM });

  // ---- Fetch conferences ----
  const fetchConferences = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/conferences", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Failed to fetch conferences (${res.status})`);

      const data = await res.json();
      setConferences(data.conferences || data || []);
    } catch (err) {
      console.error("Error fetching conferences:", err);
      setError("Failed to load conferences.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConferences();
  }, [fetchConferences]);

  // ---- Create / Update ----
  const handleFormSubmit = async (data: ConferenceFormData) => {
    if (!user) return;
    const editingId = formModal.editingId;
    setActionLoading(editingId || "__create__");

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/conferences", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          editingId
            ? { action: "update", conferenceId: editingId, ...data }
            : { action: "create", ...data },
        ),
      });

      if (!res.ok) throw new Error(editingId ? "Failed to update conference" : "Failed to create conference");

      toast.success(editingId ? "Conference updated" : "Conference created");
      setFormModal({ open: false, editingId: null, data: EMPTY_FORM });
      fetchConferences();
    } catch (err) {
      console.error("Error saving conference:", err);
      toast.error(editingId ? "Failed to update conference" : "Failed to create conference");
    } finally {
      setActionLoading(null);
    }
  };

  // ---- Delete ----
  const handleDelete = async (conf: Conference) => {
    if (!user) return;
    if (!window.confirm(`Are you sure you want to delete "${conf.title}"? This action cannot be undone.`)) {
      return;
    }

    setActionLoading(conf.id);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/conferences", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "delete", conferenceId: conf.id }),
      });

      if (!res.ok) throw new Error("Failed to delete conference");

      toast.success("Conference deleted");
      fetchConferences();
    } catch (err) {
      console.error("Error deleting conference:", err);
      toast.error("Failed to delete conference");
    } finally {
      setActionLoading(null);
    }
  };

  // ---- Feature / Unfeature ----
  const handleToggleFeatured = async (conf: Conference) => {
    if (!user) return;
    setActionLoading(conf.id);

    try {
      const token = await user.getIdToken();
      const action = conf.featured ? "unfeature" : "feature";
      const res = await fetch("/api/admin/conferences", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, conferenceId: conf.id }),
      });

      if (!res.ok) throw new Error(`Failed to ${action} conference`);

      toast.success(conf.featured ? "Conference unfeatured" : "Conference featured");
      fetchConferences();
    } catch (err) {
      console.error("Error toggling featured:", err);
      toast.error("Failed to update featured status");
    } finally {
      setActionLoading(null);
    }
  };

  // ---- Toggle active status ----
  const handleToggleActive = async (conf: Conference) => {
    if (!user) return;
    setActionLoading(conf.id);

    try {
      const token = await user.getIdToken();
      const action = conf.active === false ? "activate" : "deactivate";
      const res = await fetch("/api/admin/conferences", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, conferenceId: conf.id }),
      });

      if (!res.ok) throw new Error(`Failed to ${action} conference`);

      toast.success(conf.active === false ? "Conference activated" : "Conference deactivated");
      fetchConferences();
    } catch (err) {
      console.error("Error toggling active:", err);
      toast.error("Failed to update status");
    } finally {
      setActionLoading(null);
    }
  };

  // ---- Open edit modal ----
  const openEditModal = (conf: Conference) => {
    setFormModal({
      open: true,
      editingId: conf.id,
      data: {
        title: conf.title || "",
        description: conf.description || "",
        date: conf.date || "",
        dates: conf.dates || "",
        location: conf.location || "",
        organizer: conf.organizer || "",
        price: conf.price || "",
        status: conf.status || "active",
        featured: conf.featured || false,
      },
    });
  };

  // ---- Filtered list ----
  const filteredConferences = useMemo(() => {
    let list = conferences;

    if (statusFilter === "featured") {
      list = list.filter((c) => c.featured);
    } else if (statusFilter === "active") {
      list = list.filter((c) => c.active !== false && c.status !== "inactive");
    } else if (statusFilter === "inactive") {
      list = list.filter((c) => c.active === false || c.status === "inactive");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.title?.toLowerCase().includes(q) ||
          c.location?.toLowerCase().includes(q) ||
          c.organizer?.toLowerCase().includes(q),
      );
    }

    return list;
  }, [conferences, statusFilter, searchQuery]);

  // ---- Stats ----
  const totalCount = conferences.length;
  const activeCount = conferences.filter((c) => c.active !== false && c.status !== "inactive").length;
  const featuredCount = conferences.filter((c) => c.featured).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* ---- Header ---- */}
      <div className="animate-fade-in flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Conference Management
          </h1>
          <p className="mt-1 text-[var(--text-secondary)]">
            Manage conferences and events across the platform
          </p>
        </div>
        <button
          onClick={() => setFormModal({ open: true, editingId: null, data: EMPTY_FORM })}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          <PlusIcon className="h-4 w-4" />
          Add Conference
        </button>
      </div>

      {/* ---- Stats Row ---- */}
      <div className="animate-fade-in grid grid-cols-3 gap-4" style={{ animationDelay: "40ms" }}>
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          <p className="text-2xl font-bold text-foreground">{totalCount}</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Total</p>
        </div>
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          <p className="text-2xl font-bold text-foreground">{activeCount}</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Active</p>
        </div>
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          <p className="text-2xl font-bold text-foreground">{featuredCount}</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Featured</p>
        </div>
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
          placeholder="Search by title, location, or organizer..."
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
      {!loading && filteredConferences.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--card-bg)] py-16 text-center">
          <svg
            className="mx-auto h-10 w-10 text-[var(--text-muted)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
            />
          </svg>
          <p className="mt-3 text-sm font-medium text-foreground">
            No conferences found
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {searchQuery
              ? "Try adjusting your search terms."
              : "Conferences will appear here once they are created."}
          </p>
        </div>
      )}

      {/* ---- Table / list ---- */}
      {!loading && filteredConferences.length > 0 && (
        <div className="animate-fade-in rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Title
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
                {filteredConferences.map((conf) => (
                  <tr
                    key={conf.id}
                    className="border-b border-[var(--card-border)] last:border-b-0 transition-colors hover:bg-muted/50"
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-foreground">
                        {conf.title}
                      </p>
                      {conf.organizer && (
                        <p className="mt-0.5 max-w-xs truncate text-xs text-[var(--text-muted)]">
                          {conf.organizer}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-[var(--text-muted)]">
                      {conf.dates || (conf.date ? formatDate(conf.date) : "\u2014")}
                    </td>
                    <td className="px-5 py-4 text-sm text-[var(--text-muted)]">
                      {conf.location || "\u2014"}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={conf.status} featured={conf.featured} />
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleToggleFeatured(conf)}
                        disabled={actionLoading === conf.id}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50",
                          conf.featured
                            ? "bg-accent/10 text-accent hover:bg-accent/20"
                            : "bg-muted text-[var(--text-muted)] hover:bg-muted/80 hover:text-foreground",
                        )}
                        title={conf.featured ? "Unfeature" : "Feature"}
                      >
                        <StarIcon className="h-3.5 w-3.5" filled={conf.featured} />
                        {conf.featured ? "Featured" : "Feature"}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleActive(conf)}
                          disabled={actionLoading === conf.id}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                            conf.active === false || conf.status === "inactive"
                              ? "bg-success/10 text-success hover:bg-success/20"
                              : "bg-warning/10 text-warning hover:bg-warning/20",
                          )}
                          title={conf.active === false ? "Activate" : "Deactivate"}
                        >
                          {conf.active === false || conf.status === "inactive" ? "Activate" : "Deactivate"}
                        </button>
                        <button
                          onClick={() => openEditModal(conf)}
                          disabled={actionLoading === conf.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
                          title="Edit"
                        >
                          <EditIcon className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(conf)}
                          disabled={actionLoading === conf.id}
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
            {filteredConferences.map((conf) => (
              <div key={conf.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {conf.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {conf.organizer || "\u2014"}
                    </p>
                  </div>
                  <StatusBadge status={conf.status} featured={conf.featured} />
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                  <span>{conf.dates || (conf.date ? formatDate(conf.date) : "No date")}</span>
                  <span>{conf.location || "No location"}</span>
                  {conf.featured && (
                    <span className="inline-flex items-center gap-1 text-accent">
                      <StarIcon className="h-3 w-3" filled />
                      Featured
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleToggleFeatured(conf)}
                    disabled={actionLoading === conf.id}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50",
                      conf.featured
                        ? "bg-accent/10 text-accent hover:bg-accent/20"
                        : "bg-muted text-[var(--text-muted)] hover:text-foreground",
                    )}
                  >
                    <StarIcon className="h-3.5 w-3.5" filled={conf.featured} />
                    {conf.featured ? "Unfeature" : "Feature"}
                  </button>
                  <button
                    onClick={() => handleToggleActive(conf)}
                    disabled={actionLoading === conf.id}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50",
                      conf.active === false || conf.status === "inactive"
                        ? "bg-success/10 text-success hover:bg-success/20"
                        : "bg-warning/10 text-warning hover:bg-warning/20",
                    )}
                  >
                    {conf.active === false || conf.status === "inactive" ? "Activate" : "Deactivate"}
                  </button>
                  <button
                    onClick={() => openEditModal(conf)}
                    disabled={actionLoading === conf.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
                  >
                    <EditIcon className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(conf)}
                    disabled={actionLoading === conf.id}
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
      <ConferenceFormModal
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
