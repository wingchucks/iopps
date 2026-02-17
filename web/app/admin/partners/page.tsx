"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import type { Organization } from "@/lib/types";

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const token = await auth?.currentUser?.getIdToken();
      const res = await fetch("/api/admin/employers?tier=tier1,tier2,school", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setPartners((await res.json()).organizations || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchPartners(); }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Partner Showcase</h1>
      <p className="text-[var(--text-secondary)] mb-4">Organizations with active subscriptions shown on the homepage partner carousel.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="text-[var(--text-muted)] p-8 text-center col-span-full">Loading...</div>
        ) : partners.length === 0 ? (
          <div className="text-[var(--text-muted)] p-8 text-center col-span-full bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)]">No partners</div>
        ) : partners.map((org) => (
          <div key={org.id} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4 flex items-center gap-4">
            {org.logoURL ? (
              <img src={org.logoURL} alt={org.name} className="w-16 h-16 object-contain rounded" />
            ) : (
              <div className="w-16 h-16 bg-[var(--surface-raised)] rounded flex items-center justify-center text-2xl">🏢</div>
            )}
            <div>
              <h3 className="font-semibold">{org.name}</h3>
              <span className="badge-premium">{org.subscription.tier}</span>
              {org.verification === "verified" && <span className="badge-verified ml-1">✓</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
