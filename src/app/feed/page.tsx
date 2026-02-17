"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Link from "next/link";
import { getPosts, type Post } from "@/lib/firestore/posts";
import { getOrganizations, type Organization } from "@/lib/firestore/organizations";
import { getSavedItems, type SavedItem } from "@/lib/firestore/savedItems";
import { getApplications, type Application } from "@/lib/firestore/applications";
import ProfileCompleteness from "@/components/ProfileCompleteness";
import InstallPrompt from "@/components/InstallPrompt";

const tabs = ["All", "Jobs", "Events", "Scholarships", "Businesses", "Schools", "Livestreams", "Stories"];

const typeToTab: Record<string, string> = {
  job: "Jobs",
  event: "Events",
  scholarship: "Scholarships",
  program: "Schools",
  story: "Stories",
  spotlight: "Businesses",
};

export default function FeedPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <FeedContent />
        <InstallPrompt />
      </div>
    </ProtectedRoute>
  );
}

function FeedContent() {
  const [tab, setTab] = useState("All");
  const [posts, setPosts] = useState<Post[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, signOut } = useAuth();
  const router = useRouter();
  const displayName = user?.displayName || user?.email?.split("@")[0] || "User";

  useEffect(() => {
    async function load() {
      try {
        const [p, o] = await Promise.all([getPosts(), getOrganizations()]);
        setPosts(p);
        setOrgs(o);
        if (user) {
          const [s, a] = await Promise.all([
            getSavedItems(user.uid).catch(() => []),
            getApplications(user.uid).catch(() => []),
          ]);
          setSavedItems(s);
          setApplications(a);
        }
      } catch (err) {
        console.error("Failed to load feed data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const filtered = tab === "All" ? posts : posts.filter((p) => typeToTab[p.type] === tab);

  const hiringOrgs = orgs
    .filter((o) => o.type === "employer" && o.openJobs > 0)
    .map((o) => ({ name: o.shortName, count: o.openJobs, id: o.id }));

  const featuredPartners = orgs.filter((o) => o.tier === "premium" || o.tier === "school").slice(0, 3);
  const events = posts.filter((p) => p.type === "event").slice(0, 3);
  const closingSoon = posts.filter((p) => p.closingSoon || p.featured).slice(0, 3);

  return (
    <div className="flex gap-6 max-w-[1200px] mx-auto px-4 py-4 md:px-10 md:py-6">
      {/* ═══ Left Sidebar ═══ */}
      <div className="hidden lg:block w-[260px] shrink-0">
        {/* Profile card */}
        <Card className="mb-4" style={{ padding: 20 }}>
          <div className="flex items-center gap-2.5 mb-3">
            <Avatar name={displayName} size={44} />
            <div>
              <p className="text-[15px] font-bold text-text m-0">{displayName}</p>
              <p className="text-xs text-teal-light m-0">Community Member</p>
            </div>
          </div>
          <Button small full onClick={handleSignOut} style={{ fontSize: 12 }}>
            Sign Out
          </Button>
        </Card>

        {/* Featured Partners */}
        <Card className="mb-4">
          <div className="border-b border-border" style={{ padding: "14px 16px" }}>
            <p className="text-xs font-bold text-text-muted m-0 tracking-[1px]">FEATURED PARTNERS</p>
          </div>
          {featuredPartners.map((p, i, arr) => (
            <Link key={p.id} href={`/${p.type === "school" ? "schools" : "org"}/${p.id}`} className="no-underline">
              <div
                className="flex gap-2.5 items-center cursor-pointer hover:bg-bg transition-colors"
                style={{
                  padding: "10px 16px",
                  borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <Avatar
                  name={p.shortName}
                  size={32}
                  gradient={p.tier === "school" ? "linear-gradient(135deg, var(--teal), var(--blue))" : undefined}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-text m-0 overflow-hidden text-ellipsis whitespace-nowrap">
                    {p.name}
                  </p>
                  <p className="text-[11px] text-teal m-0">{p.openJobs} open roles</p>
                </div>
              </div>
            </Link>
          ))}
          <div style={{ padding: "10px 16px" }}>
            <Link href="/partners" className="text-xs text-teal font-semibold cursor-pointer no-underline hover:underline">
              View all partners →
            </Link>
          </div>
        </Card>

        {/* Closing Soon */}
        {closingSoon.length > 0 && (
          <Card className="mb-4">
            <div className="border-b border-border" style={{ padding: "14px 16px" }}>
              <p className="text-xs font-bold text-red m-0 tracking-[1px]">&#9200; CLOSING SOON</p>
            </div>
            {closingSoon.map((j, i) => {
              const slug = j.id.replace(/^job-/, "");
              return (
                <Link key={j.id} href={`/jobs/${slug}`} className="no-underline">
                  <div
                    className="cursor-pointer hover:bg-bg transition-colors"
                    style={{
                      padding: "10px 16px",
                      borderBottom: i < closingSoon.length - 1 ? "1px solid var(--border)" : "none",
                    }}
                  >
                    <p className="text-xs font-semibold text-text m-0">{j.title} — {j.orgShort}</p>
                    <p className="text-[11px] text-red m-0">{3 + i} days left</p>
                  </div>
                </Link>
              );
            })}
          </Card>
        )}

        {/* Upcoming Events */}
        {events.length > 0 && (
          <Card>
            <div className="border-b border-border" style={{ padding: "14px 16px" }}>
              <p className="text-xs font-bold text-text-muted m-0 tracking-[1px]">UPCOMING EVENTS</p>
            </div>
            {events.map((e, i) => {
              const eSlug = e.id.replace(/^event-/, "");
              return (
                <Link key={e.id} href={`/events/${eSlug}`} className="no-underline">
                  <div
                    className="cursor-pointer hover:bg-bg transition-colors"
                    style={{
                      padding: "10px 16px",
                      borderBottom: i < events.length - 1 ? "1px solid var(--border)" : "none",
                    }}
                  >
                    <p className="text-xs font-semibold text-text m-0">{e.title} — {e.dates}</p>
                  </div>
                </Link>
              );
            })}
          </Card>
        )}
      </div>

      {/* ═══ Center Feed ═══ */}
      <div className="flex-1 max-w-full lg:max-w-[580px] min-w-0">
        {/* Profile completeness */}
        <ProfileCompleteness />

        {/* LIVE banner */}
        <div
          className="flex items-center gap-3 rounded-[14px] mb-3 cursor-pointer"
          style={{
            padding: "12px 16px",
            background: "linear-gradient(135deg, var(--red), #991B1B)",
          }}
        >
          <span
            className="text-[11px] text-white font-bold rounded-full"
            style={{ background: "rgba(255,255,255,.2)", padding: "4px 12px" }}
          >
            ● LIVE
          </span>
          <span className="text-white text-sm font-semibold">IOPPS Spotlight: Interview with Chief Stone</span>
          <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,.7)" }}>Watch →</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-2 rounded-full border-none whitespace-nowrap font-semibold text-[13px] cursor-pointer transition-colors"
              style={{
                background: tab === t ? "var(--navy)" : "var(--border)",
                color: tab === t ? "#fff" : "var(--text-sec)",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Hiring Now Carousel */}
        {hiringOrgs.length > 0 && (
          <div className="flex gap-2 mb-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {hiringOrgs.map((org) => (
              <Link key={org.id} href={`/org/${org.id}`} className="no-underline">
                <div
                  className="flex-none flex items-center gap-2 rounded-xl cursor-pointer"
                  style={{
                    padding: "8px 14px",
                    background: "color-mix(in srgb, var(--teal) 6%, var(--card))",
                    border: "1.5px solid var(--border)",
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center font-extrabold"
                    style={{
                      fontSize: 9,
                      background: "color-mix(in srgb, var(--teal) 12%, transparent)",
                      color: "var(--teal)",
                    }}
                  >
                    {org.name.slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-text m-0">{org.name}</p>
                    <p className="m-0 font-semibold text-teal" style={{ fontSize: 10 }}>
                      {org.count} open roles
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Feed Cards */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-[140px] rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card style={{ padding: 40, textAlign: "center" }}>
            <p className="text-3xl mb-2">&#128269;</p>
            <p className="text-sm font-bold text-text mb-1">No {tab === "All" ? "posts" : tab.toLowerCase()} found</p>
            <p className="text-sm text-text-muted">
              {tab === "All"
                ? "Check back soon for new opportunities and updates."
                : "Try a different category or check back later."}
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((post) => (
              <FeedCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>

      {/* ═══ Right Sidebar ═══ */}
      <div className="hidden xl:block w-[260px] shrink-0">
        {/* Your Applications */}
        <Card className="mb-4" style={{ padding: 16 }}>
          <p className="text-xs font-bold text-text-muted mb-2.5 tracking-[1px]">YOUR APPLICATIONS</p>
          {applications.length === 0 ? (
            <p className="text-xs text-text-muted">No applications yet. Apply to jobs to track them here.</p>
          ) : (
            applications.slice(0, 5).map((a, i) => {
              const statusColor: Record<string, string> = {
                applied: "var(--teal)",
                under_review: "var(--gold)",
                viewed: "var(--blue)",
                interview: "var(--purple)",
                accepted: "var(--green)",
                rejected: "var(--red)",
              };
              const color = statusColor[a.status] || "var(--text-sec)";
              const label = a.status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
              return (
                <div key={a.id} className="py-2" style={{ borderBottom: i < Math.min(applications.length, 5) - 1 ? "1px solid var(--border)" : "none" }}>
                  <p className="text-xs font-semibold text-text mb-0.5">{a.postTitle}{a.orgName ? ` — ${a.orgName}` : ""}</p>
                  <Badge text={label} color={color} bg={`color-mix(in srgb, ${color} 8%, transparent)`} small />
                </div>
              );
            })
          )}
        </Card>

        {/* Trending */}
        <Card className="mb-4" style={{ padding: 16 }}>
          <p className="text-xs font-bold text-text-muted mb-2.5 tracking-[1px]">TRENDING THIS WEEK</p>
          {["SIGA hiring surge: 12 new positions", "Treaty 6 Career Fair announced", "New nursing scholarship posted"].map(
            (t, i) => (
              <div key={i} className="py-2" style={{ borderBottom: i < 2 ? "1px solid var(--border)" : "none" }}>
                <p className="text-xs font-semibold text-text m-0">{t}</p>
              </div>
            )
          )}
        </Card>

        {/* Saved Items */}
        <Card style={{ padding: 16 }}>
          <p className="text-xs font-bold text-text-muted mb-2.5 tracking-[1px]">SAVED ITEMS</p>
          {savedItems.length === 0 ? (
            <p className="text-xs text-text-muted">No saved items yet. Save jobs and events to find them here.</p>
          ) : (
            savedItems.slice(0, 5).map((s, i) => (
              <div key={s.id} className="py-2" style={{ borderBottom: i < Math.min(savedItems.length, 5) - 1 ? "1px solid var(--border)" : "none" }}>
                <p className="text-xs font-semibold text-text m-0">&#128278; {s.postTitle}</p>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}

function FeedCard({ post }: { post: Post }) {
  const slug = post.id.replace(/^(job|event|scholarship|program|spotlight|story)-/, "");

  if (post.type === "job" && post.featured) {
    return (
      <Card gold>
        <div style={{ padding: "16px 20px" }}>
          <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
            <Badge text="Featured" color="var(--gold)" bg="var(--gold-soft)" small icon={<span>&#11088;</span>} />
            {post.closingSoon && <Badge text="Closing Soon" color="var(--red)" bg="var(--red-soft)" small />}
          </div>
          <h3 className="text-[17px] font-bold text-text mb-2">{post.title}</h3>
          <div className="flex items-center gap-2.5 mb-2.5">
            <Avatar name={post.orgShort || ""} size={32} gradient="linear-gradient(135deg, var(--navy), var(--teal))" />
            <div className="flex items-center gap-2">
              <span className="text-[15px] text-teal font-bold">{post.orgShort}</span>
              <Badge text="&#10003; Premium Partner" color="var(--gold)" bg="var(--gold-soft)" small />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-[13px] text-text-sec">
            {post.location && <span>&#128205; {post.location}</span>}
            {post.jobType && <span>{post.jobType}</span>}
            {post.salary && <span>&#128176; {post.salary}</span>}
            {post.deadline && <span>&#128197; {post.deadline}</span>}
          </div>
        </div>
        <div
          className="flex justify-between items-center border-t border-border"
          style={{ padding: "10px 20px", background: "color-mix(in srgb, var(--bg) 50%, var(--card))" }}
        >
          <span className="text-xs text-text-muted cursor-pointer">&#128278; Save</span>
          <Link href={`/jobs/${slug}`}><Button small primary>View Job →</Button></Link>
        </div>
      </Card>
    );
  }

  if (post.type === "job") {
    return (
      <Link href={`/jobs/${slug}`} className="no-underline">
        <Card>
          <div style={{ padding: "16px 20px" }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Badge text="Job" color="var(--blue)" bg="var(--blue-soft)" small />
              {post.source && <span className="text-[11px] text-text-muted italic">{post.source}</span>}
              {post.badges?.includes("Verified") && (
                <Badge text="&#10003; Verified" color="var(--green)" bg="var(--green-soft)" small />
              )}
            </div>
            <h3 className="text-base font-bold text-text mb-1.5">{post.title}</h3>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-sm text-teal font-semibold">{post.orgName}</span>
            </div>
            <div className="flex gap-3 text-[13px] text-text-sec">
              {post.location && <span>&#128205; {post.location}</span>}
              {post.jobType && <span>{post.jobType}</span>}
              {post.salary && <span>&#128176; {post.salary}</span>}
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  if (post.type === "program") {
    return (
      <Link href={`/programs/${slug}`} className="no-underline">
        <Card>
          <div style={{ padding: "16px 20px" }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Badge text="Program" color="var(--blue)" bg="var(--blue-soft)" small icon={<span>&#128218;</span>} />
              {post.badges?.includes("Education Partner") && (
                <Badge text="&#127891; Education Partner" color="var(--teal)" bg="var(--teal-soft)" small />
              )}
            </div>
            <h3 className="text-base font-bold text-text mb-1.5">{post.title}</h3>
            <span className="text-sm text-teal font-semibold">{post.orgName}</span>
            <div className="flex gap-3 text-[13px] text-text-sec mt-1.5">
              {post.location && <span>&#128205; {post.location}</span>}
              {post.duration && <span>{post.duration}</span>}
              {post.credential && <span>{post.credential}</span>}
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  if (post.type === "spotlight") {
    return (
      <Link href={`/stories/${slug}`} className="no-underline">
        <div
          className="rounded-2xl cursor-pointer"
          style={{
            padding: 20,
            border: "1.5px solid rgba(217,119,6,.19)",
            background: `linear-gradient(135deg, var(--gold-soft), var(--spotlight-bg))`,
          }}
        >
          <div className="flex justify-between items-center mb-3">
            <p className="text-[11px] font-bold text-gold tracking-[1px] m-0">PARTNER SPOTLIGHT</p>
            <p className="text-gold tracking-[1.5px] m-0 opacity-50" style={{ fontSize: 8, fontWeight: 800 }}>
              EMPOWERING INDIGENOUS SUCCESS
            </p>
          </div>
          <div className="flex gap-3.5 items-center">
            <Avatar name={post.orgShort || ""} size={52} gradient="linear-gradient(135deg, rgba(217,119,6,.25), rgba(15,43,76,.19))" />
            <div>
              <h3 className="text-base font-bold text-text mb-1">{post.title}</h3>
              <p className="text-[13px] text-text-sec mb-2">{post.description}</p>
              <span
                className="inline-block text-xs font-semibold rounded-lg"
                style={{ background: "var(--gold)", color: "#fff", padding: "6px 14px" }}
              >
                Read More &#8594;
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  if (post.type === "event") {
    return (
      <Link href={`/events/${slug}`} className="no-underline">
        <Card>
          <div
            className="h-[100px] flex items-center justify-center text-5xl"
            style={{ background: "linear-gradient(135deg, rgba(15,43,76,.06), rgba(217,119,6,.06))" }}
          >
            {post.eventType === "Pow Wow" ? "🪶" : post.eventType === "Career Fair" ? "💼" : "🎪"}
          </div>
          <div style={{ padding: "14px 20px" }}>
            {post.eventType && <Badge text={post.eventType} color="var(--gold)" bg="var(--gold-soft)" small />}
            <h3 className="text-base font-bold text-text mt-2 mb-1">{post.title}</h3>
            <div className="flex gap-3 text-[13px] text-text-sec">
              {post.dates && <span>&#128197; {post.dates}</span>}
              {post.location && <span>&#128205; {post.location}</span>}
              {post.price && <span>&#127915; {post.price}</span>}
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  if (post.type === "scholarship") {
    return (
      <Link href={`/scholarships/${slug}`} className="no-underline">
        <Card>
          <div style={{ padding: "16px 20px" }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Badge text="Scholarship" color="var(--green)" bg="var(--green-soft)" small icon={<span>&#127891;</span>} />
              {post.featured && (
                <Badge text="Featured" color="var(--gold)" bg="var(--gold-soft)" small icon={<span>&#11088;</span>} />
              )}
              {post.closingSoon && (
                <Badge text="Closing Soon" color="var(--red)" bg="var(--red-soft)" small />
              )}
            </div>
            <h3 className="text-base font-bold text-text mb-1.5">{post.title}</h3>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-sm text-teal font-semibold">{post.orgName}</span>
            </div>
            <div className="flex gap-3 text-[13px] text-text-sec">
              {post.amount && <span>&#128176; {post.amount}</span>}
              {post.deadline && <span>&#128197; {post.deadline}</span>}
              {post.location && <span>&#128205; {post.location}</span>}
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  if (post.type === "story") {
    return (
      <Link href={`/stories/${slug}`} className="no-underline">
        <Card className="cursor-pointer">
          <div style={{ padding: 20, background: "linear-gradient(135deg, rgba(5,150,105,.04), rgba(13,148,136,.03))" }}>
            <Badge text="&#127775; Success Story" color="var(--green)" bg="var(--green-soft)" small />
            <div className="flex gap-3.5 mt-3 items-center">
              <Avatar name={post.title} size={52} />
              <div>
                <p className="text-base font-bold m-0 text-text">{post.title}</p>
                {post.community && <p className="text-xs text-teal font-semibold mt-0.5">{post.community}</p>}
              </div>
            </div>
            {post.quote && (
              <p className="text-[15px] font-semibold italic text-text mt-3.5 leading-relaxed">
                &quot;{post.quote}&quot;
              </p>
            )}
          </div>
        </Card>
      </Link>
    );
  }

  return null;
}
