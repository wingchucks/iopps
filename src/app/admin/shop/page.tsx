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
  clickCount: number;
  image?: string;
  badges: string[];
  tribalAffiliation?: string;
}

interface ShopData {
  vendors: Vendor[];
  businessOfTheDay: Vendor | null;
}

const TABS = ["All Vendors", "Verified", "Flagged", "Featured"] as const;

const SHOP_CATEGORIES = [
  "Art & Fine Crafts",
  "Jewelry",
  "Textiles",
  "Home",
  "Food",
  "Professional Services",
  "Experiences",
];

const categoryColors: Record<string, string> = {
  "Art & Fine Crafts": "bg-pink-500/20 text-pink-300",
  Jewelry: "bg-amber-500/20 text-amber-300",
  Textiles: "bg-indigo-500/20 text-indigo-300",
  Home: "bg-teal-500/20 text-teal-300",
  Food: "bg-orange-500/20 text-orange-300",
  "Professional Services": "bg-blue-500/20 text-blue-300",
  Experiences: "bg-purple-500/20 text-purple-300",
  // Legacy short keys
  Art: "bg-pink-500/20 text-pink-300",
  Services: "bg-blue-500/20 text-blue-300",
};

const VERIFICATION_BADGES: { key: string; label: string; color: string }[] = [
  { key: "verified-indigenous-artist", label: "Verified Indigenous Artist", color: "bg-blue-500/20 text-blue-300" },
  { key: "tribal-affiliation", label: "Tribal Affiliation", color: "bg-green-500/20 text-green-300" },
  { key: "quick-responder", label: "Quick Responder", color: "bg-yellow-500/20 text-yellow-300" },
  { key: "top-rated", label: "Top Rated", color: "bg-amber-500/20 text-amber-300" },
  { key: "featured-artisan", label: "Featured Artisan", color: "bg-purple-500/20 text-purple-300" },
  { key: "new-artist", label: "New Artist", color: "bg-cyan-500/20 text-cyan-300" },
];

export default function ShopPage() {
  const { user } = useAuth();
  const [data, setData] = useState<ShopData>({ vendors: [], businessOfTheDay: null });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]>("All Vendors");
  const [showBotdPicker, setShowBotdPicker] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingBadges, setEditingBadges] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const statusParam = tab === "Verified" ? "verified" : tab === "Flagged" ? "flagged" : tab === "Featured" ? "featured" : "";
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

  const doAction = async (action: string, id: string, extra?: Record<string, unknown>) => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user?.getIdToken()}` },
        body: JSON.stringify({ action, id, ...extra }),
      });
      if (!res.ok) throw new Error();
      toast.success("Done");
      fetchData();
    } catch {
      toast.error("Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleBadge = (vendorId: string, badgeKey: string, currentBadges: string[]) => {
    const newBadges = currentBadges.includes(badgeKey)
      ? currentBadges.filter((b) => b !== badgeKey)
      : [...currentBadges, badgeKey];
    doAction("update-badges", vendorId, { badges: newBadges });
  };

  const filtered = data.vendors;

  // Summary stats
  const verifiedCount = data.vendors.filter((v) => v.verified).length;
  const flaggedCount = data.vendors.filter((v) => v.flagged).length;
  const totalViews = data.vendors.reduce((s, v) => s + v.viewCount, 0);
  const totalClicks = data.vendors.reduce((s, v) => s + v.clickCount, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-2xl font-bold">Shop Indigenous Oversight</h1>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--card-border)] bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Total Vendors</p>
          <p className="mt-1 text-xl font-bold text-accent">{data.vendors.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Verified</p>
          <p className="mt-1 text-xl font-bold text-blue-500">{verifiedCount}</p>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Total Views</p>
          <p className="mt-1 text-xl font-bold text-green-500">{totalViews.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Total Clicks</p>
          <p className="mt-1 text-xl font-bold text-purple-500">{totalClicks.toLocaleString()}</p>
        </div>
      </div>

      {/* Business of the Day */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-amber-400">Business of the Day</p>
            {data.businessOfTheDay ? (
              <div className="mt-1">
                <p className="text-lg font-semibold">{data.businessOfTheDay.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{data.businessOfTheDay.category}</p>
              </div>
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
            {data.vendors.filter((v) => !v.suspended && v.verified).map((v) => (
              <button
                key={v.id}
                onClick={() => { doAction("set-business-of-day", v.id); setShowBotdPicker(false); }}
                className="w-full text-left rounded px-3 py-1.5 text-sm hover:bg-white/10 transition flex items-center justify-between"
              >
                <span>{v.name}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px]", categoryColors[v.category] || "bg-white/10 text-white")}>{v.category}</span>
              </button>
            ))}
            {data.vendors.filter((v) => !v.suspended && v.verified).length === 0 && (
              <p className="px-3 py-2 text-sm text-[var(--text-muted)]">No verified vendors available</p>
            )}
          </div>
        )}
      </div>

      {/* Category breakdown */}
      <div className="flex flex-wrap gap-2">
        {SHOP_CATEGORIES.map((cat) => {
          const count = data.vendors.filter((v) => v.category === cat).length;
          return (
            <span
              key={cat}
              className={cn("rounded-full px-3 py-1 text-xs font-medium", categoryColors[cat] || "bg-white/10 text-white")}
            >
              {cat} ({count})
            </span>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-[var(--card-border)] bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setLoading(true); }}
            className={cn(
              "whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition",
              tab === t
                ? t === "Flagged"
                  ? "bg-red-500/20 text-red-400"
                  : "bg-accent text-white"
                : "text-[var(--text-muted)] hover:text-white"
            )}
          >
            {t}
            {t === "Flagged" && flaggedCount > 0 && (
              <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {flaggedCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[var(--text-muted)]">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] py-12 text-center">
          <p className="text-[var(--text-muted)]">No vendors found.</p>
        </div>
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

              {/* Verification badges */}
              {v.badges && v.badges.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {v.badges.map((badgeKey) => {
                    const badge = VERIFICATION_BADGES.find((b) => b.key === badgeKey);
                    if (!badge) return null;
                    return (
                      <span key={badgeKey} className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", badge.color)}>
                        {badge.label}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Tribal affiliation */}
              {v.tribalAffiliation && (
                <p className="text-xs text-[var(--text-muted)]">
                  <span className="font-medium">Affiliation:</span> {v.tribalAffiliation}
                </p>
              )}

              {/* Stats row */}
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    {v.viewCount.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                    {v.clickCount.toLocaleString()}
                  </span>
                </div>
                {/* Feature toggle */}
                <button
                  onClick={() => doAction(v.featured ? "unfeature" : "feature", v.id)}
                  disabled={actionLoading === v.id}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs transition disabled:opacity-50",
                    v.featured ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-[var(--text-muted)] hover:bg-white/10"
                  )}
                >
                  {v.featured ? "Featured" : "Feature"}
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                {/* Verified toggle */}
                <button
                  onClick={() => doAction(v.verified ? "unverify" : "verify", v.id)}
                  disabled={actionLoading === v.id}
                  className={cn(
                    "rounded px-3 py-1 text-xs transition disabled:opacity-50",
                    v.verified ? "bg-blue-500/20 text-blue-300" : "bg-white/10 text-[var(--text-muted)] hover:bg-white/15"
                  )}
                >
                  {v.verified ? "Verified" : "Verify"}
                </button>

                {/* Manage badges */}
                <button
                  onClick={() => setEditingBadges(editingBadges === v.id ? null : v.id)}
                  className="rounded bg-white/10 px-3 py-1 text-xs text-[var(--text-muted)] hover:bg-white/15 transition"
                >
                  Badges
                </button>

                {!v.flagged && !v.suspended && (
                  <button
                    onClick={() => { if (window.confirm("Remove this vendor?")) doAction("remove", v.id); }}
                    disabled={actionLoading === v.id}
                    className="rounded bg-red-600/20 px-3 py-1 text-xs text-red-300 hover:bg-red-600/30 transition disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Badge editor dropdown */}
              {editingBadges === v.id && (
                <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3 space-y-2">
                  <p className="text-xs font-medium text-[var(--text-secondary)]">Manage Badges</p>
                  <div className="flex flex-wrap gap-1.5">
                    {VERIFICATION_BADGES.map((badge) => {
                      const hasBadge = v.badges?.includes(badge.key);
                      return (
                        <button
                          key={badge.key}
                          onClick={() => toggleBadge(v.id, badge.key, v.badges || [])}
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[10px] font-medium transition",
                            hasBadge ? badge.color : "bg-white/5 text-[var(--text-muted)] hover:bg-white/10"
                          )}
                        >
                          {hasBadge ? "- " : "+ "}{badge.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Flag info */}
              {v.flagged && (
                <div className="rounded-lg bg-red-500/10 p-3 space-y-2">
                  <p className="text-xs text-red-300">
                    <span className="font-medium">Flag reason:</span> {v.flagReason || "No reason provided"}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => doAction("dismiss-flag", v.id)}
                      disabled={actionLoading === v.id}
                      className="rounded bg-white/10 px-3 py-1 text-xs hover:bg-white/15 transition disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => doAction("suspend", v.id)}
                      disabled={actionLoading === v.id}
                      className="rounded bg-yellow-600/20 px-3 py-1 text-xs text-yellow-300 hover:bg-yellow-600/30 transition disabled:opacity-50"
                    >
                      Suspend
                    </button>
                    <button
                      onClick={() => { if (window.confirm("Remove this vendor?")) doAction("remove", v.id); }}
                      disabled={actionLoading === v.id}
                      className="rounded bg-red-600/20 px-3 py-1 text-xs text-red-300 hover:bg-red-600/30 transition disabled:opacity-50"
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
