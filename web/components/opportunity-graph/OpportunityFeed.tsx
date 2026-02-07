/**
 * IOPPS Social Opportunity Graph — Opportunity Feed
 * 
 * Main feed component that displays opportunities from various sources.
 */

"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  listJobPostings,
  listScholarships,
  listConferences,
  listPowwowEvents,
  listLiveStreams,
  listTrainingPrograms,
  listApprovedVendors,
  listSavedJobIds,
  toggleSavedJob,
  toggleSavedConference,
  listSavedConferenceIds,
  getFeedPosts,
} from "@/lib/firestore";
import { useAuth } from "@/components/AuthProvider";
import { colors, typeConfig } from "./tokens";
import { OpportunityCard, OpportunityItem } from "./OpportunityCard";
import {
  jobToOpportunity,
  scholarshipToOpportunity,
  eventToOpportunity,
  livestreamToOpportunity,
  trainingToOpportunity,
  vendorToOpportunity,
  postToOpportunity,
} from "./adapters";
import { CreatePost } from "@/components/social/CreatePost";
import ProfileNudge from "@/components/social/ProfileNudge";
import { Icon } from "./Icon";
import type { OpportunityType } from "./tokens";

type FeedTab = "all" | "jobs" | "education" | "shop" | "events" | "live" | "community";

interface OpportunityFeedProps {
  initialTab?: FeedTab;
  maxItems?: number;
  showTabs?: boolean;
  showSearch?: boolean;
  className?: string;
  /** Only fetch and show these content types. If omitted, fetches everything. */
  contentTypes?: OpportunityType[];
  /** Custom filter bar rendered above the feed cards (below tabs if shown). */
  filterBar?: React.ReactNode;
  /** Custom empty state message. */
  emptyMessage?: string;
  /** Show the welcome banner and quick composer. Defaults to true. */
  showBanner?: boolean;
  /** Show the featured section. Defaults to true. */
  showFeatured?: boolean;
}

const tabs: { id: FeedTab; label: string; icon: string }[] = [
  { id: "all", label: "All", icon: "✨" },
  { id: "jobs", label: "Jobs", icon: "💼" },
  { id: "education", label: "Education", icon: "🎓" },
  { id: "shop", label: "Shop", icon: "🛍" },
  { id: "events", label: "Events", icon: "📅" },
  { id: "live", label: "Live", icon: "🎥" },
  { id: "community", label: "Community", icon: "💬" },
];

export function OpportunityFeed({
  initialTab = "all",
  maxItems = 20,
  showTabs = true,
  showSearch = false,
  className = "",
  contentTypes,
  filterBar,
  emptyMessage,
  showBanner = true,
  showFeatured = true,
}: OpportunityFeedProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<FeedTab>(initialTab);
  const [items, setItems] = useState<OpportunityItem[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch saved items when user is logged in
  useEffect(() => {
    if (!user) {
      setSavedIds(new Set());
      return;
    }

    const uid = user.uid;
    async function loadSavedItems() {
      try {
        const [savedJobIds, savedConferenceIds] = await Promise.all([
          listSavedJobIds(uid).catch(() => []),
          listSavedConferenceIds(uid).catch(() => []),
        ]);
        setSavedIds(new Set([...savedJobIds, ...savedConferenceIds]));
      } catch (err) {
        console.error("Failed to load saved items:", err);
      }
    }

    loadSavedItems();
  }, [user]);

  // Fetch data from all sources (or only requested types)
  useEffect(() => {
    async function loadFeed() {
      setLoading(true);
      setError(null);

      // Helper: should we fetch this type?
      const shouldFetch = (types: OpportunityType[]) =>
        !contentTypes || contentTypes.some((t) => types.includes(t));

      try {
        // Only fetch content types that are needed
        const [jobs, scholarships, conferences, powwows, livestreams, training, vendors, socialPostsResult] = await Promise.all([
          shouldFetch(["job"]) ? listJobPostings({ activeOnly: true }).catch(() => []) : Promise.resolve([]),
          shouldFetch(["scholarship"]) ? listScholarships().catch(() => []) : Promise.resolve([]),
          shouldFetch(["conference", "event"]) ? listConferences().catch(() => []) : Promise.resolve([]),
          shouldFetch(["event"]) ? listPowwowEvents().catch(() => []) : Promise.resolve([]),
          shouldFetch(["livestream"]) ? listLiveStreams().catch(() => []) : Promise.resolve([]),
          shouldFetch(["program"]) ? listTrainingPrograms().catch(() => []) : Promise.resolve([]),
          shouldFetch(["product", "service"]) ? listApprovedVendors().catch(() => []) : Promise.resolve([]),
          shouldFetch(["update"]) ? getFeedPosts(20).catch(() => ({ posts: [], lastSnapshot: undefined })) : Promise.resolve({ posts: [], lastSnapshot: undefined }),
        ]);

        // Convert to OpportunityItems
        const allItems: OpportunityItem[] = [
          ...jobs.map(jobToOpportunity),
          ...scholarships.map(scholarshipToOpportunity),
          ...conferences.map(eventToOpportunity),
          ...powwows.map(eventToOpportunity),
          ...livestreams.map(livestreamToOpportunity),
          ...training.map(trainingToOpportunity),
          ...vendors.map(vendorToOpportunity),
          ...socialPostsResult.posts.map(postToOpportunity),
        ];

        // Smart sorting: Live first, then interleave by type for variety
        // 1. Extract live items
        const liveItems = allItems.filter(i => i.live);
        const nonLiveItems = allItems.filter(i => !i.live);
        
        // 2. Group by type
        const byType: Record<string, OpportunityItem[]> = {};
        for (const item of nonLiveItems) {
          if (!byType[item.type]) byType[item.type] = [];
          byType[item.type].push(item);
        }
        
        // 3. Interleave items from different types
        const types = Object.keys(byType);
        const interleavedItems: OpportunityItem[] = [];
        let typeIndex = 0;
        let hasMore = true;
        
        while (hasMore) {
          hasMore = false;
          for (let i = 0; i < types.length; i++) {
            const type = types[(typeIndex + i) % types.length];
            if (byType[type].length > 0) {
              interleavedItems.push(byType[type].shift()!);
              hasMore = true;
            }
          }
          typeIndex++;
        }
        
        // 4. Combine: live first, then interleaved
        const sortedItems = [...liveItems, ...interleavedItems];

        setItems(sortedItems.slice(0, maxItems * 2));
      } catch (err) {
        console.error("Failed to load feed:", err);
        setError("Failed to load opportunities. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxItems, contentTypes?.join(","), refreshKey]);

  // Filter items based on active tab
  const filteredItems = useMemo(() => {
    if (activeTab === "all") return items;
    if (activeTab === "jobs") return items.filter(i => i.type === "job");
    if (activeTab === "education") return items.filter(i => ["program", "scholarship"].includes(i.type));
    if (activeTab === "events") return items.filter(i => ["event", "conference"].includes(i.type));
    if (activeTab === "shop") return items.filter(i => ["product", "service"].includes(i.type));
    if (activeTab === "live") return items.filter(i => i.type === "livestream");
    if (activeTab === "community") return items.filter(i => i.type === "update");
    return items;
  }, [items, activeTab]);

  // Handle save/unsave action
  const handleSave = useCallback(async (itemId: string, shouldSave: boolean) => {
    if (!user) {
      // Could show a login prompt here
      console.log("User must be logged in to save items");
      return;
    }

    // Find the item to determine its type
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    try {
      // Optimistically update UI
      setSavedIds(prev => {
        const next = new Set(prev);
        if (shouldSave) {
          next.add(itemId);
        } else {
          next.delete(itemId);
        }
        return next;
      });

      // Save to Firestore based on item type
      if (item.type === "job") {
        await toggleSavedJob(user.uid, itemId, shouldSave);
      } else if (item.type === "conference" || item.type === "event") {
        await toggleSavedConference(user.uid, itemId, shouldSave);
      }
      // TODO: Add handlers for other content types (scholarships, training, etc.)
    } catch (err) {
      console.error("Failed to save item:", err);
      // Revert optimistic update on error
      setSavedIds(prev => {
        const next = new Set(prev);
        if (shouldSave) {
          next.delete(itemId);
        } else {
          next.add(itemId);
        }
        return next;
      });
    }
  }, [user, items]);

  // Get featured items (first 3 with most engagement or marked featured)
  const featuredItems = items
    .filter(i => i.featured || (i.engagement?.saves && i.engagement.saves > 10))
    .slice(0, 3);

  return (
    <div className={className}>
      {/* Welcome Banner (for guests) */}
      {showBanner && !user && (
        <div
          style={{
            background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDk} 100%)`,
            borderRadius: 16,
            padding: 24,
            marginBottom: 16,
            color: "#fff",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -20,
              right: -20,
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.1)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -30,
              right: 60,
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.05)",
            }}
          />
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
            Welcome to IOPPS 👋
          </h2>
          <p style={{ margin: "8px 0 16px", opacity: 0.9, fontSize: 14, lineHeight: 1.5 }}>
            Your gateway to Indigenous careers, education, business, and community. 
            Join thousands of professionals building Indigenous success.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <a
              href="/register"
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                background: "#fff",
                color: colors.accent,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Get Started — It's Free
            </a>
            <a
              href="/login"
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.2)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Sign In
            </a>
          </div>
        </div>
      )}

      {/* Quick Composer (for logged-in users) */}
      {showBanner && user && (
        <CreatePost onPostCreated={() => setRefreshKey(k => k + 1)} />
      )}

      {/* Profile Nudge (for logged-in users with incomplete profiles) */}
      {showBanner && user && <ProfileNudge />}

      {/* Featured Section */}
      {showFeatured && featuredItems.length > 0 && !loading && activeTab === "all" && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: colors.text }}>
              ⭐ Featured Opportunities
            </h3>
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              overflowX: "auto",
              paddingBottom: 8,
              scrollSnapType: "x mandatory",
            }}
          >
            {featuredItems.map((item) => (
              <a
                key={`featured-${item.id}`}
                href={item.href}
                style={{
                  flex: "0 0 280px",
                  scrollSnapAlign: "start",
                  background: colors.surface,
                  borderRadius: 12,
                  border: `1px solid ${colors.border}`,
                  padding: 16,
                  textDecoration: "none",
                  color: colors.text,
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: typeConfig[item.type]?.bg || colors.accentBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                    }}
                  >
                    {typeConfig[item.type]?.emoji || "📋"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: colors.textMuted }}>
                      {item.author?.name || "IOPPS"}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.title}
                    </div>
                  </div>
                </div>
                {item.meta?.mode && (
                  <div
                    style={{
                      fontSize: 12,
                      color: colors.textMuted,
                      marginBottom: 8,
                    }}
                  >
                    📍 {item.meta.mode}
                  </div>
                )}
                <div
                  style={{
                    display: "inline-block",
                    padding: "4px 10px",
                    borderRadius: 12,
                    background: typeConfig[item.type]?.bg || colors.accentBg,
                    color: typeConfig[item.type]?.color || colors.accent,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {typeConfig[item.type]?.label || "Opportunity"}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Search Bar */}
      {showSearch && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: 10,
              background: colors.bg,
              border: `1px solid ${colors.border}`,
            }}
          >
            <Icon name="search" size={18} color={colors.textMuted} />
            <input
              type="text"
              placeholder="Search jobs, vendors, or Nations..."
              style={{
                flex: 1,
                border: "none",
                background: "none",
                fontSize: 14,
                color: colors.text,
                outline: "none",
              }}
            />
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      {showTabs && (
        <div
          style={{
            background: colors.surface,
            borderRadius: 12,
            border: `1px solid ${colors.border}`,
            marginBottom: 16,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              overflowX: "auto",
              borderBottom: `1px solid ${colors.borderLt}`,
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "12px 16px",
                  fontSize: 14,
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  color: activeTab === tab.id ? colors.accent : colors.textSoft,
                  borderBottom: activeTab === tab.id ? `2px solid ${colors.accent}` : "2px solid transparent",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                }}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Filter Bar */}
      {filterBar && <div style={{ marginBottom: 16 }}>{filterBar}</div>}

      {/* Loading State */}
      {loading && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                background: colors.surface,
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                padding: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: colors.bg,
                    animation: "ioppsPulse 1.5s ease-in-out infinite",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      height: 14,
                      width: "40%",
                      background: colors.bg,
                      borderRadius: 4,
                      marginBottom: 6,
                    }}
                  />
                  <div
                    style={{
                      height: 10,
                      width: "30%",
                      background: colors.bg,
                      borderRadius: 4,
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  height: 16,
                  width: "80%",
                  background: colors.bg,
                  borderRadius: 4,
                  marginBottom: 8,
                }}
              />
              <div
                style={{
                  height: 12,
                  width: "100%",
                  background: colors.bg,
                  borderRadius: 4,
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div
          style={{
            background: colors.redBg,
            border: `1px solid ${colors.red}20`,
            borderRadius: 12,
            padding: 24,
            textAlign: "center",
          }}
        >
          <p style={{ color: colors.red, fontSize: 14, margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredItems.length === 0 && (
        <div
          style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            padding: 48,
            textAlign: "center",
          }}
        >
          <p style={{ color: colors.textSoft, fontSize: 14, margin: 0 }}>
            {emptyMessage || "No opportunities found. Check back later!"}
          </p>
        </div>
      )}

      {/* Feed Cards */}
      {!loading && !error && filteredItems.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredItems.map((item) => (
            <OpportunityCard
              key={item.id}
              item={{ ...item, saved: savedIds.has(item.id) }}
              onSave={handleSave}
            />
          ))}
          
          {/* End of Feed */}
          <div
            style={{
              textAlign: "center",
              padding: "32px 16px",
              color: colors.textMuted,
              fontSize: 14,
            }}
          >
            ✨ You're all caught up — check back later for new opportunities
          </div>
        </div>
      )}

      {/* Pulse Animation */}
      <style>{`
        @keyframes ioppsPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
