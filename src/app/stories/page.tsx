"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import { getPosts, type Post } from "@/lib/firestore/posts";
import { displayLocation } from "@/lib/utils";

type TabFilter = "all" | "story" | "spotlight";

export default function StoriesBrowsePage() {
  const [stories, setStories] = useState<Post[]>([]);
  const [spotlights, setSpotlights] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabFilter>("all");

  useEffect(() => {
    Promise.all([
      getPosts({ type: "story" }),
      getPosts({ type: "spotlight" }),
    ])
      .then(([s, sp]) => {
        setStories(s);
        setSpotlights(sp);
      })
      .catch((err) => console.error("Failed to load stories:", err))
      .finally(() => setLoading(false));
  }, []);

  const allPosts = useMemo(() => [...stories, ...spotlights], [stories, spotlights]);

  const filtered = useMemo(() => {
    let result =
      tab === "all"
        ? allPosts
        : tab === "story"
          ? stories
          : spotlights;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.author?.toLowerCase().includes(q) ||
          p.orgName?.toLowerCase().includes(q) ||
          p.community?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.excerpt?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allPosts, stories, spotlights, search, tab]);

  const tabs: { key: TabFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "story", label: "Stories" },
    { key: "spotlight", label: "Spotlights" },
  ];

  return (
    <div className="min-h-screen bg-bg">
      <NavBar />

      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, var(--teal), var(--navy))",
          padding: "clamp(32px, 5vw, 64px) clamp(16px, 4vw, 40px)",
        }}
      >
        <div className="max-w-[1200px] mx-auto text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-3">
            Stories &amp; Spotlights
          </h1>
          <p
            className="text-base sm:text-lg max-w-[600px] mx-auto mb-0"
            style={{ color: "rgba(255,255,255,.75)" }}
          >
            Celebrating Indigenous success and community voices
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-[1200px] mx-auto px-4 md:px-10 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all"
              style={{
                background:
                  tab === key ? "var(--teal)" : "var(--card)",
                color: tab === key ? "#fff" : "var(--text-sec)",
                border:
                  tab === key
                    ? "1.5px solid var(--teal)"
                    : "1.5px solid var(--border)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search stories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm font-medium"
            style={{
              background: "var(--card)",
              border: "1.5px solid var(--border)",
              color: "var(--text)",
              outline: "none",
            }}
          />
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-[320px] rounded-2xl" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div
            className="rounded-2xl text-center py-16 px-6"
            style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}
          >
            <p className="text-5xl mb-4">&#128214;</p>
            <h2 className="text-xl font-extrabold text-text mb-2">
              No Stories Found
            </h2>
            <p className="text-sm text-text-sec mb-6">
              {search
                ? "Try adjusting your search to find more stories."
                : "There are no stories listed right now. Check back soon!"}
            </p>
            <Link
              href="/feed"
              className="inline-block px-6 py-3 rounded-xl text-sm font-bold text-white no-underline"
              style={{ background: "var(--teal)" }}
            >
              Back to Feed
            </Link>
          </div>
        )}

        {/* Stories Grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((post) => {
              const slug = post.id.replace(/^(story|spotlight)-/, "");
              const isSpotlight = post.type === "spotlight";
              const accentColor = isSpotlight
                ? "var(--gold)"
                : "var(--teal)";
              const softColor = isSpotlight
                ? "var(--gold-soft)"
                : "var(--teal-soft)";

              return (
                <Link
                  key={post.id}
                  href={`/stories/${slug}`}
                  className="no-underline group"
                >
                  <div
                    className="rounded-2xl overflow-hidden transition-all duration-200 h-full flex flex-col"
                    style={{
                      background: "var(--card)",
                      border: "1.5px solid var(--border)",
                    }}
                  >
                    {/* Featured image placeholder */}
                    <div
                      className="relative flex items-center justify-center"
                      style={{
                        height: 140,
                        background: isSpotlight
                          ? "linear-gradient(135deg, rgba(217,119,6,.12), rgba(15,43,76,.08))"
                          : "linear-gradient(135deg, rgba(13,148,136,.12), rgba(5,150,105,.08))",
                      }}
                    >
                      <span className="text-4xl">
                        {isSpotlight ? <>&#127775;</> : <>&#128214;</>}
                      </span>
                      {/* Type badge */}
                      <span
                        className="absolute top-3 left-3 text-[10px] font-bold rounded-lg px-2 py-1"
                        style={{
                          color: accentColor,
                          background: softColor,
                        }}
                      >
                        {isSpotlight ? "Spotlight" : "Story"}
                      </span>
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                      {/* Title */}
                      <h3
                        className="text-[15px] font-bold text-text m-0 mb-2 line-clamp-2 transition-colors"
                        style={{ "--tw-line-clamp": 2 } as React.CSSProperties}
                      >
                        {post.title}
                      </h3>

                      {/* Author / Org */}
                      {(post.author || post.orgName) && (
                        <p className="text-xs text-text-sec m-0 mb-2">
                          By {post.author || post.orgName}
                        </p>
                      )}

                      {/* Excerpt */}
                      {(post.excerpt || post.description) && (
                        <p className="text-xs text-text-muted m-0 mb-3 line-clamp-3 leading-relaxed">
                          {post.excerpt || post.description}
                        </p>
                      )}

                      {/* Community */}
                      <div className="flex flex-col gap-1.5 mt-auto">
                        {post.community && (
                          <p className="text-xs text-text-sec m-0 flex items-center gap-1.5">
                            <span>&#127758;</span> {post.community}
                          </p>
                        )}
                        {post.location && (
                          <p className="text-xs text-text-sec m-0 flex items-center gap-1.5">
                            <span>&#128205;</span> {displayLocation(post.location)}
                          </p>
                        )}
                      </div>

                      {/* CTA */}
                      <div className="mt-4 pt-3 border-t border-border">
                        <span
                          className="text-xs font-bold"
                          style={{ color: accentColor }}
                        >
                          Read More &#8594;
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
