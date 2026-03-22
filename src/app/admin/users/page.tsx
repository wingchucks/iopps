"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  AdminStatGrid,
  type AdminFilterOption,
} from "@/components/admin";
import { formatDate } from "@/lib/format-date";
import type { UserRole } from "@/lib/auth";
import type { AdminUserRow } from "@/lib/admin/view-types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const ROLE_TABS: AdminFilterOption[] = [
  { label: "All", value: "all" },
  { label: "Community", value: "community" },
  { label: "Employers", value: "employer" },
  { label: "Moderators", value: "moderator" },
  { label: "Admins", value: "admin" },
];

const roleBadgeStyles: Record<UserRole, string> = {
  community: "border-info/20 bg-info/10 text-info",
  employer: "border-accent/20 bg-accent/10 text-accent",
  moderator: "border-warning/20 bg-warning/10 text-warning",
  admin: "border-error/20 bg-error/10 text-error",
};

const ASSIGNABLE_ROLES: { label: string; value: UserRole }[] = [
  { label: "Community", value: "community" },
  { label: "Employer", value: "employer" },
  { label: "Moderator", value: "moderator" },
  { label: "Admin", value: "admin" },
];

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize",
        roleBadgeStyles[role] || roleBadgeStyles.community,
      )}
    >
      {role}
    </span>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
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
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

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

  useEffect(() => {
    if (!open) return;
    const handleClick = () => setOpen(false);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(!open);
        }}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--card-border-hover)] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        Change role
        <ChevronDownIcon className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-20 mt-2 w-40 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] py-1 shadow-2xl"
          role="listbox"
          aria-label="Select role"
          onClick={(event) => event.stopPropagation()}
        >
          {ASSIGNABLE_ROLES.map((role) => (
            <button
              key={role.value}
              type="button"
              role="option"
              aria-selected={role.value === currentRole}
              onClick={() => {
                if (role.value !== currentRole) {
                  onRoleChange(userId, role.value);
                }
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center px-3 py-2 text-left text-sm transition-colors",
                role.value === currentRole
                  ? "bg-accent/10 font-medium text-accent"
                  : "text-[var(--text-secondary)] hover:bg-[var(--muted)] hover:text-foreground",
              )}
            >
              {role.label}
              {role.value === currentRole && (
                <span className="ml-auto text-xs text-accent">Current</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name[0]?.toUpperCase() || "?";
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchUsers = useCallback(async () => {
    const currentUser = user;
    if (!currentUser) return;

    setLoading(true);
    setError(null);

    try {
      const token = await currentUser!.getIdToken();
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Failed to fetch users (${res.status})`);

      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load users.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const currentUser = user;
    if (!currentUser) return;
    setActionLoading(userId);

    try {
      const token = await currentUser!.getIdToken();
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
      await fetchUsers();
    } catch (err) {
      console.error("Error changing role:", err);
      toast.error("Failed to change user role");
    } finally {
      setActionLoading(null);
    }
  };

  const roleCounts = useMemo(() => {
    return users.reduce(
      (acc, current) => {
        acc[current.role] += 1;
        return acc;
      },
      { community: 0, employer: 0, moderator: 0, admin: 0 },
    );
  }, [users]);

  const tabOptions = useMemo(
    () =>
      ROLE_TABS.map((tab) => ({
        ...tab,
        count: tab.value === "all" ? users.length : roleCounts[tab.value as UserRole],
      })),
    [roleCounts, users.length],
  );

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return users.filter((userRow) => {
      const matchesRole = roleFilter === "all" || userRow.role === roleFilter;
      if (!matchesRole) return false;
      if (!normalizedSearch) return true;

        return [userRow.displayName, userRow.email, userRow.role]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [roleFilter, searchQuery, users]);

  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, searchQuery]);

  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const statItems = [
    {
      label: "Total users",
      value: users.length,
      helper: "All community and organization-linked accounts",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      label: "Employer accounts",
      value: roleCounts.employer,
      helper: "Organization-side accounts with posting access",
      tone: "info" as const,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      ),
    },
    {
      label: "Moderators",
      value: roleCounts.moderator,
      helper: "Content and queue reviewers",
      tone: "warning" as const,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
    {
      label: "Admins",
      value: roleCounts.admin,
      helper: "Full platform access",
      tone: "danger" as const,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 15l-3.5 2 1-4-3-2.5 4-.3L12 6l1.5 4.2 4 .3-3 2.5 1 4z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="People"
        title="User Management"
        description="Manage platform roles, scan account distribution, and update access without losing context about who each account belongs to."
        meta={
          <p className="text-sm text-[var(--text-muted)]">
            Showing <span className="font-semibold text-foreground">{filteredUsers.length}</span> matching users
          </p>
        }
      />

      <AdminStatGrid items={statItems} />

      <AdminFilterBar>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <AdminFilterTabs options={tabOptions} value={roleFilter} onChange={setRoleFilter} />
          <div className="w-full xl:w-80">
            <AdminSearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by name, email, or role"
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
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-24 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] skeleton" />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <AdminEmptyState
          title="No users match the current filters"
          description="Try another role tab or a different search term. The list supports matching against both names and email addresses."
        />
      ) : (
        <AdminDataTable
          data={paginatedUsers}
          keyExtractor={(userRow) => userRow.id}
          columns={[
            {
              key: "name",
              header: "Name",
              render: (userRow) => (
                <div className="flex items-center gap-3">
                  {userRow.photoURL ? (
                    <img
                      src={userRow.photoURL}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                      {getInitials(userRow.displayName)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <Link
                      href={`/admin/users/${userRow.id}`}
                      className="block truncate text-sm font-semibold text-foreground transition-colors hover:text-accent"
                    >
                      {userRow.displayName || "Unnamed"}
                    </Link>
                    <p className="truncate text-xs text-[var(--text-secondary)]">{userRow.email || "No email on file"}</p>
                  </div>
                </div>
              ),
            },
            {
              key: "role",
              header: "Role",
              render: (userRow) => <RoleBadge role={userRow.role} />,
            },
            {
              key: "joined",
              header: "Joined",
              render: (userRow) => (
                <div className="space-y-1">
                  <p className="text-sm text-foreground">{formatDate(userRow.createdAt)}</p>
                  <p className="text-xs text-[var(--text-muted)]">{userRow.id}</p>
                </div>
              ),
            },
            {
              key: "actions",
              header: "Actions",
              headerClassName: "text-right",
              className: "text-right",
              render: (userRow) => (
                <div className="flex justify-end">
                  <RoleDropdown
                    currentRole={userRow.role}
                    userId={userRow.id}
                    onRoleChange={handleRoleChange}
                    loading={actionLoading === userRow.id}
                  />
                </div>
              ),
            },
          ]}
          mobileCard={(userRow) => (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                {userRow.photoURL ? (
                  <img
                    src={userRow.photoURL}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                    {getInitials(userRow.displayName)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/users/${userRow.id}`}
                    className="block truncate text-sm font-semibold text-foreground transition-colors hover:text-accent"
                  >
                    {userRow.displayName || "Unnamed"}
                  </Link>
                  <p className="truncate text-xs text-[var(--text-secondary)]">{userRow.email || "No email on file"}</p>
                </div>
                <RoleBadge role={userRow.role} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-[var(--text-muted)]">Joined {formatDate(userRow.createdAt)}</p>
                <RoleDropdown
                  currentRole={userRow.role}
                  userId={userRow.id}
                  onRoleChange={handleRoleChange}
                  loading={actionLoading === userRow.id}
                />
              </div>
            </div>
          )}
          footer={
            <AdminPagination
              page={currentPage}
              totalPages={totalPages}
              totalItems={filteredUsers.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          }
        />
      )}
    </div>
  );
}
