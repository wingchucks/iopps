"use client";

import { useEffect, useState, useCallback } from "react";
import { auth } from "@/lib/firebase";
import type { Organization } from "@/lib/types";

export default function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [search, setSearch] = useState("");

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const token = await auth?.currentUser?.getIdToken();
      const params = new URLSearchParams();
      if (tab === "pending") params.set("verification", "unverified");
      if (search) params.set("search", search);
      params.set("sort", "createdAt_desc");
      const res = await fetch(`/api/admin/employers?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrgs(data.organizations || []);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [tab, search]);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  const patchOrg = async (id: string, patch: Record<string, unknown>) => {
    const token = await auth?.currentUser?.getIdToken();
    await fetch("/api/admin/employers", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    fetchOrgs();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Organizations</h1>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("pending")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "pending" ? "bg-[var(--accent)] text-white" : "bg-[var(--card-bg)] border border-[var(--card-border)]"}`}>
          Pending Verification
        </button>
        <button onClick={() => setTab("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "all" ? "bg-[var(--accent)] text-white" : "bg-[var(--card-bg)] border border-[var(--card-border)]"}`}>
          All Organizations
        </button>
        <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="ml-auto px-3 py-2 border border-[var(--input-border)] rounded-lg bg-[var(--card-bg)] min-w-[200px]" />
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-[var(--text-muted)] p-8 text-center">Loading...</div>
        ) : orgs.length === 0 ? (
          <div className="text-[var(--text-muted)] p-8 text-center bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)]">
            {tab === "pending" ? "No pending organizations 🎉" : "No organizations found"}
          </div>
        ) : orgs.map((org) => (
          <div key={org.id} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{org.name}</h3>
                  {org.verification === "verified" && <span className="badge-verified">✓ Verified</span>}
                  {org.indigenousOwnedVerified && <span className="badge-education">Indigenous-Owned</span>}
                  {org.subscription.tier !== "none" && <span className="badge-premium">{org.subscription.tier}</span>}
                </div>
                <div className="text-sm text-[var(--text-secondary)] mt-1">
                  {org.primaryType} · {org.city}, {org.province} · {org.industry}
                </div>
                <div className="text-sm text-[var(--text-muted)] mt-1">{org.website}</div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {org.verification === "unverified" && (
                  <>
                    <button onClick={() => patchOrg(org.id, { verification: "verified" })}
                      className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700">
                      Approve
                    </button>
                    <button onClick={() => patchOrg(org.id, { disabled: true })}
                      className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700">
                      Reject
                    </button>
                  </>
                )}
                <button onClick={() => patchOrg(org.id, { verification: org.verification === "verified" ? "unverified" : "verified" })}
                  className="px-3 py-1.5 border border-[var(--input-border)] rounded text-xs font-medium">
                  Toggle Verified
                </button>
                <button onClick={() => patchOrg(org.id, { indigenousOwnedVerified: !org.indigenousOwnedVerified })}
                  className="px-3 py-1.5 border border-[var(--input-border)] rounded text-xs font-medium">
                  Toggle Indigenous
                </button>
                <button onClick={() => patchOrg(org.id, { disabled: !org.disabled })}
                  className={`px-3 py-1.5 rounded text-xs font-medium ${org.disabled ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {org.disabled ? "Enable" : "Disable"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
