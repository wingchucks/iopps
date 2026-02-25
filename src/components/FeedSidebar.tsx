"use client";

import Link from "next/link";
import Avatar from "@/components/Avatar";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { useAuth } from "@/lib/auth-context";
import type { Post } from "@/lib/firestore/posts";
import type { Organization } from "@/lib/firestore/organizations";

interface FeedSidebarProps {
  featuredPartners: Organization[];
  closingSoon: Post[];
  events: Post[];
  onSignOut: () => void;
  userRole?: string;
  orgRole?: string;
  hasOrg?: boolean;
}

function getRoleLabel(role?: string, orgRole?: string) {
  if (role === "admin") return "Admin";
  if (role === "moderator") return "Moderator";
  if (role === "employer") return "Employer";
  if (orgRole === "owner" || orgRole === "admin") return "Organization";
  return "Community Member";
}

export default function FeedSidebar({
  featuredPartners,
  closingSoon,
  events,
  onSignOut,
  userRole,
  orgRole,
  hasOrg,
}: FeedSidebarProps) {
  const { user } = useAuth();
  const displayName =
    user?.displayName || user?.email?.split("@")[0] || "User";

  return (
    <aside className="hidden lg:block w-[260px] shrink-0 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
      {/* Profile card */}
      {user ? (
        <Card className="mb-4" style={{ padding: 20 }}>
          <div className="flex items-center gap-2.5 mb-3">
            <Avatar name={displayName} size={44} src={user.photoURL || undefined} />
            <div>
              <p className="text-[15px] font-bold text-text m-0">{displayName}</p>
              <p className="text-xs text-teal-light m-0">{getRoleLabel(userRole, orgRole)}</p>
            </div>
          </div>
          {!hasOrg && (
            <div className="mb-3">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-text-muted">Profile completeness</span>
                <span className="text-teal font-bold">60%</span>
              </div>
              <div
                className="h-1.5 rounded-full"
                style={{
                  background: "var(--border)",
                }}
              >
                <div
                  className="h-1.5 rounded-full"
                  style={{
                    width: "60%",
                    background:
                      "linear-gradient(90deg, var(--teal), var(--blue))",
                  }}
                />
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Link
              href={hasOrg ? "/org/dashboard" : "/profile"}
              className="flex-1 text-center text-xs font-semibold rounded-lg no-underline py-2"
              style={{
                background: "color-mix(in srgb, var(--teal) 8%, transparent)",
                color: "var(--teal)",
              }}
            >
              {hasOrg ? "Org Dashboard" : "View Profile"}
            </Link>
            <Button small onClick={onSignOut} style={{ fontSize: 12, flex: 1 }}>
              Sign Out
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="mb-4" style={{ padding: 20 }}>
          <p className="text-sm font-semibold text-text m-0 mb-3">Welcome to IOPPS</p>
          <Link
            href="/signin"
            className="block text-center text-xs font-semibold rounded-lg no-underline py-2"
            style={{
              background: "color-mix(in srgb, var(--teal) 8%, transparent)",
              color: "var(--teal)",
            }}
          >
            Sign In
          </Link>
        </Card>
      )}

      {/* Featured Partners */}
      <Card className="mb-4">
        <div className="border-b border-border" style={{ padding: "14px 16px" }}>
          <p className="text-xs font-bold text-text-muted m-0 tracking-[1px]">
            FEATURED PARTNERS
          </p>
        </div>
        {featuredPartners.map((p, i, arr) => (
          <Link
            key={p.id}
            href={`/${p.type === "school" ? "schools" : "org"}/${p.id}`}
            className="no-underline"
          >
            <div
              className="flex gap-2.5 items-center cursor-pointer hover:bg-bg transition-colors"
              style={{
                padding: "10px 16px",
                borderBottom:
                  i < arr.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <Avatar
                name={p.shortName}
                size={32}
                gradient={
                  p.tier === "school"
                    ? "linear-gradient(135deg, var(--teal), var(--blue))"
                    : undefined
                }
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-text m-0 overflow-hidden text-ellipsis whitespace-nowrap">
                  {p.name}
                </p>
                <p className="text-[11px] text-teal m-0">
                  {p.openJobs} open roles
                </p>
              </div>
            </div>
          </Link>
        ))}
        <div style={{ padding: "10px 16px" }}>
          <Link
            href="/partners"
            className="text-xs text-teal font-semibold cursor-pointer no-underline hover:underline"
          >
            View all partners &rarr;
          </Link>
        </div>
      </Card>

      {/* Closing Soon */}
      {closingSoon.length > 0 && (
        <Card className="mb-4">
          <div
            className="border-b border-border"
            style={{ padding: "14px 16px" }}
          >
            <p className="text-xs font-bold text-red m-0 tracking-[1px]">
              &#9200; CLOSING SOON
            </p>
          </div>
          {closingSoon.map((j, i) => {
            const slug = j.id.replace(/^job-/, "");
            return (
              <Link key={j.id} href={`/jobs/${slug}`} className="no-underline">
                <div
                  className="cursor-pointer hover:bg-bg transition-colors"
                  style={{
                    padding: "10px 16px",
                    borderBottom:
                      i < closingSoon.length - 1
                        ? "1px solid var(--border)"
                        : "none",
                  }}
                >
                  <p className="text-xs font-semibold text-text m-0">
                    {j.title} &mdash; {j.orgShort}
                  </p>
                  <p className="text-[11px] text-red m-0">
                    {3 + i} days left
                  </p>
                </div>
              </Link>
            );
          })}
        </Card>
      )}

      {/* Upcoming Events */}
      {events.length > 0 && (
        <Card>
          <div
            className="border-b border-border"
            style={{ padding: "14px 16px" }}
          >
            <p className="text-xs font-bold text-text-muted m-0 tracking-[1px]">
              UPCOMING EVENTS
            </p>
          </div>
          {events.map((e, i) => {
            const eSlug = e.id.replace(/^event-/, "");
            return (
              <Link
                key={e.id}
                href={`/events/${eSlug}`}
                className="no-underline"
              >
                <div
                  className="cursor-pointer hover:bg-bg transition-colors"
                  style={{
                    padding: "10px 16px",
                    borderBottom:
                      i < events.length - 1
                        ? "1px solid var(--border)"
                        : "none",
                  }}
                >
                  <p className="text-xs font-semibold text-text m-0">
                    {e.title} &mdash; {e.dates}
                  </p>
                </div>
              </Link>
            );
          })}
        </Card>
      )}
    </aside>
  );
}
