"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import { getPosts, type Post } from "@/lib/firestore/posts";

export default function ProgramsBrowsePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    getPosts({ type: "program" })
      .then(setPosts)
      .catch((err) => console.error("Failed to load programs:", err))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(
    () =>
      [
        ...new Set(
          posts.flatMap((p) => p.badges || []).filter(Boolean)
        ),
      ] as string[],
    [posts]
  );

  const filtered = useMemo(() => {
    let result = posts;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.orgName?.toLowerCase().includes(q) ||
          p.location?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }
    if (categoryFilter) {
      result = result.filter((p) => p.badges?.includes(categoryFilter));
    }
    return result;
  }, [posts, search, categoryFilter]);

  return (
    <div className="min-h-screen bg-bg">
      <NavBar />

      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, var(--green), var(--navy))",
          padding: "clamp(32px, 5vw, 64px) clamp(16px, 4vw, 40px)",
        }}
      >
        <div className="max-w-[1200px] mx-auto text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-3">
            Programs
          </h1>
          <p
            className="text-base sm:text-lg max-w-[600px] mx-auto mb-0"
            style={{ color: "rgba(255,255,255,.75)" }}
          >
            Community programs and initiatives across Saskatchewan
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-[1200px] mx-auto px-4 md:px-10 py-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Search programs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium"
            style={{
              background: "var(--card)",
              border: "1.5px solid var(--border)",
              color: "var(--text)",
              outline: "none",
            }}
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-3 rounded-xl text-sm font-medium cursor-pointer"
            style={{
              background: "var(--card)",
              border: "1.5px solid var(--border)",
              color: "var(--text)",
            }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-[240px] rounded-2xl" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div
            className="rounded-2xl text-center py-16 px-6"
            style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}
          >
            <p className="text-5xl mb-4">&#127891;</p>
            <h2 className="text-xl font-extrabold text-text mb-2">No Programs Found</h2>
            <p className="text-sm text-text-sec mb-6">
              {search || categoryFilter
                ? "Try adjusting your filters to find more programs."
                : "There are no programs listed right now. Check back soon!"}
            </p>
            <Link
              href="/feed"
              className="inline-block px-6 py-3 rounded-xl text-sm font-bold text-white no-underline"
              style={{ background: "var(--green)" }}
            >
              Back to Feed
            </Link>
          </div>
        )}

        {/* Programs Grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((post) => {
              const slug = post.id.replace(/^program-/, "");

              return (
                <Link
                  key={post.id}
                  href={`/programs/${slug}`}
                  className="no-underline group"
                >
                  <div
                    className="rounded-2xl overflow-hidden transition-all duration-200 h-full flex flex-col"
                    style={{
                      background: "var(--card)",
                      border: "1.5px solid var(--border)",
                    }}
                  >
                    {/* Top accent bar */}
                    <div
                      className="h-1.5"
                      style={{ background: "var(--green)" }}
                    />
                    <div className="p-5 flex-1 flex flex-col">
                      {/* Org name */}
                      {post.orgName && (
                        <p
                          className="text-[11px] font-bold tracking-[0.5px] m-0 mb-2"
                          style={{ color: "var(--green)" }}
                        >
                          {post.orgName}
                        </p>
                      )}

                      {/* Title */}
                      <h3 className="text-[15px] font-bold text-text m-0 mb-2 line-clamp-2 group-hover:text-green transition-colors">
                        {post.title}
                      </h3>

                      {/* Description snippet */}
                      {post.description && (
                        <p className="text-xs text-text-sec m-0 mb-3 line-clamp-3 leading-relaxed">
                          {post.description}
                        </p>
                      )}

                      {/* Badges */}
                      {post.badges && post.badges.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {post.badges.slice(0, 3).map((b) => (
                            <span
                              key={b}
                              className="text-[10px] font-semibold rounded-lg px-2 py-0.5"
                              style={{
                                color: "var(--green)",
                                background: "var(--green-soft)",
                              }}
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Details */}
                      <div className="flex flex-col gap-1.5 mt-auto">
                        {post.location && (
                          <p className="text-xs text-text-sec m-0 flex items-center gap-1.5">
                            <span>&#128205;</span> {post.location}
                          </p>
                        )}
                        {post.duration && (
                          <p className="text-xs text-text-sec m-0 flex items-center gap-1.5">
                            <span>&#9202;</span> {post.duration}
                          </p>
                        )}
                        {post.credential && (
                          <p className="text-xs text-text-sec m-0 flex items-center gap-1.5">
                            <span>&#127891;</span> {post.credential}
                          </p>
                        )}
                      </div>

                      {/* CTA */}
                      <div className="mt-4 pt-3 border-t border-border">
                        <span
                          className="text-xs font-bold"
                          style={{ color: "var(--green)" }}
                        >
                          Learn More &#8594;
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
