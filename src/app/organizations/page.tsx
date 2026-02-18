"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import Card from "@/components/Card";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import { getOrganizations, type Organization } from "@/lib/firestore/organizations";

const typeFilters = ["All", "Employer", "School", "Non-Profit", "Government", "Business"];

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

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  useEffect(() => {
    async function load() {
      try {
        const data = await getOrganizations();
        setOrgs(data);
      } catch (err) {
        console.error("Failed to load organizations:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = orgs;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.shortName?.toLowerCase().includes(q) ||
          o.description?.toLowerCase().includes(q) ||
          displayLocation(o.location).toLowerCase().includes(q) ||
          o.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (activeFilter !== "All") {
      const f = activeFilter.toLowerCase();
      result = result.filter((o) => o.type?.toLowerCase() === f);
    }

    return result;
  }, [orgs, search, activeFilter]);

  return (
    <div className="min-h-screen bg-bg">
      <NavBar />

      {/* Hero */}
      <section
        className="text-center"
        style={{
          background: "linear-gradient(160deg, var(--blue) 0%, var(--navy) 60%, var(--navy-light) 100%)",
          padding: "clamp(32px, 5vw, 60px) clamp(20px, 6vw, 80px)",
        }}
      >
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Organizations</h1>
        <p className="text-base text-white/70 mb-0 max-w-[520px] mx-auto">
          Discover Indigenous and allied organizations across Canada
        </p>
      </section>

      <div className="max-w-[1100px] mx-auto px-4 py-6 md:px-10">
        {/* Search bar */}
        <div
          className="flex items-center gap-3 rounded-2xl mb-4"
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
            placeholder="Search organizations by name, location, or industry..."
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

        {/* Filter chips */}
        <div
          className="flex gap-2 mb-6 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {typeFilters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="px-4 py-2 rounded-full border-none whitespace-nowrap font-semibold text-[13px] cursor-pointer transition-colors"
              style={{
                background: activeFilter === f ? "var(--navy)" : "var(--border)",
                color: activeFilter === f ? "#fff" : "var(--text-sec)",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-sm text-text-muted mb-4">
            {filtered.length} organization{filtered.length !== 1 ? "s" : ""} found
          </p>
        )}

        {/* Orgs grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton h-[220px] rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card style={{ padding: 48, textAlign: "center" }}>
            <p className="text-4xl mb-3">&#127970;</p>
            <h3 className="text-lg font-bold text-text mb-2">No organizations found</h3>
            <p className="text-sm text-text-muted max-w-[400px] mx-auto">
              {search || activeFilter !== "All"
                ? "Try adjusting your search or filter."
                : "Organizations will appear here once added."}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((org) => (
              <OrgCard key={org.id} org={org} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OrgCard({ org }: { org: Organization }) {
  const location = displayLocation(org.location);
  const typeLabel =
    org.type === "employer"
      ? "Employer"
      : org.type === "school"
        ? "Education"
        : org.type === "non-profit"
          ? "Non-Profit"
          : org.type === "government"
            ? "Government"
            : "Business";

  return (
    <Link href={`/org/${org.id}`} className="no-underline">
      <Card className="h-full hover:shadow-lg transition-shadow">
        <div style={{ padding: 20 }}>
          <div className="flex items-center gap-3 mb-3">
            <Avatar
              name={org.shortName || org.name}
              size={48}
              src={org.logo}
              gradient={
                org.type === "school"
                  ? "linear-gradient(135deg, var(--teal), var(--blue))"
                  : "linear-gradient(135deg, var(--navy), var(--blue))"
              }
            />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-text m-0 overflow-hidden text-ellipsis whitespace-nowrap">
                {org.name}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge
                  text={typeLabel}
                  color={org.type === "school" ? "var(--teal)" : "var(--blue)"}
                  bg={org.type === "school" ? "var(--teal-soft)" : "var(--blue-soft)"}
                  small
                />
                {org.verified && (
                  <span className="text-[11px] font-semibold" style={{ color: "var(--teal)" }}>
                    &#10003; Verified
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

          {org.description && (
            <p
              className="text-xs text-text-sec leading-relaxed mb-3 m-0"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {org.description}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5">
            {org.tags?.slice(0, 3).map((tag) => (
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
            {org.tags && org.tags.length > 3 && (
              <span
                className="text-[11px] font-semibold rounded-full text-text-muted"
                style={{
                  padding: "3px 10px",
                  background: "var(--border)",
                }}
              >
                +{org.tags.length - 3}
              </span>
            )}
          </div>

          {org.openJobs > 0 && (
            <p className="text-xs font-semibold mt-3 mb-0" style={{ color: "var(--blue)" }}>
              {org.openJobs} open position{org.openJobs !== 1 ? "s" : ""} &#8594;
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}
