"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import Card from "@/components/Card";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import { getOrganizations, type Organization } from "@/lib/firestore/organizations";

/** Safely convert a location field to a display string. */
function displayLocation(loc: unknown): string {
  if (!loc) return "";
  if (typeof loc === "string") return loc;
  if (typeof loc === "object" && loc !== null) {
    const obj = loc as Record<string, unknown>;
    const parts = [obj.city, obj.province].filter(Boolean).map(String);
    return parts.join(", ");
  }
  return String(loc);
}

export default function SchoolsPage() {
  const [schools, setSchools] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const all = await getOrganizations();
        setSchools(all.filter((o) => o.type === "school" || o.tier === "school"));
      } catch (err) {
        console.error("Failed to load schools:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return schools;
    const q = search.toLowerCase();
    return schools.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.shortName?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        displayLocation(s.location).toLowerCase().includes(q) ||
        s.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }, [schools, search]);

  return (
    <div className="min-h-screen bg-bg">
      <NavBar />

      {/* Hero */}
      <section
        className="text-center"
        style={{
          background: "linear-gradient(160deg, var(--teal) 0%, var(--navy) 60%, var(--navy-light) 100%)",
          padding: "clamp(32px, 5vw, 60px) clamp(20px, 6vw, 80px)",
        }}
      >
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Schools</h1>
        <p className="text-base text-white/70 mb-0 max-w-[520px] mx-auto">
          Explore Indigenous-focused educational institutions and training partners
        </p>
      </section>

      <div className="max-w-[1100px] mx-auto px-4 py-6 md:px-10">
        {/* Search bar */}
        <div
          className="flex items-center gap-3 rounded-2xl mb-6"
          style={{
            padding: "14px 20px",
            background: "var(--card)",
            border: "2px solid var(--border)",
          }}
        >
          <span className="text-xl text-text-muted">&#128269;</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search schools by name, location, or program..."
            className="flex-1 border-none outline-none bg-transparent text-text text-base"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-text-muted text-lg border-none bg-transparent cursor-pointer"
            >
              &#10005;
            </button>
          )}
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-sm text-text-muted mb-4">
            {filtered.length} school{filtered.length !== 1 ? "s" : ""} found
          </p>
        )}

        {/* Schools grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-[200px] rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card style={{ padding: 48, textAlign: "center" }}>
            <p className="text-4xl mb-3">&#127979;</p>
            <h3 className="text-lg font-bold text-text mb-2">No schools found</h3>
            <p className="text-sm text-text-muted max-w-[400px] mx-auto">
              {search
                ? "Try adjusting your search."
                : "Educational institutions will appear here once added."}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((school) => (
              <SchoolCard key={school.id} school={school} />
            ))}
          </div>
        )}

        {/* Browse all link */}
        <div className="text-center mt-8">
          <Link
            href="/education"
            className="text-sm font-semibold no-underline hover:underline"
            style={{ color: "var(--teal)" }}
          >
            Explore more education resources &#8594;
          </Link>
        </div>
      </div>
    </div>
  );
}

function SchoolCard({ school }: { school: Organization }) {
  const location = displayLocation(school.location);

  return (
    <Link href={`/schools/${school.id}`} className="no-underline">
      <Card className="h-full hover:shadow-lg transition-shadow">
        <div style={{ padding: 20 }}>
          <div className="flex items-center gap-3 mb-3">
            <Avatar
              name={school.shortName || school.name}
              size={52}
              src={school.logo}
              gradient="linear-gradient(135deg, var(--teal), var(--blue))"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-text m-0 overflow-hidden text-ellipsis whitespace-nowrap">
                {school.name}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge text="Education Partner" color="var(--teal)" bg="var(--teal-soft)" small />
                {school.verified && (
                  <span className="text-[11px] font-semibold" style={{ color: "var(--teal)" }}>
                    &#10003;
                  </span>
                )}
              </div>
            </div>
          </div>

          {location && (
            <p className="text-xs text-text-sec mb-2.5 m-0">
              &#128205; {location}
            </p>
          )}

          {school.description && (
            <p
              className="text-xs text-text-sec leading-relaxed mb-3 m-0"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {school.description}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5 mb-3">
            {school.tags?.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[11px] font-semibold rounded-full text-teal"
                style={{
                  padding: "3px 10px",
                  background: "rgba(13,148,136,.08)",
                  border: "1px solid rgba(13,148,136,.12)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between">
            {school.openJobs > 0 && (
              <span className="text-xs font-semibold" style={{ color: "var(--blue)" }}>
                {school.openJobs} open position{school.openJobs !== 1 ? "s" : ""}
              </span>
            )}
            <span className="text-xs font-semibold" style={{ color: "var(--teal)" }}>
              View School &#8594;
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
