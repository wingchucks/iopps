"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { signInWithCustomToken } from "firebase/auth";
import type { UserRole } from "@/lib/types";
import {
  AdminLoadingState,
  AdminFilterButtons,
  AdminSearchInput,
  StatusBadge,
} from "@/components/admin";
import { Suspense } from "react";

interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt?: { seconds: number };
  displayName?: string;
  disabled?: boolean;
}

function AdminUsersContent() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleFilter = searchParams.get("role") as UserRole | null;

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<UserRole | "all">(roleFilter || "all");
  const [searchTerm, setSearchTerm] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || (role !== "admin" && role !== "moderator")) {
      router.push("/");
      return;
    }
    loadUsers();
  }, [user, role, authLoading, router]);

  async function loadUsers() {
    try {
      setLoading(true);
      const usersRef = collection(db!, "users");
      const usersSnap = await getDocs(query(usersRef, orderBy("createdAt", "desc")));
      const usersList: User[] = usersSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as User));
      setUsers(usersList);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  }

  async function updateUserRole(userId: string, newRole: UserRole) {
    if (!user) return;
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;

    try {
      setProcessing(userId);
      const userRef = doc(db!, "users", userId);

      if (newRole === "employer") {
        const employerRef = doc(db!, "employers", userId);
        const employerSnap = await getDoc(employerRef);

        if (!employerSnap.exists()) {
          const targetUser = users.find(u => u.id === userId);
          await setDoc(employerRef, {
            id: userId,
            userId: userId,
            organizationName: targetUser?.displayName || "",
            description: "",
            website: "",
            location: "",
            logoUrl: "",
            status: "pending",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }

      await updateDoc(userRef, { role: newRole, updatedAt: serverTimestamp() });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    } catch (error) {
      console.error("Error updating user role:", error);
      alert("Failed to update user role. Please try again.");
    } finally {
      setProcessing(null);
    }
  }

  async function toggleUserStatus(userId: string, currentStatus: boolean) {
    if (!user) return;
    const action = currentStatus ? "disable" : "enable";
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
      setProcessing(userId);
      const userRef = doc(db!, "users", userId);
      await updateDoc(userRef, { disabled: !currentStatus, updatedAt: serverTimestamp() });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, disabled: !currentStatus } : u));
    } catch (error) {
      console.error("Error toggling user status:", error);
      alert("Failed to update user status. Please try again.");
    } finally {
      setProcessing(null);
    }
  }

  async function impersonateUser(userId: string) {
    if (!user || !auth) return;
    if (!confirm("Are you sure you want to sign in as this user? You will be logged out of your admin account.")) return;

    try {
      setProcessing(userId);
      const idToken = await user.getIdToken();
      const response = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ targetUserId: userId }),
      });

      if (!response.ok) throw new Error("Failed to get impersonation token");
      const { token } = await response.json();
      await signInWithCustomToken(auth, token);
      router.push("/");
    } catch (error) {
      console.error("Error impersonating user:", error);
      alert("Failed to impersonate user. Please try again.");
      setProcessing(null);
    }
  }

  if (authLoading || loading) {
    return <AdminLoadingState message="Loading users..." />;
  }

  if (!user || (role !== "admin" && role !== "moderator")) {
    return null;
  }

  const filteredUsers = users.filter((u) => {
    if (filter !== "all" && u.role !== filter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return u.email?.toLowerCase().includes(search) || u.displayName?.toLowerCase().includes(search) || u.id.toLowerCase().includes(search);
    }
    return true;
  });

  const communityCount = users.filter((u) => u.role === "community").length;
  const employerCount = users.filter((u) => u.role === "employer").length;
  const moderatorCount = users.filter((u) => u.role === "moderator" || u.role === "admin").length;

  const filterOptions = [
    { value: "all", label: "All", count: users.length },
    { value: "community", label: "Community", count: communityCount },
    { value: "employer", label: "Employers", count: employerCount },
    { value: "moderator", label: "Moderators", count: moderatorCount, variant: "purple" as const },
  ];

  return (
    <div className="min-h-screen bg-[#020306]">
      <div className="border-b border-slate-800 bg-[#08090C]">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/admin" className="text-sm text-slate-400 hover:text-[#14B8A6]">← Admin Dashboard</Link>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">User Management</h1>
              <p className="mt-1 text-sm text-slate-400">{filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 space-y-4">
          <AdminFilterButtons options={filterOptions} value={filter} onChange={(value) => setFilter(value as UserRole | "all")} />
          <AdminSearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search by email, name, or ID..." />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-800 bg-slate-950/60">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">User</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Joined</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">No users found for this filter.</td></tr>
                ) : (
                  filteredUsers.map((userData) => {
                    const isProcessing = processing === userData.id;
                    const isCurrentUser = userData.id === user?.uid;

                    return (
                      <tr key={userData.id} className="transition hover:bg-slate-900/40">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-slate-200">{userData.displayName || userData.email}</p>
                            {userData.displayName && <p className="mt-1 text-sm text-slate-500">{userData.email}</p>}
                            <p className="mt-1 text-xs text-slate-600">ID: {userData.id}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={userData.role}
                            onChange={(e) => updateUserRole(userData.id, e.target.value as UserRole)}
                            disabled={isProcessing || isCurrentUser}
                            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-slate-200 disabled:opacity-50"
                          >
                            <option value="community">Community</option>
                            <option value="employer">Employer</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={userData.disabled ? "disabled" : "active"} />
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">
                          {userData.createdAt ? new Date(userData.createdAt.seconds * 1000).toLocaleDateString() : "Unknown"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {user?.email === "nathan.arias@iopps.ca" && (
                              <button onClick={() => impersonateUser(userData.id)} disabled={isProcessing || isCurrentUser} className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-yellow-500 hover:text-yellow-500 disabled:opacity-50" title="Sign in as this user">Login As</button>
                            )}
                            <button onClick={() => toggleUserStatus(userData.id, userData.disabled || false)} disabled={isProcessing || isCurrentUser} className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-[#14B8A6] hover:text-[#14B8A6] disabled:opacity-50">
                              {isProcessing ? "..." : userData.disabled ? "Enable" : "Disable"}
                            </button>
                            {userData.role === "employer" && (
                              <Link href={`/admin/employers?search=${encodeURIComponent(userData.displayName || userData.email || userData.id)}`} className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-[#14B8A6] hover:text-[#14B8A6]">View Profile</Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<AdminLoadingState message="Loading users..." />}>
      <AdminUsersContent />
    </Suspense>
  );
}
