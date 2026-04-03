"use client";

import { useEffect, useState, useCallback } from "react";
import { auth } from "@/lib/firebase";
import type { Organization } from "@/lib/types";

type OrgTab = "pending" | "all" | "unlinked";

interface OrgWithOwner extends Organization {
  ownerInfo?: { displayName: string; email: string } | null;
}

export default function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<OrgWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<OrgTab>("pending");
  const [search, setSearch] = useState("");
  const [tabCounts, setTabCounts] = useState<{ pending: number; all: number; unlinked: number }>({ pending: 0, all: 0, unlinked: 0 });

  // Fetch tab counts
  useEffect(() => {
    async function loadCounts() {
      try {
        const token = await auth?.currentUser?.getIdToken();
        const res = await fetch("/api/admin/counts", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setTabCounts({
            pending: data.pendingOrgs ?? 0,
            all: data.totalOrgs ?? 0,
            unlinked: data.unlinkedOrgs ?? 0,
          });
        }
      } catch (e) { console.error(e); }
    }
    loadCounts();
  }, []);

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const token = await auth?.currentUser?.getIdToken();
      const params = new URLSearchParams();
      if (tab === "pending") params.set("verification", "unverified");
      if (tab === "unlinked") params.set("unlinked", "true");
      if (search) params.set("search", search);
      params.set("sort", "createdAt_desc");
      params.set("includeOwner", "true");
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
      <h1 className="text-2xl font-bold mb-6">Businesses & Schools</h1>

      <div className="flex gap-2 mb-4">
        {([
          { key: "pending" as OrgTab, label: "Pending Verification" },
          { key: "all" as OrgTab, label: "All Organizations" },
          { key: "unlinked" as OrgTab, label: "Unlinked" },
        ]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${tab === t.key ? "bg-[var(--accent)] text-white" : "bg-[var(--card-bg)] border border-[var(--card-border)]"}`}>
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-white/20" : "bg-[var(--surface-raised)]"}`}>
              {tabCounts[t.key]}
            </span>
          </button>
        ))}
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
                {org.ownerInfo ? (
                  <div className="text-xs text-[var(--text-secondary)] mt-1">Owner: {org.ownerInfo.displayName} ({org.ownerInfo.email})</div>
                ) : !org.ownerUid ? (
                  <div className="text-xs text-[var(--danger)] mt-1">No linked owner</div>
                ) : null}
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
