"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format-date";
import toast from "react-hot-toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PinnedItem {
  id: string;
  collection: string;
  title?: string;
  name?: string;
  pinned?: boolean;
  featured?: boolean;
  pinnedAt?: string;
  featuredAt?: string;
  autoUnpinAt?: string;
  organization?: string;
  paidAmount?: number;
  featureStartDate?: string;
  featureEndDate?: string;
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-5 w-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
    </svg>
  );
}

function StarIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className || "h-5 w-5"} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDateValue(value: unknown): Date {
  if (!value) return new Date(0);
  if (typeof value === 'object' && value !== null) {
    const v = value as Record<string, unknown>;
    if (typeof v.seconds === 'number') return new Date(v.seconds * 1000);
    if (typeof v._seconds === 'number') return new Date(v._seconds * 1000);
  }
  return new Date(value as string | number);
}

function getCountdown(dateStr: string): string {
  const diff = toDateValue(dateStr).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h remaining`;
  return `${hours}h remaining`;
}

function getItemTitle(item: PinnedItem): string {
  return item.title || item.name || "Untitled";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PinnedPage() {
  const { user } = useAuth();
  const [pinned, setPinned] = useState<PinnedItem[]>([]);
  const [featured, setFeatured] = useState<PinnedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/pinned", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setPinned(data.pinned || []);
      setFeatured(data.featured || []);
    } catch {
      toast.error("Failed to load pinned items");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (itemId: string, collection: string, action: string) => {
    if (!user) return;
    setActionLoading(itemId);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/pinned", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, collection, action }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed");
      }
      toast.success(`Item ${action === "pin" ? "pinned" : action === "unpin" ? "unpinned" : action === "feature" ? "featured" : "unfeatured"}`);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Featured & Pinned</h1>
        <p className="text-sm text-[var(--text-muted)]">Manage pinned and featured content across the platform</p>
      </div>

      {/* Pinned Limit Banner */}
      <div className={cn(
        "flex items-center gap-3 rounded-xl border p-4 text-sm",
        pinned.length >= 5 ? "border-red-500/30 bg-red-500/5 text-red-400" : "border-amber-500/30 bg-amber-500/5 text-amber-500"
      )}>
        <PinIcon className="h-5 w-5 shrink-0" />
        <span><strong>{pinned.length}/5</strong> pinned slots used. Maximum 5 items can be pinned simultaneously.</span>
      </div>

      {/* Currently Pinned */}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <PinIcon className="h-5 w-5 text-accent" />
          Currently Pinned
        </h2>
        {pinned.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No items currently pinned</p>
        ) : (
          <div className="space-y-3">
            {pinned.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-[var(--card-border)] p-3">
                <div>
                  <p className="font-medium">{getItemTitle(item)}</p>
                  <div className="mt-0.5 flex gap-3 text-xs text-[var(--text-muted)]">
                    <span className="capitalize">{item.collection}</span>
                    {item.pinnedAt && <span>Pinned {formatDate(item.pinnedAt)}</span>}
                    {item.autoUnpinAt && (
                      <span className="text-amber-500">{getCountdown(item.autoUnpinAt)}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleAction(item.id, item.collection, "unpin")}
                  disabled={actionLoading === item.id}
                  className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                >
                  {actionLoading === item.id ? "..." : "Unpin"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Featured Items */}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <StarIcon className="h-5 w-5 text-amber-500" filled />
          Featured Items
        </h2>
        {featured.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No featured items</p>
        ) : (
          <div className="space-y-3">
            {featured.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-[var(--card-border)] p-3">
                <div>
                  <p className="font-medium">{getItemTitle(item)}</p>
                  <div className="mt-0.5 flex gap-3 text-xs text-[var(--text-muted)]">
                    <span className="capitalize">{item.collection}</span>
                    {item.organization && <span>{item.organization}</span>}
                    {item.paidAmount && <span className="text-emerald-500">${item.paidAmount}</span>}
                    {item.featuredAt && <span>Since {formatDate(item.featuredAt)}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {pinned.length < 5 && (
                    <button
                      onClick={() => handleAction(item.id, item.collection, "pin")}
                      disabled={actionLoading === item.id}
                      className="rounded-lg border border-accent/30 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
                    >
                      Pin
                    </button>
                  )}
                  <button
                    onClick={() => handleAction(item.id, item.collection, "unfeature")}
                    disabled={actionLoading === item.id}
                    className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    Remove Feature
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
