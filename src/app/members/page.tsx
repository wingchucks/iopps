"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import Card from "@/components/Card";
import { getAllMembers, type MemberProfile } from "@/lib/firestore/members";

const communityFilters = [
  "All",
  "First Nations",
  "M\u00e9tis",
  "Inuit",
  "Non-Indigenous Ally",
];

export default function MembersPage() {
  return (
    <ProtectedRoute>
      <AppShell>
      <div className="min-h-screen bg-bg">
        <MembersContent />
      </div>
    </AppShell>
    </ProtectedRoute>
  );
}

function MembersContent() {
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const { user } = useAuth();

  useEffect(() => {
    async function load() {
      try {
        const data = await getAllMembers();
        setMembers(data);
      } catch (err) {
        console.error("Failed to load members:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = members;

    // Exclude current user from the directory
    if (user) {
      result = result.filter((m) => m.uid !== user.uid);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.displayName.toLowerCase().includes(q) ||
          m.community.toLowerCase().includes(q) ||
          m.location.toLowerCase().includes(q) ||
          m.interests.some((i) => i.toLowerCase().includes(q))
      );
    }

    // Community filter
    if (activeFilter !== "All") {
      const f = activeFilter.toLowerCase();
      result = result.filter((m) => m.community.toLowerCase().includes(f));
    }

    return result;
  }, [members, search, activeFilter, user]);

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-6 md:px-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-text mb-1">
          Member Directory
        </h1>
        <p className="text-sm text-text-sec">
          Connect with {members.length} community members across the IOPPS
          network
        </p>
      </div>

      {/* Search bar */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, community, or location..."
          className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal"
          style={{ maxWidth: 480 }}
        />
      </div>

      {/* Filter chips */}
      <div
        className="flex gap-2 mb-6 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none" }}
      >
        {communityFilters.map((f) => (
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

      {/* Result count */}
      {!loading && (search || activeFilter !== "All") && (
        <p className="text-sm text-text-muted mb-4">
          {filtered.length} member{filtered.length !== 1 ? "s" : ""} found
          {search && <> for &quot;{search}&quot;</>}
        </p>
      )}

      {/* Members grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton h-[200px] rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card style={{ padding: 40, textAlign: "center" }}>
          <p className="text-3xl mb-2">&#128100;</p>
          <p className="text-sm font-bold text-text mb-1">
            {search || activeFilter !== "All"
              ? "No members found"
              : "No members yet"}
          </p>
          <p className="text-sm text-text-muted">
            {search || activeFilter !== "All"
              ? "Try adjusting your search or filter to find community members."
              : "Be the first to join the IOPPS community!"}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((member) => (
            <MemberCard key={member.uid} member={member} />
          ))}
        </div>
      )}
    </div>
  );
}

function MemberCard({ member }: { member: MemberProfile }) {
  return (
    <Link href={`/members/${member.uid}`} className="no-underline">
      <Card className="h-full hover:shadow-lg transition-shadow">
        <div style={{ padding: 20 }}>
          <div className="flex items-center gap-3 mb-3">
            <Avatar
              name={member.displayName}
              size={48}
              src={member.photoURL}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-text m-0 overflow-hidden text-ellipsis whitespace-nowrap">
                {member.displayName}
              </p>
              {member.community && (
                <p className="text-xs text-teal font-semibold m-0 mt-0.5">
                  {member.community}
                </p>
              )}
            </div>
          </div>

          {member.location && (
            <p className="text-xs text-text-sec mb-2.5 m-0">
              &#128205; {member.location}
            </p>
          )}

          {member.bio && (
            <p
              className="text-xs text-text-sec leading-relaxed mb-3 m-0"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {member.bio}
            </p>
          )}

          {member.interests && member.interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {member.interests.slice(0, 3).map((interest) => (
                <span
                  key={interest}
                  className="text-[11px] font-semibold rounded-full text-teal"
                  style={{
                    padding: "3px 10px",
                    background: "rgba(13,148,136,.08)",
                    border: "1px solid rgba(13,148,136,.12)",
                  }}
                >
                  {interest}
                </span>
              ))}
              {member.interests.length > 3 && (
                <span
                  className="text-[11px] font-semibold rounded-full text-text-muted"
                  style={{
                    padding: "3px 10px",
                    background: "var(--border)",
                  }}
                >
                  +{member.interests.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
