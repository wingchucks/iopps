"use client";

import { useEffect, useState, useCallback } from "react";
import { auth } from "@/lib/firebase";
import type { UserProfile } from "@/lib/types";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const perPage = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token = await auth?.currentUser?.getIdToken();
      const params = new URLSearchParams({ page: String(page), limit: String(perPage) });
      if (search) params.set("search", search);
      if (roleFilter !== "all") params.set("role", roleFilter);
      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [page, search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleDisabled = async (uid: string, disabled: boolean) => {
    const token = await auth?.currentUser?.getIdToken();
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ uid, disabled: !disabled }),
    });
    fetchUsers();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--card-bg)] flex-1 min-w-[200px]"
        />
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--card-bg)]">
          <option value="all">All Roles</option>
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)] text-left">
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium">Role</th>
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">No users found</td></tr>
            ) : users.map((u) => (
              <tr key={u.uid} className="border-b border-[var(--card-border)] hover:bg-[var(--surface-raised)]">
                <td className="p-3">{u.displayName || `${u.firstName} ${u.lastName}`}</td>
                <td className="p-3 text-[var(--text-secondary)]">{u.email}</td>
                <td className="p-3"><span className={`badge-${u.role === "admin" ? "featured" : "education"}`}>{u.role}</span></td>
                <td className="p-3">{u.accountType}</td>
                <td className="p-3">{u.disabled ? <span className="text-[var(--danger)]">Disabled</span> : <span className="text-[var(--success)]">Active</span>}</td>
                <td className="p-3">
                  <button onClick={() => toggleDisabled(u.uid, u.disabled)}
                    className={`px-3 py-1 rounded text-xs font-medium ${u.disabled ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {u.disabled ? "Enable" : "Disable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-4">
        <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
          className="px-3 py-1 rounded border border-[var(--input-border)] disabled:opacity-50">Previous</button>
        <span className="text-sm text-[var(--text-secondary)]">Page {page}</span>
        <button onClick={() => setPage(page + 1)} disabled={users.length < perPage}
          className="px-3 py-1 rounded border border-[var(--input-border)] disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}
