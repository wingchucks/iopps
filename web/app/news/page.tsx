/**
 * IOPPS Indigenous News Page
 *
 * Curated positive Indigenous news with category filtering,
 * Daily Business Idea spotlight, and trending tags.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { FeedLayout } from "@/components/opportunity-graph/dynamic";
import {
  SectionHeader,
  colors,
  Icon,
} from "@/components/opportunity-graph";
import {
  listNewsArticles,
  getDailyBusinessIdea,
  getNewsTags,
} from "@/lib/firestore/news";
import type { NewsArticle, NewsCategory } from "@/lib/types";

// ============================================================================
// Category Config
// ============================================================================

type TabId = "all" | NewsCategory;

const CATEGORIES: { id: TabId; label: string; emoji: string }[] = [
  { id: "all", label: "All", emoji: "📰" },
  { id: "business", label: "Business", emoji: "💼" },
  { id: "culture", label: "Culture", emoji: "🪶" },
  { id: "policy", label: "Policy", emoji: "⚖️" },
  { id: "sports", label: "Sports", emoji: "🏒" },
];

const CATEGORY_COLORS: Record<string, { text: string; bg: string }> = {
  business: { text: "#0D9488", bg: "#F0FDFA" },
  culture: { text: "#7C3AED", bg: "#F5F3FF" },
  policy: { text: "#2563EB", bg: "#EFF6FF" },
  sports: { text: "#DC2626", bg: "#FEF2F2" },
};

// ============================================================================
// Helpers
// ============================================================================

function timeAgo(date: any): string {
  if (!date) return "";
  const d = date?.toDate ? date.toDate() : new Date(date);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

// ============================================================================
// Skeleton Components
// ============================================================================

function BusinessIdeaSkeleton() {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #FFFBEB, #FEF3C7)",
        borderRadius: 12,
        padding: 24,
        marginBottom: 16,
        border: "1px solid #FDE68A",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "#FDE68A" }} />
        <div style={{ width: 160, height: 16, borderRadius: 6, background: "#FDE68A" }} />
      </div>
      <div style={{ width: "80%", height: 20, borderRadius: 6, background: "#FDE68A", marginBottom: 8 }} />
      <div style={{ width: "60%", height: 14, borderRadius: 6, background: "#FDE68A" }} />
    </div>
  );
}

function ArticleSkeleton() {
  return (
    <div
      style={{
        background: colors.surface,
        borderRadius: 12,
        border: `1px solid ${colors.border}`,
        overflow: "hidden",
      }}
    >
      <div style={{ width: "100%", height: 160, background: colors.borderLt }} />
      <div style={{ padding: 16 }}>
        <div style={{ width: 60, height: 20, borderRadius: 10, background: colors.borderLt, marginBottom: 10 }} />
        <div style={{ width: "90%", height: 18, borderRadius: 6, background: colors.borderLt, marginBottom: 8 }} />
        <div style={{ width: "70%", height: 14, borderRadius: 6, background: colors.borderLt, marginBottom: 12 }} />
        <div style={{ width: "40%", height: 12, borderRadius: 6, background: colors.borderLt }} />
      </div>
    </div>
  );
}

// ============================================================================
// Daily Business Idea Card
// ============================================================================

function BusinessIdeaCard({ article }: { article: NewsArticle }) {
  return (
    <a
      href={article.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: "none", display: "block", marginBottom: 16 }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #FFFBEB, #FEF3C7)",
          borderRadius: 12,
          padding: 20,
          border: "1px solid #FDE68A",
          cursor: "pointer",
          transition: "box-shadow 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(245, 158, 11, 0.15)")}
        onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#F59E0B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            💡
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#92400E", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Daily Business Idea
          </span>
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#78350F", marginBottom: 6, lineHeight: 1.35 }}>
          {article.title}
        </div>
        <div style={{ fontSize: 13, color: "#92400E", lineHeight: 1.5, marginBottom: 8 }}>
          {article.excerpt}
        </div>
        {article.businessIdeaDetails && (
          <div style={{ fontSize: 12, color: "#A16207", fontStyle: "italic", marginBottom: 8 }}>
            {article.businessIdeaDetails}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "#A16207" }}>
            {article.source} · {timeAgo(article.publishedAt)}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#92400E" }}>
            Read more →
          </span>
        </div>
      </div>
    </a>
  );
}

// ============================================================================
// News Article Card
// ============================================================================

function NewsCard({ article }: { article: NewsArticle }) {
  const catColors = CATEGORY_COLORS[article.category] || { text: colors.accent, bg: colors.borderLt };

  return (
    <a
      href={article.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: "none", display: "block" }}
    >
      <div
        style={{
          background: colors.surface,
          borderRadius: 12,
          border: `1px solid ${colors.border}`,
          overflow: "hidden",
          cursor: "pointer",
          transition: "box-shadow 0.2s, transform 0.2s",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
          e.currentTarget.style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        {article.imageUrl && (
          <div
            style={{
              width: "100%",
              height: 160,
              backgroundImage: `url(${article.imageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              position: "relative",
            }}
          >
            {article.featured && (
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  background: "#F59E0B",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 6,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Featured
              </div>
            )}
          </div>
        )}
        <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: catColors.text,
                background: catColors.bg,
                padding: "3px 10px",
                borderRadius: 10,
                textTransform: "capitalize",
              }}
            >
              {article.category}
            </span>
            {!article.imageUrl && article.featured && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#F59E0B",
                  background: "#FFFBEB",
                  padding: "3px 8px",
                  borderRadius: 6,
                }}
              >
                Featured
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: colors.text,
              marginBottom: 6,
              lineHeight: 1.35,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {article.title}
          </div>
          <div
            style={{
              fontSize: 13,
              color: colors.textSoft,
              lineHeight: 1.5,
              marginBottom: 12,
              flex: 1,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {article.excerpt}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: colors.textMuted }}>
              {article.source} · {timeAgo(article.publishedAt)}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: colors.accent }}>
              Read →
            </span>
          </div>
          {article.tags && article.tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10 }}>
              {article.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: 11,
                    color: colors.textMuted,
                    background: colors.borderLt,
                    padding: "2px 8px",
                    borderRadius: 8,
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </a>
  );
}

// ============================================================================
// Right Sidebar
// ============================================================================

function NewsRightSidebar({
  trendingTags,
  onTagClick,
}: {
  trendingTags: { tag: string; count: number }[];
  onTagClick: (tag: string) => void;
}) {
  return (
    <>
      {/* About section */}
      <div
        style={{
          background: colors.surface,
          borderRadius: 12,
          border: `1px solid ${colors.border}`,
          overflow: "hidden",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: `1px solid ${colors.borderLt}`,
            fontSize: 14,
            fontWeight: 700,
            color: colors.text,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Icon name="document" size={16} color={colors.accent} />
          Quick Links
        </div>
        {[
          { label: "Browse Jobs", href: "/careers" },
          { label: "Scholarships", href: "/education" },
          { label: "Events", href: "/community" },
          { label: "Organizations", href: "/organizations" },
        ].map((link, i) => (
          <Link
            key={i}
            href={link.href}
            style={{
              display: "block",
              padding: "10px 16px",
              fontSize: 13,
              color: colors.accent,
              textDecoration: "none",
              borderBottom: `1px solid ${colors.borderLt}`,
            }}
          >
            {link.label} →
          </Link>
        ))}
      </div>

      {/* Trending Tags */}
      {trendingTags.length > 0 && (
        <div
          style={{
            background: colors.surface,
            borderRadius: 12,
            border: `1px solid ${colors.border}`,
            overflow: "hidden",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: `1px solid ${colors.borderLt}`,
              fontSize: 14,
              fontWeight: 700,
              color: colors.text,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            🔥 Trending Topics
          </div>
          <div style={{ padding: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {trendingTags.slice(0, 15).map(({ tag, count }) => (
              <button
                key={tag}
                onClick={() => onTagClick(tag)}
                style={{
                  fontSize: 12,
                  color: colors.accent,
                  background: colors.borderLt,
                  padding: "5px 12px",
                  borderRadius: 16,
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#E2E8F0")}
                onMouseLeave={(e) => (e.currentTarget.style.background = colors.borderLt)}
              >
                #{tag} <span style={{ color: colors.textMuted, marginLeft: 2 }}>({count})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div
        style={{
          background: `linear-gradient(135deg, ${colors.accent}, #0F766E)`,
          borderRadius: 12,
          padding: 20,
          color: "#fff",
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
          Share a Story
        </div>
        <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 14, lineHeight: 1.5 }}>
          Know of positive Indigenous news? Help us grow this resource for the community.
        </div>
        <a
          href="mailto:news@iopps.ca"
          style={{
            display: "inline-block",
            background: "#fff",
            color: colors.accent,
            fontSize: 13,
            fontWeight: 700,
            padding: "8px 16px",
            borderRadius: 8,
            textDecoration: "none",
          }}
        >
          Submit a Tip →
        </a>
      </div>
    </>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function NewsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [businessIdea, setBusinessIdea] = useState<NewsArticle | null>(null);
  const [trendingTags, setTrendingTags] = useState<{ tag: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const [articlesData, ideaData, tagsData] = await Promise.all([
        listNewsArticles({
          category: activeTab === "all" ? "all" : activeTab,
          status: "published",
          limitCount: 50,
        }),
        activeTab === "all" ? getDailyBusinessIdea() : Promise.resolve(null),
        getNewsTags(),
      ]);

      // Exclude business idea from main grid if it's showing in the spotlight
      let filtered = articlesData;
      if (ideaData) {
        filtered = articlesData.filter((a) => a.id !== ideaData.id);
      }

      setArticles(filtered);
      setBusinessIdea(ideaData);
      setTrendingTags(tagsData);
    } catch (err) {
      console.error("Error loading news:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Filter by tag if one is selected
  const displayedArticles = tagFilter
    ? articles.filter((a) => a.tags?.includes(tagFilter))
    : articles;

  const handleTagClick = (tag: string) => {
    setTagFilter((prev) => (prev === tag ? null : tag));
  };

  return (
    <FeedLayout
      rightSidebar={
        <NewsRightSidebar
          trendingTags={trendingTags}
          onTagClick={handleTagClick}
        />
      }
      showFab={false}
    >
      <SectionHeader
        title="Indigenous News"
        subtitle="Curated stories celebrating Indigenous achievement, culture, and community across Turtle Island"
        icon="📰"
        count={displayedArticles.length}
      />

      {/* Category Tabs */}
      <div
        style={{
          background: colors.surface,
          borderRadius: 12,
          border: `1px solid ${colors.border}`,
          marginBottom: 16,
          padding: "4px 8px",
          display: "flex",
          gap: 2,
          overflowX: "auto",
        }}
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeTab === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveTab(cat.id);
                setTagFilter(null);
              }}
              style={{
                flex: "0 0 auto",
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? colors.accent : colors.textSoft,
                background: isActive ? colors.borderLt : "transparent",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap",
              }}
            >
              <span>{cat.emoji}</span>
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Active tag filter indicator */}
      {tagFilter && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
            padding: "8px 14px",
            background: colors.surface,
            borderRadius: 8,
            border: `1px solid ${colors.border}`,
            fontSize: 13,
          }}
        >
          <span style={{ color: colors.textSoft }}>Filtering by</span>
          <span style={{ fontWeight: 600, color: colors.accent }}>#{tagFilter}</span>
          <button
            onClick={() => setTagFilter(null)}
            style={{
              marginLeft: "auto",
              fontSize: 12,
              color: colors.textMuted,
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            Clear ✕
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <>
          {activeTab === "all" && <BusinessIdeaSkeleton />}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <ArticleSkeleton key={i} />
            ))}
          </div>
        </>
      )}

      {/* Content */}
      {!loading && (
        <>
          {/* Daily Business Idea Spotlight */}
          {businessIdea && activeTab === "all" && (
            <BusinessIdeaCard article={businessIdea} />
          )}

          {/* Articles Grid */}
          {displayedArticles.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 16,
              }}
            >
              {displayedArticles.map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div
              style={{
                background: colors.surface,
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                padding: "48px 24px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>📰</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: colors.text, marginBottom: 6 }}>
                No articles yet
              </div>
              <div style={{ fontSize: 13, color: colors.textSoft }}>
                {tagFilter
                  ? `No articles found with tag "${tagFilter}". Try clearing the filter.`
                  : activeTab !== "all"
                  ? `No ${activeTab} articles published yet. Check back soon!`
                  : "Indigenous news articles will appear here once published."}
              </div>
            </div>
          )}

          {/* Mobile Trending Tags (shown below articles on mobile) */}
          {trendingTags.length > 0 && (
            <div
              className="md:hidden"
              style={{
                background: colors.surface,
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                marginTop: 16,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "14px 16px",
                  borderBottom: `1px solid ${colors.borderLt}`,
                  fontSize: 14,
                  fontWeight: 700,
                  color: colors.text,
                }}
              >
                🔥 Trending Topics
              </div>
              <div style={{ padding: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {trendingTags.slice(0, 10).map(({ tag, count }) => (
                  <button
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                    style={{
                      fontSize: 12,
                      color: tagFilter === tag ? "#fff" : colors.accent,
                      background: tagFilter === tag ? colors.accent : colors.borderLt,
                      padding: "5px 12px",
                      borderRadius: 16,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </FeedLayout>
  );
}
