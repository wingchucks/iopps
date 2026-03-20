"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { getMemberProfile } from "@/lib/firestore/members";
import {
  getSavedItems,
  unsavePost,
  type SavedItem,
} from "@/lib/firestore/savedItems";

const tabs = ["All", "Jobs", "Events", "Scholarships", "Other"] as const;
type Tab = (typeof tabs)[number];

const typeConfig: Record<
  string,
  { label: string; color: string; bg: string; icon: string; route: string }
> = {
  job: {
    label: "Job",
    color: "var(--blue)",
    bg: "var(--blue-soft)",
    icon: "\u{1F4BC}",
    route: "/jobs",
  },
  event: {
    label: "Event",
    color: "var(--purple)",
    bg: "rgba(139,92,246,.12)",
    icon: "\u{1FAB6}",
    route: "/events",
  },
  scholarship: {
    label: "Scholarship",
    color: "var(--gold)",
    bg: "var(--gold-soft)",
    icon: "\u{1F393}",
    route: "/scholarships",
  },
  program: {
    label: "Program",
    color: "var(--green)",
    bg: "var(--green-soft)",
    icon: "\u{1F4DA}",
    route: "/feed",
  },
  story: {
    label: "Story",
    color: "var(--teal)",
    bg: "rgba(13,148,136,.12)",
    icon: "\u{1F4DD}",
    route: "/feed",
  },
  spotlight: {
    label: "Spotlight",
    color: "var(--gold)",
    bg: "var(--gold-soft)",
    icon: "\u2B50",
    route: "/feed",
  },
};

function getSlug(postId: string, postType: string): string {
  // Post IDs are stored as "job-slug", "event-slug", etc.
  const prefix = postType + "-";
  if (postId.startsWith(prefix)) {
    return postId.slice(prefix.length);
  }
  return postId;
}

function getDetailLink(item: SavedItem): string {
  const cfg = typeConfig[item.postType];
  if (!cfg) return "/feed";
  const slug = getSlug(item.postId, item.postType);
  return `${cfg.route}/${slug}`;
}

function formatDate(ts: unknown): string {
  if (!ts || typeof ts !== "object") return "";
  const d = ts as { seconds?: number };
  if (!d.seconds) return "";
  const date = new Date(d.seconds * 1000);
  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SavedPage() {
  return (
    <ProtectedRoute>
      <AppShell>
      <div className="min-h-screen bg-bg">
        <SavedContent />
      </div>
    </AppShell>
    </ProtectedRoute>
  );
}

function SavedContent() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("All");
  const [removing, setRemoving] = useState<string | null>(null);
  const [hasOrg, setHasOrg] = useState(false);

  useEffect(() => {
    if (!user) return;
    getMemberProfile(user.uid).then((p) => { if (p?.orgId) setHasOrg(true); });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    getSavedItems(user.uid)
      .then(setItems)
      .catch((err) => console.error("Failed to load saved items:", err))
      .finally(() => setLoading(false));
  }, [user]);

  const handleRemove = async (item: SavedItem) => {
    if (!user || removing) return;
    setRemoving(item.postId);
    try {
      await unsavePost(user.uid, item.postId);
      setItems((prev) => prev.filter((i) => i.postId !== item.postId));
      showToast("Item removed from saved");
    } catch (err) {
      console.error("Failed to unsave:", err);
      showToast("Failed to remove item. Please try again.", "error");
    } finally {
      setRemoving(null);
    }
  };

  const filtered =
    activeTab === "All"
      ? items
      : activeTab === "Other"
        ? items.filter(
            (i) => !["job", "event", "scholarship"].includes(i.postType)
          )
        : items.filter(
            (i) => i.postType === activeTab.toLowerCase().replace(/s$/, "")
          );

  if (loading) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-6 md:px-10 md:py-8">
        <div className="skeleton h-8 w-48 rounded mb-6" />
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-9 w-24 rounded-xl" />
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 py-6 md:px-10 md:py-8">
      {/* Back link */}
      <Link
        href={hasOrg ? "/org/dashboard" : "/profile"}
        className="inline-flex items-center gap-1 text-sm text-text-muted no-underline hover:text-teal mb-4"
      >
        &#8592; {hasOrg ? "Back to Dashboard" : "Back to Profile"}
      </Link>

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text mb-1">
            Saved Items
          </h1>
          <p className="text-sm text-text-muted m-0">
            {items.length} {items.length === 1 ? "item" : "items"} saved
          </p>
        </div>
        <span className="text-3xl">&#128278;</span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2 rounded-xl border-none font-semibold text-sm cursor-pointer transition-all whitespace-nowrap"
              style={{
                background: active ? "var(--navy)" : "var(--card)",
                color: active ? "#fff" : "var(--text-sec)",
                border: active ? "none" : "1px solid var(--border)",
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Saved items list */}
      {filtered.length === 0 ? (
        <Card>
          <div style={{ padding: 40 }} className="text-center">
            <p className="text-4xl mb-3">&#128278;</p>
            <h3 className="text-lg font-bold text-text mb-2">
              {items.length === 0
                ? "No saved items yet"
                : `No saved ${activeTab.toLowerCase()}`}
            </h3>
            <p className="text-sm text-text-muted mb-4">
              {items.length === 0
                ? "Browse the feed and save jobs, events, and scholarships you're interested in."
                : "Try a different filter or browse the feed to save more items."}
            </p>
            <Link href="/feed">
              <Button
                primary
                style={{
                  background: "var(--teal)",
                  borderRadius: 14,
                  padding: "12px 28px",
                }}
              >
                Browse Feed &#8594;
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((item) => {
            const cfg = typeConfig[item.postType] || {
              label: item.postType,
              color: "var(--text-muted)",
              bg: "rgba(128,128,128,.1)",
              icon: "\u{1F4CC}",
              route: "/feed",
            };
            const link = getDetailLink(item);
            const isRemoving = removing === item.postId;

            return (
              <Card key={item.id} className="hover:border-teal transition-colors">
                <div
                  style={{ padding: 16 }}
                  className="flex items-center gap-3 sm:gap-4"
                >
                  {/* Icon */}
                  <Link
                    href={link}
                    className="flex items-center justify-center rounded-xl flex-shrink-0 no-underline"
                    style={{
                      width: 48,
                      height: 48,
                      background: cfg.bg,
                    }}
                  >
                    <span className="text-xl">{cfg.icon}</span>
                  </Link>

                  {/* Info */}
                  <Link
                    href={link}
                    className="flex-1 min-w-0 no-underline"
                  >
                    <p className="text-sm font-bold text-text mb-0.5 truncate">
                      {item.postTitle}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        text={cfg.label}
                        color={cfg.color}
                        bg={cfg.bg}
                        small
                      />
                      {item.postOrgName && (
                        <span className="text-xs text-text-muted">
                          {item.postOrgName}
                        </span>
                      )}
                      {Boolean(item.savedAt) && (
                        <span className="text-xs text-text-muted">
                          Saved {formatDate(item.savedAt)}
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemove(item)}
                    disabled={isRemoving}
                    className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl border-none cursor-pointer transition-all hover:bg-red/10"
                    style={{
                      background: "transparent",
                      color: "var(--text-muted)",
                      opacity: isRemoving ? 0.5 : 1,
                    }}
                    title="Remove from saved"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
