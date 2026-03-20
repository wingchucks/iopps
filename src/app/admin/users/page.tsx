"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/auth";
import { formatDate } from "@/lib/format-date";

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdminUser {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  createdAt: string;
  photoURL?: string;
}

// ---------------------------------------------------------------------------
// Role filter tabs
// ---------------------------------------------------------------------------

const ROLE_TABS: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "Community", value: "community" },
  { label: "Employers", value: "employer" },
  { label: "Moderators", value: "moderator" },
  { label: "Admins", value: "admin" },
];

// ---------------------------------------------------------------------------
// Role badge styling
// ---------------------------------------------------------------------------

const roleBadgeStyles: Record<UserRole, string> = {
  community: "bg-info/10 text-info border-info/20",
  employer: "bg-[#8b5cf6]/10 text-[#8b5cf6] border-[#8b5cf6]/20",
  moderator: "bg-warning/10 text-warning border-warning/20",
  admin: "bg-error/10 text-error border-error/20",
};

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        roleBadgeStyles[role] || roleBadgeStyles.community,
      )}
    >
      {role}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Available roles for the change-role dropdown
// ---------------------------------------------------------------------------

const ASSIGNABLE_ROLES: { label: string; value: UserRole }[] = [
  { label: "Community", value: "community" },
  { label: "Employer", value: "employer" },
  { label: "Moderator", value: "moderator" },
  { label: "Admin", value: "admin" },
];

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

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Role dropdown component
// ---------------------------------------------------------------------------

function RoleDropdown({
  currentRole,
  userId,
  onRoleChange,
  loading,
}: {
  currentRole: UserRole;
  userId: string;
  onRoleChange: (userId: string, newRole: UserRole) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClick = () => setOpen(false);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [open]);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-accent/50 hover:text-foreground disabled:opacity-50"
        aria-label={`Change role for user`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        Change Role
        <ChevronDownIcon className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-20 mt-1 w-40 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] py-1 shadow-xl animate-scale-in"
          role="listbox"
          aria-label="Select role"
          onClick={(e) => e.stopPropagation()}
        >
          {ASSIGNABLE_ROLES.map((r) => (
            <button
              key={r.value}
              role="option"
              aria-selected={r.value === currentRole}
              onClick={() => {
                if (r.value !== currentRole) {
                  onRoleChange(userId, r.value);
                }
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center px-3 py-2 text-left text-sm transition-colors",
                r.value === currentRole
                  ? "bg-accent/10 text-accent font-medium"
                  : "text-[var(--text-secondary)] hover:bg-muted hover:text-foreground",
              )}
            >
              {r.label}
              {r.value === currentRole && (
                <span className="ml-auto text-xs text-accent">Current</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminUsersPage() {
  const { user } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // ---- Fetch users ----
  const fetchUsers = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const params = roleFilter !== "all" ? `?role=${roleFilter}` : "";
      const res = await fetch(`/api/admin/users${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Failed to fetch users (${res.status})`);

      const data = await res.json();
      setUsers(data.users || data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [user, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ---- Change role ----
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!user) return;
    setActionLoading(userId);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (!res.ok) throw new Error("Failed to change user role");

      toast.success(`Role updated to ${newRole}`);
      fetchUsers();
    } catch (err) {
      console.error("Error changing role:", err);
      toast.error("Failed to change user role");
    } finally {
      setActionLoading(null);
    }
  };

  // ---- Filtered list ----
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.displayName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q),
    );
  }, [users, searchQuery]);

  // Reset page on filter/search change
  useEffect(() => { setCurrentPage(1); }, [roleFilter, searchQuery]);

  // ---- Pagination ----
  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = filteredUsers.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredUsers.length);

  // ---- User initials for avatar fallback ----
  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name[0]?.toUpperCase() || "?";
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* ---- Header ---- */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          User Management
        </h1>
        <p className="mt-1 text-[var(--text-secondary)]">
          Manage user accounts and roles ({filteredUsers.length} total)
        </p>
      </div>

      {/* ---- Role filter tabs ---- */}
      <div className="animate-fade-in flex flex-wrap gap-2" style={{ animationDelay: "80ms" }}>
        {ROLE_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setRoleFilter(tab.value)}
            className={cn(
              "rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-150",
              roleFilter === tab.value
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
          placeholder="Search users by name or email..."
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
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 skeleton-shimmer" />
          ))}
        </div>
      )}

      {/* ---- Empty state ---- */}
      {!loading && filteredUsers.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--card-bg)] py-16 text-center">
          <p className="text-[var(--text-muted)]">No users found</p>
        </div>
      )}

      {/* ---- Table / list ---- */}
      {!loading && filteredUsers.length > 0 && (
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
                    Email
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Role
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Joined
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-[var(--card-border)] last:border-b-0 transition-colors hover:bg-muted/50"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {u.photoURL ? (
                          <img
                            src={u.photoURL}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                            {getInitials(u.displayName)}
                          </div>
                        )}
                        <Link href={`/admin/users/${u.id}`} className="text-sm font-medium text-foreground hover:text-accent transition-colors">
                          {u.displayName || "Unnamed"}
                        </Link>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">
                      {u.email}
                    </td>
                    <td className="px-5 py-4">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-5 py-4 text-sm text-[var(--text-muted)]">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        <RoleDropdown
                          currentRole={u.role}
                          userId={u.id}
                          onRoleChange={handleRoleChange}
                          loading={actionLoading === u.id}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="divide-y divide-[var(--card-border)] sm:hidden">
            {paginatedUsers.map((u) => (
              <div key={u.id} className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {u.photoURL ? (
                    <img
                      src={u.photoURL}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                      {getInitials(u.displayName)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/users/${u.id}`} className="truncate text-sm font-medium text-foreground hover:text-accent transition-colors block">
                      {u.displayName || "Unnamed"}
                    </Link>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {u.email}
                    </p>
                  </div>
                  <RoleBadge role={u.role} />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[var(--text-muted)]">
                    Joined {formatDate(u.createdAt)}
                  </p>
                  <RoleDropdown
                    currentRole={u.role}
                    userId={u.id}
                    onRoleChange={handleRoleChange}
                    loading={actionLoading === u.id}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 pt-4 pb-4 border-t border-[var(--card-border)]">
            <p className="text-sm text-[var(--text-muted)]">Showing {rangeStart}-{rangeEnd} of {filteredUsers.length}</p>
            <div className="flex gap-2">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1.5 text-sm rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-accent/10 disabled:opacity-40">Previous</button>
              <span className="text-sm px-3 py-1.5">{currentPage} / {totalPages}</span>
              <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1.5 text-sm rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-accent/10 disabled:opacity-40">Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
