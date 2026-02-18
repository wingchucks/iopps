"use client";

import Card from "@/components/Card";
import Badge from "@/components/Badge";
import type { Application } from "@/lib/firestore/applications";
import type { SavedItem } from "@/lib/firestore/savedItems";

interface FeedRightSidebarProps {
  applications: Application[];
  savedItems: SavedItem[];
}

const trendingTopics = [
  "Remote Work",
  "Youth Programs",
  "Scholarships",
  "Treaty Rights",
  "Trades & Skills",
];

const statusColor: Record<string, string> = {
  submitted: "var(--teal)",
  reviewing: "var(--gold)",
  shortlisted: "var(--blue)",
  interview: "var(--purple)",
  offered: "var(--green)",
  rejected: "var(--red)",
  withdrawn: "var(--text-sec)",
};

export default function FeedRightSidebar({
  applications,
  savedItems,
}: FeedRightSidebarProps) {
  return (
    <aside className="hidden xl:block w-[260px] shrink-0 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
      {/* Your Applications */}
      <Card className="mb-4" style={{ padding: 16 }}>
        <p className="text-xs font-bold text-text-muted mb-2.5 tracking-[1px]">
          YOUR APPLICATIONS
        </p>
        {applications.length === 0 ? (
          <p className="text-xs text-text-muted">
            No applications yet. Apply to jobs to track them here.
          </p>
        ) : (
          applications.slice(0, 3).map((a, i) => {
            const color = statusColor[a.status] || "var(--text-sec)";
            const label = a.status
              .replace("_", " ")
              .replace(/\b\w/g, (c) => c.toUpperCase());
            return (
              <div
                key={a.id}
                className="py-2"
                style={{
                  borderBottom:
                    i < Math.min(applications.length, 3) - 1
                      ? "1px solid var(--border)"
                      : "none",
                }}
              >
                <p className="text-xs font-semibold text-text mb-0.5">
                  {a.postTitle}
                  {a.orgName ? ` \u2014 ${a.orgName}` : ""}
                </p>
                <Badge
                  text={label}
                  color={color}
                  bg={`color-mix(in srgb, ${color} 8%, transparent)`}
                  small
                />
              </div>
            );
          })
        )}
      </Card>

      {/* Trending This Week */}
      <Card className="mb-4" style={{ padding: 16 }}>
        <p className="text-xs font-bold text-text-muted mb-2.5 tracking-[1px]">
          TRENDING THIS WEEK
        </p>
        <div className="flex flex-wrap gap-1.5">
          {trendingTopics.map((topic) => (
            <span
              key={topic}
              className="inline-block text-[11px] font-semibold rounded-full cursor-pointer transition-colors hover:opacity-80"
              style={{
                padding: "4px 10px",
                background:
                  "color-mix(in srgb, var(--teal) 8%, transparent)",
                color: "var(--teal)",
              }}
            >
              {topic}
            </span>
          ))}
        </div>
      </Card>

      {/* Saved Items */}
      <Card style={{ padding: 16 }}>
        <p className="text-xs font-bold text-text-muted mb-2.5 tracking-[1px]">
          SAVED ITEMS
        </p>
        {savedItems.length === 0 ? (
          <p className="text-xs text-text-muted">
            No saved items yet. Save jobs and events to find them here.
          </p>
        ) : (
          savedItems.slice(0, 3).map((s, i) => (
            <div
              key={s.id}
              className="py-2"
              style={{
                borderBottom:
                  i < Math.min(savedItems.length, 3) - 1
                    ? "1px solid var(--border)"
                    : "none",
              }}
            >
              <p className="text-xs font-semibold text-text m-0">
                &#128278; {s.postTitle}
              </p>
              {s.postType && (
                <span
                  className="inline-block text-[10px] font-bold mt-1 rounded-full"
                  style={{
                    padding: "1px 6px",
                    background:
                      "color-mix(in srgb, var(--blue) 8%, transparent)",
                    color: "var(--blue)",
                  }}
                >
                  {s.postType}
                </span>
              )}
            </div>
          ))
        )}
      </Card>
    </aside>
  );
}
