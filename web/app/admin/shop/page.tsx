"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Vendor {
  id: string;
  name: string;
  category: string;
  verified: boolean;
  featured: boolean;
  flagged: boolean;
  flagReason?: string;
  suspended: boolean;
  viewCount: number;
  image?: string;
}

interface ShopData {
  vendors: Vendor[];
  businessOfTheDay: Vendor | null;
}

const TABS = ["All Vendors", "Verified", "Flagged"] as const;

const categoryColors: Record<string, string> = {
  Art: "bg-pink-500/20 text-pink-300",
  Jewelry: "bg-amber-500/20 text-amber-300",
  Textiles: "bg-indigo-500/20 text-indigo-300",
  Home: "bg-teal-500/20 text-teal-300",
  Food: "bg-orange-500/20 text-orange-300",
  Services: "bg-blue-500/20 text-blue-300",
  Experiences: "bg-purple-500/20 text-purple-300",
};

export default function ShopPage() {
  const { user } = useAuth();
  const [data, setData] = useState<ShopData>({ vendors: [], businessOfTheDay: null });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]>("All Vendors");
  const [showBotdPicker, setShowBotdPicker] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const statusParam = tab === "Verified" ? "verified" : tab === "Flagged" ? "flagged" : "";
      const res = await fetch(`/api/admin/shop${statusParam ? `?status=${statusParam}` : ""}`, {
        headers: { Authorization: `Bearer ${await user?.getIdToken()}` },
      });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error("Failed to load shop data");
    } finally {
      setLoading(false);
    }
  }, [tab, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const doAction = async (action: string, id: string) => {
    try {
      const res = await fetch("/api/admin/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user?.getIdToken()}` },
        body: JSON.stringify({ action, id }),
      });
      if (!res.ok) throw new Error();
      toast.success("Done");
      fetchData();
    } catch {
      toast.error("Action failed");
    }
  };

  const filtered = data.vendors;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-2xl font-bold">Shop Indigenous Oversight</h1>

      {/* Business of the Day */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-amber-400">Business of the Day</p>
            {data.businessOfTheDay ? (
              <p className="mt-1 text-lg font-semibold">{data.businessOfTheDay.name}</p>
            ) : (
              <p className="mt-1 text-sm text-[var(--text-muted)]">None selected</p>
            )}
          </div>
          <button
            onClick={() => setShowBotdPicker(!showBotdPicker)}
            className="rounded-lg bg-amber-500/20 px-4 py-2 text-sm text-amber-300 hover:bg-amber-500/30 transition"
          >
            Change
          </button>
        </div>
        {showBotdPicker && (
          <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-2 space-y-1">
            {data.vendors.filter((v) => !v.suspended).map((v) => (
              <button
                key={v.id}
                onClick={() => { doAction("set-business-of-day", v.id); setShowBotdPicker(false); }}
                className="w-full text-left rounded px-3 py-1.5 text-sm hover:bg-white/10 transition"
              >
                {v.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setLoading(true); }}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              tab === t ? "bg-white/10 text-white" : "text-[var(--text-muted)] hover:text-white"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[var(--text-muted)]">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-[var(--text-muted)]">No vendors found.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => (
            <div
              key={v.id}
              className={cn(
                "rounded-xl border p-4 space-y-3",
                v.flagged ? "border-red-500/40 bg-red-500/5" : v.suspended ? "border-yellow-500/40 bg-yellow-500/5 opacity-60" : "border-[var(--card-border)] bg-[var(--card-bg)]"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-lg font-bold">
                  {v.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{v.name}</h3>
                    {v.verified && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-blue-400">
                        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    )}
                  </div>
                  <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium mt-0.5", categoryColors[v.category] || "bg-white/10 text-white")}>
                    {v.category}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  {v.viewCount.toLocaleString()} views
                </span>
                {/* Feature toggle */}
                <button
                  onClick={() => doAction(v.featured ? "unfeature" : "feature", v.id)}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs transition",
                    v.featured ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-[var(--text-muted)] hover:bg-white/10"
                  )}
                >
                  {v.featured ? "★ Featured" : "Feature"}
                </button>
              </div>

              {/* Flag info */}
              {v.flagged && (
                <div className="rounded-lg bg-red-500/10 p-3 space-y-2">
                  <p className="text-xs text-red-300">
                    <span className="font-medium">Flag reason:</span> {v.flagReason || "No reason provided"}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => doAction("dismiss-flag", v.id)} className="rounded bg-white/10 px-3 py-1 text-xs hover:bg-white/15 transition">
                      Dismiss
                    </button>
                    <button onClick={() => doAction("suspend", v.id)} className="rounded bg-yellow-600/20 px-3 py-1 text-xs text-yellow-300 hover:bg-yellow-600/30 transition">
                      Suspend
                    </button>
                    <button
                      onClick={() => { if (window.confirm("Remove this vendor?")) doAction("remove", v.id); }}
                      className="rounded bg-red-600/20 px-3 py-1 text-xs text-red-300 hover:bg-red-600/30 transition"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
