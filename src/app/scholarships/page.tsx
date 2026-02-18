"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import { getPosts, type Post } from "@/lib/firestore/posts";
import { displayLocation } from "@/lib/utils";

export default function ScholarshipsBrowsePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [eligibilityFilter, setEligibilityFilter] = useState("");
  const [closingSoonOnly, setClosingSoonOnly] = useState(false);

  useEffect(() => {
    getPosts({ type: "scholarship" })
      .then(setPosts)
      .catch((err) => console.error("Failed to load scholarships:", err))
      .finally(() => setLoading(false));
  }, []);

  const eligibilities = useMemo(
    () =>
      [...new Set(posts.map((p) => p.eligibility).filter(Boolean))] as string[],
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
          p.eligibility?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }
    if (eligibilityFilter) {
      result = result.filter((p) => p.eligibility === eligibilityFilter);
    }
    if (closingSoonOnly) {
      result = result.filter((p) => p.closingSoon);
    }
    return result;
  }, [posts, search, eligibilityFilter, closingSoonOnly]);

  return (
    <div className="min-h-screen bg-bg">
      <NavBar />

      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, var(--gold), var(--navy))",
          padding: "clamp(32px, 5vw, 64px) clamp(16px, 4vw, 40px)",
        }}
      >
        <div className="max-w-[1200px] mx-auto text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-3">
            Scholarships
          </h1>
          <p
            className="text-base sm:text-lg max-w-[600px] mx-auto mb-0"
            style={{ color: "rgba(255,255,255,.75)" }}
          >
            Financial support for Indigenous students and learners
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-[1200px] mx-auto px-4 md:px-10 py-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Search scholarships..."
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
            value={eligibilityFilter}
            onChange={(e) => setEligibilityFilter(e.target.value)}
            className="px-4 py-3 rounded-xl text-sm font-medium cursor-pointer"
            style={{
              background: "var(--card)",
              border: "1.5px solid var(--border)",
              color: "var(--text)",
            }}
          >
            <option value="">All Eligibility</option>
            {eligibilities.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          <button
            onClick={() => setClosingSoonOnly(!closingSoonOnly)}
            className="px-4 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all"
            style={{
              background: closingSoonOnly ? "var(--gold)" : "var(--card)",
              border: closingSoonOnly
                ? "1.5px solid var(--gold)"
                : "1.5px solid var(--border)",
              color: closingSoonOnly ? "#fff" : "var(--text)",
            }}
          >
            &#9200; Closing Soon
          </button>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-[280px] rounded-2xl" />
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
            <h2 className="text-xl font-extrabold text-text mb-2">
              No Scholarships Found
            </h2>
            <p className="text-sm text-text-sec mb-6">
              {search || eligibilityFilter || closingSoonOnly
                ? "Try adjusting your filters to find more scholarships."
                : "There are no scholarships listed right now. Check back soon!"}
            </p>
            <Link
              href="/feed"
              className="inline-block px-6 py-3 rounded-xl text-sm font-bold text-white no-underline"
              style={{ background: "var(--gold)" }}
            >
              Back to Feed
            </Link>
          </div>
        )}

        {/* Scholarships Grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((post) => {
              const slug = post.id.replace(/^scholarship-/, "");

              return (
                <Link
                  key={post.id}
                  href={`/scholarships/${slug}`}
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
                      style={{ background: "var(--gold)" }}
                    />
                    <div className="p-5 flex-1 flex flex-col">
                      {/* Amount badge + closing soon */}
                      <div className="flex items-center gap-2 mb-3">
                        {post.amount && (
                          <span
                            className="inline-block text-sm font-extrabold rounded-xl px-3 py-1.5"
                            style={{
                              color: "var(--gold)",
                              background: "var(--gold-soft)",
                            }}
                          >
                            {post.amount}
                          </span>
                        )}
                        {post.closingSoon && (
                          <span
                            className="inline-block text-[10px] font-bold rounded-lg px-2 py-1"
                            style={{
                              color: "var(--red)",
                              background: "var(--red-soft)",
                            }}
                          >
                            Closing Soon
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-[15px] font-bold text-text m-0 mb-2 line-clamp-2 group-hover:text-gold transition-colors">
                        {post.title}
                      </h3>

                      {/* Org */}
                      {post.orgName && (
                        <p className="text-xs text-text-sec m-0 mb-2">
                          {post.orgName}
                        </p>
                      )}

                      {/* Eligibility snippet */}
                      {post.eligibility && (
                        <p className="text-xs text-text-muted m-0 mb-3 line-clamp-2 leading-relaxed">
                          {post.eligibility}
                        </p>
                      )}

                      {/* Details */}
                      <div className="flex flex-col gap-1.5 mt-auto">
                        {post.deadline && (
                          <p className="text-xs text-text-sec m-0 flex items-center gap-1.5">
                            <span>&#128197;</span> Deadline: {post.deadline}
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
                          style={{ color: "var(--gold)" }}
                        >
                          Apply &#8594;
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
