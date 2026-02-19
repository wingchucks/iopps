"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Application {
  id: string;
  jobTitle: string;
  employer: string;
  status: string;
  appliedAt: string | null;
}

interface UserDetail {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: string;
  status: string;
  suspendReason: string | null;
  nation: string | null;
  treatyArea: string | null;
  createdAt: string | null;
  lastLoginAt: string | null;
  applications: Application[];
  applicationCount: number;
  isSuperAdmin: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-500/15 text-blue-500",
  reviewed: "bg-amber-500/15 text-amber-600",
  accepted: "bg-green-500/15 text-green-600",
  rejected: "bg-red-500/15 text-red-500",
  withdrawn: "bg-gray-500/15 text-gray-500",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [userData, setUserData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [showSuspend, setShowSuspend] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUser = async () => {
    if (!authUser) return;
    try {
      const token = await authUser.getIdToken();
      const res = await fetch(`/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setUserData(data);
      setSelectedRole(data.role);
    } catch {
      toast.error("Failed to load user");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, userId]);

  const apiCall = async (method: string, body?: Record<string, unknown>) => {
    if (!authUser) return;
    setActionLoading(true);
    try {
      const token = await authUser.getIdToken();
      const res = await fetch(`/api/admin/users/${userId}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      toast.success("Updated successfully");
      await fetchUser();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(false);
      setEditingRole(false);
      setShowSuspend(false);
      setDeleteConfirm(0);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <p className="text-[var(--text-muted)]">Loading user…</p>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <p className="text-red-500">User not found</p>
      </div>
    );
  }

  const isSuperAdmin = userData.isSuperAdmin;
  const isSuspended = userData.status === "suspended";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push("/admin/users")}
        className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] transition-colors hover:text-foreground"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to Users
      </button>

      {/* Profile card */}
      <div className="rounded-xl border border-[var(--card-border)] bg-surface p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent/10 text-2xl font-bold text-accent">
            {userData.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userData.photoURL}
                alt=""
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              (userData.displayName || userData.email || "?")[0].toUpperCase()
            )}
          </div>

          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold">
                {userData.displayName || "Unnamed User"}
              </h1>
              {isSuperAdmin && (
                <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-600">
                  Super Admin — Protected
                </span>
              )}
              {isSuspended && (
                <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-bold text-red-500">
                  Suspended
                </span>
              )}
            </div>
            <p className="text-sm text-[var(--text-muted)]">{userData.email}</p>
            <div className="flex flex-wrap gap-4 pt-2 text-sm text-[var(--text-muted)]">
              <span>Role: <strong className="text-foreground">{userData.role}</strong></span>
              {userData.nation && <span>Nation: <strong className="text-foreground">{userData.nation}</strong></span>}
              {userData.treatyArea && <span>Treaty Area: <strong className="text-foreground">{userData.treatyArea}</strong></span>}
              <span>Joined: {formatDate(userData.createdAt)}</span>
              <span>Last Active: {formatDate(userData.lastLoginAt)}</span>
            </div>
            {isSuspended && userData.suspendReason && (
              <p className="mt-2 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-500">
                Suspend reason: {userData.suspendReason}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="rounded-xl border border-[var(--card-border)] bg-surface p-6 space-y-4">
        <h2 className="text-lg font-semibold">Actions</h2>

        <div className="flex flex-wrap gap-3">
          {/* Edit Role */}
          {editingRole ? (
            <div className="flex items-center gap-2">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="rounded-md border border-[var(--card-border)] bg-background px-3 py-1.5 text-sm"
                disabled={isSuperAdmin}
              >
                <option value="member">Member</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={() => apiCall("PATCH", { role: selectedRole })}
                disabled={actionLoading || isSuperAdmin}
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => setEditingRole(false)}
                className="rounded-md px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingRole(true)}
              disabled={isSuperAdmin}
              className="rounded-md border border-[var(--card-border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--card-bg)] disabled:opacity-50"
            >
              Edit Role
            </button>
          )}

          {/* Suspend / Unsuspend */}
          {isSuspended ? (
            <button
              onClick={() => apiCall("PATCH", { action: "unsuspend" })}
              disabled={actionLoading || isSuperAdmin}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              Unsuspend
            </button>
          ) : showSuspend ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Reason for suspension"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="rounded-md border border-[var(--card-border)] bg-background px-3 py-1.5 text-sm"
              />
              <button
                onClick={() => apiCall("PATCH", { action: "suspend", reason: suspendReason })}
                disabled={actionLoading || isSuperAdmin}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowSuspend(false)}
                className="rounded-md px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSuspend(true)}
              disabled={isSuperAdmin}
              className="rounded-md border border-red-500/30 px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50"
            >
              Suspend
            </button>
          )}

          {/* Delete */}
          <button
            onClick={() => {
              if (deleteConfirm === 0) {
                setDeleteConfirm(1);
                toast("Click again to confirm deletion", { icon: "⚠️" });
              } else {
                apiCall("DELETE");
              }
            }}
            disabled={isSuperAdmin || actionLoading}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
              deleteConfirm > 0
                ? "bg-red-600 text-white hover:bg-red-700"
                : "border border-red-500/30 text-red-500 hover:bg-red-500/10"
            )}
          >
            {deleteConfirm > 0 ? "Confirm Delete" : "Delete Account"}
          </button>
        </div>
      </div>

      {/* Application History */}
      <div className="rounded-xl border border-[var(--card-border)] bg-surface">
        <div className="border-b border-[var(--card-border)] px-6 py-4">
          <h2 className="text-lg font-semibold">
            Applications ({userData.applicationCount})
          </h2>
        </div>
        {userData.applications.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] text-left text-xs uppercase tracking-wider text-[var(--text-muted)]">
                <th className="px-6 py-3">Job</th>
                <th className="px-6 py-3">Employer</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Applied</th>
              </tr>
            </thead>
            <tbody>
              {userData.applications.map((app) => (
                <tr
                  key={app.id}
                  className="border-b border-[var(--card-border)] transition-colors hover:bg-[var(--card-bg)]"
                >
                  <td className="px-6 py-3 font-medium">{app.jobTitle}</td>
                  <td className="px-6 py-3 text-[var(--text-muted)]">{app.employer}</td>
                  <td className="px-6 py-3">
                    <span
                      className={cn(
                        "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                        STATUS_COLORS[app.status] || "bg-gray-500/15 text-gray-500"
                      )}
                    >
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-[var(--text-muted)]">
                    {formatDate(app.appliedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-6 py-8 text-center text-[var(--text-muted)]">
            No applications found
          </p>
        )}
      </div>
    </div>
  );
}
