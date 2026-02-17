"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import { getPosts, type Post } from "@/lib/firestore/posts";
import { getOrganizations, type Organization } from "@/lib/firestore/organizations";

const typeFilters = ["All", "Jobs", "Events", "Scholarships", "Programs", "Organizations", "Stories"];

export default function SearchPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <SearchContent />
      </div>
    </ProtectedRoute>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [typeFilter, setTypeFilter] = useState("All");
  const [posts, setPosts] = useState<Post[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [p, o] = await Promise.all([getPosts(), getOrganizations()]);
        setPosts(p);
        setOrgs(o);
      } catch (err) {
        console.error("Failed to load search data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setQuery(q);
  }, [searchParams]);

  const q = query.toLowerCase().trim();

  const filteredPosts = useMemo(() => {
    if (!q) return [];
    return posts.filter((p) => {
      const text = [p.title, p.orgName, p.orgShort, p.location, p.description, p.jobType, p.eventType, p.community, p.salary]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(q);
    });
  }, [posts, q]);

  const filteredOrgs = useMemo(() => {
    if (!q) return [];
    return orgs.filter((o) => {
      const text = [o.name, o.shortName, o.location, o.description, ...o.tags]
        .join(" ")
        .toLowerCase();
      return text.includes(q);
    });
  }, [orgs, q]);

  const typeFilteredPosts = useMemo(() => {
    if (typeFilter === "All" || typeFilter === "Organizations") return filteredPosts;
    const typeMap: Record<string, string> = { Jobs: "job", Events: "event", Scholarships: "scholarship", Programs: "program", Stories: "story" };
    const t = typeMap[typeFilter];
    return t ? filteredPosts.filter((p) => p.type === t) : filteredPosts;
  }, [filteredPosts, typeFilter]);

  const showOrgs = typeFilter === "All" || typeFilter === "Organizations";
  const totalResults = typeFilteredPosts.length + (showOrgs ? filteredOrgs.length : 0);

  return (
    <div className="max-w-[800px] mx-auto px-4 py-6 md:px-10 md:py-8">
      {/* Search Input */}
      <div className="mb-6">
        <div
          className="flex items-center gap-3 rounded-2xl"
          style={{
            padding: "14px 20px",
            background: "var(--card)",
            border: "2px solid var(--border)",
          }}
        >
          <span className="text-xl text-text-muted">&#128269;</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search jobs, events, organizations, programs..."
            className="flex-1 border-none outline-none bg-transparent text-text text-base"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-text-muted text-lg border-none bg-transparent cursor-pointer"
            >
              &#10005;
            </button>
          )}
        </div>
      </div>

      {/* Type Filters */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {typeFilters.map((f) => (
          <button
            key={f}
            onClick={() => setTypeFilter(f)}
            className="px-4 py-2 rounded-full border-none whitespace-nowrap font-semibold text-[13px] cursor-pointer transition-colors"
            style={{
              background: typeFilter === f ? "var(--navy)" : "var(--border)",
              color: typeFilter === f ? "#fff" : "var(--text-sec)",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-[80px] rounded-2xl" />
          ))}
        </div>
      ) : !q ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">&#128269;</p>
          <h2 className="text-xl font-bold text-text mb-2">Search IOPPS</h2>
          <p className="text-text-sec text-sm">Find jobs, events, programs, and organizations</p>
        </div>
      ) : totalResults === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">&#128533;</p>
          <h2 className="text-xl font-bold text-text mb-2">No results for &ldquo;{query}&rdquo;</h2>
          <p className="text-text-sec text-sm">Try different keywords or browse the feed</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-text-muted mb-4">
            {totalResults} result{totalResults !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
          </p>

          {/* Organization Results */}
          {showOrgs && filteredOrgs.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-bold text-text-muted tracking-[1px] mb-3">ORGANIZATIONS</p>
              <div className="flex flex-col gap-2">
                {filteredOrgs.map((org) => (
                  <Link
                    key={org.id}
                    href={`/${org.type === "school" ? "schools" : "org"}/${org.id}`}
                    className="no-underline"
                  >
                    <Card className="cursor-pointer">
                      <div className="flex gap-3 items-center" style={{ padding: "14px 16px" }}>
                        <Avatar
                          name={org.shortName}
                          size={40}
                          gradient={org.type === "school" ? "linear-gradient(135deg, var(--teal), var(--blue))" : undefined}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="text-sm font-bold text-text m-0 overflow-hidden text-ellipsis whitespace-nowrap">
                              {org.name}
                            </h3>
                            <Badge
                              text={org.tier === "school" ? "Education" : "Premium"}
                              color={org.tier === "school" ? "var(--teal)" : "var(--gold)"}
                              bg={org.tier === "school" ? "var(--teal-soft)" : "var(--gold-soft)"}
                              small
                            />
                          </div>
                          <p className="text-xs text-text-sec m-0">
                            &#128205; {org.location} &bull; {org.openJobs} open jobs
                          </p>
                        </div>
                        <span className="text-text-muted">&#8250;</span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Post Results */}
          {typeFilteredPosts.length > 0 && (
            <div>
              {showOrgs && filteredOrgs.length > 0 && (
                <p className="text-xs font-bold text-text-muted tracking-[1px] mb-3">POSTS</p>
              )}
              <div className="flex flex-col gap-2">
                {typeFilteredPosts.map((post) => (
                  <SearchResultCard key={post.id} post={post} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SearchResultCard({ post }: { post: Post }) {
  const slug = post.id.replace(/^(job|event|scholarship|program|spotlight|story)-/, "");

  const typeConfig: Record<string, { label: string; color: string; bg: string; href: string }> = {
    job: { label: "Job", color: "var(--blue)", bg: "var(--blue-soft)", href: `/jobs/${slug}` },
    event: { label: "Event", color: "var(--gold)", bg: "var(--gold-soft)", href: `/events/${slug}` },
    scholarship: { label: "Scholarship", color: "var(--green)", bg: "var(--green-soft)", href: `/scholarships/${slug}` },
    program: { label: "Program", color: "var(--teal)", bg: "var(--teal-soft)", href: `/feed` },
    spotlight: { label: "Spotlight", color: "var(--gold)", bg: "var(--gold-soft)", href: post.orgId ? `/org/${post.orgId}` : `/feed` },
    story: { label: "Story", color: "var(--green)", bg: "var(--green-soft)", href: `/feed` },
  };

  const config = typeConfig[post.type] || { label: post.type, color: "var(--text-sec)", bg: "var(--border)", href: "#" };

  return (
    <Link href={config.href} className="no-underline">
      <Card className="cursor-pointer">
        <div className="flex gap-3 items-center" style={{ padding: "14px 16px" }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge text={config.label} color={config.color} bg={config.bg} small />
              {post.featured && (
                <Badge text="Featured" color="var(--gold)" bg="var(--gold-soft)" small />
              )}
            </div>
            <h3 className="text-sm font-bold text-text m-0 mb-0.5">{post.title}</h3>
            <div className="flex flex-wrap gap-2 text-xs text-text-sec">
              {post.orgName && <span>{post.orgName}</span>}
              {post.location && <span>&#128205; {post.location}</span>}
              {post.jobType && <span>{post.jobType}</span>}
              {post.salary && <span>{post.salary}</span>}
              {post.amount && <span>&#128176; {post.amount}</span>}
              {post.dates && <span>&#128197; {post.dates}</span>}
              {post.deadline && <span>&#128197; {post.deadline}</span>}
              {post.duration && <span>{post.duration}</span>}
            </div>
          </div>
          <span className="text-text-muted">&#8250;</span>
        </div>
      </Card>
    </Link>
  );
}
