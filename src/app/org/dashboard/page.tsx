"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import OrgRoute from "@/components/OrgRoute";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import type { Organization } from "@/lib/firestore/organizations";
import Avatar from "@/components/Avatar";

/* ─── types ─── */
interface DashboardStats {
  totalPosts: number;
  activePosts: number;
  applications: number;
  profileViews: number;
}

interface ActivityItem {
  id: string;
  type: string;
  message: string;
  timestamp: { _seconds: number } | string;
}

interface DashJob {
  id: string;
  title: string;
  slug?: string;
  location?: string;
  status?: string;
  applicationCount: number;
  createdAt?: unknown;
}

interface HoursDay {
  open: string;
  close: string;
  isOpen: boolean;
}
type HoursMap = Record<string, HoursDay>;

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS: Record<string, string> = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
  thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
};

const TABS = [
  "Overview", "Jobs", "Applications", "Events", "Scholarships",
  "Talent Search", "Analytics", "Edit Profile", "Team", "Templates", "Billing",
];

const PROFILE_SUBS = ["General", "Hours", "Photo Gallery", "Service Tags", "Indigenous Identity", "Contact & Social"];

const SUGGESTED_TAGS = [
  "Recruitment", "Training", "Hospitality", "Human Resources",
  "First Nations", "Saskatchewan", "Career Development", "Gaming Industry",
];

const TREATY_OPTIONS = [
  "", "Treaty 1", "Treaty 2", "Treaty 3", "Treaty 4",
  "Treaty 5", "Treaty 6", "Treaty 7", "Treaty 8",
  "Treaty 9", "Treaty 10", "Treaty 11",
];

/* ─── amber accent color ─── */
const AMBER = "#D97706";
const AMBER_RGB = "217,119,6";

/* ─── main export ─── */
export default function OrgDashboardPage() {
  return (
    <Suspense>
      <OrgDashboardContent />
    </Suspense>
  );
}

function OrgDashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [org, setOrg] = useState<Organization | null>(null);
  const [jobs, setJobs] = useState<DashJob[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ totalPosts: 0, activePosts: 0, applications: 0, profileViews: 0 });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");
  const [profileSub, setProfileSub] = useState("General");
  const [orgId, setOrgId] = useState<string>("");

  // Edit profile state
  const [profileForm, setProfileForm] = useState({
    name: "", tagline: "", description: "", location: "", website: "",
    contactEmail: "", phone: "",
    instagram: "", facebook: "", tiktok: "",
  });
  const [hours, setHours] = useState<HoursMap>(() => {
    const h: HoursMap = {};
    DAYS.forEach((d) => {
      h[d] = { open: "9:00 AM", close: "5:00 PM", isOpen: d !== "saturday" && d !== "sunday" };
    });
    return h;
  });
  const [gallery, setGallery] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [indigenousGroups, setIndigenousGroups] = useState<string[]>([]);
  const [nation, setNation] = useState("");
  const [treatyTerritory, setTreatyTerritory] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Redirect ?create=job
  useEffect(() => {
    if (searchParams.get("create") === "job") {
      router.push("/org/dashboard/jobs/new");
    }
  }, [searchParams, router]);

  const getToken = useCallback(async () => {
    if (!user) return "";
    return user.getIdToken();
  }, [user]);

  // Fetch dashboard data
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const idToken = await user.getIdToken();
        const headers = { Authorization: `Bearer ${idToken}` };

        // Fetch dashboard data (org + jobs)
        const dashRes = await fetch("/api/employer/dashboard", { headers });
        if (!dashRes.ok) throw new Error("Dashboard fetch failed");
        const dashData = await dashRes.json();

        setOrg(dashData.org as Organization);
        setOrgId(dashData.profile?.orgId || "");
        setJobs([...(dashData.jobs || []), ...(dashData.posts || [])] as DashJob[]);

        // Populate profile form from org data
        const o = dashData.org || {};
        setProfileForm({
          name: o.name || "",
          tagline: o.tagline || "",
          description: o.description || "",
          location: typeof o.location === "string" ? o.location : o.location?.city ? `${o.location.city}, ${o.location.province}` : "",
          website: o.website || "",
          contactEmail: o.contactEmail || o.email || "",
          phone: o.phone || "",
          instagram: o.socialLinks?.instagram || "",
          facebook: o.socialLinks?.facebook || "",
          tiktok: o.socialLinks?.twitter || "",
        });
        if (o.hours) setHours(o.hours);
        if (o.gallery) setGallery(o.gallery);
        if (o.tags) setTags(o.tags);
        if (o.services) setTags(o.services);
        if (o.indigenousGroups) setIndigenousGroups(o.indigenousGroups);
        if (o.nation) setNation(o.nation);
        if (o.treatyTerritory) setTreatyTerritory(o.treatyTerritory);

        // Fetch stats
        const statsRes = await fetch("/api/employer/stats", { headers });
        if (statsRes.ok) {
          const s = await statsRes.json();
          setStats(s);
        }

        // Fetch activity
        const actRes = await fetch("/api/employer/activity", { headers });
        if (actRes.ok) {
          const a = await actRes.json();
          setActivity(a.activity || []);
        }
      } catch (err) {
        console.error("[Dashboard] load failed:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // Gate: schools must have an active plan before accessing dashboard
  if (!loading && org && org.type === "school" && !org.plan) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <p className="text-5xl mb-4">🎓</p>
          <h2 className="text-2xl font-extrabold text-text mb-3">Choose Your School Plan</h2>
          <p className="text-text-sec mb-2">
            To activate your school profile and start posting programs, please select a plan.
          </p>
          <p className="text-sm text-text-muted mb-8">
            Post a single program for <strong>$50</strong>, or get the full School Plan at <strong>$5,500/year</strong> with unlimited programs, jobs, and featured listings.
          </p>
          <Link href="/org/plans" className="no-underline">
            <button
              className="px-8 py-3.5 rounded-xl border-none font-bold text-base cursor-pointer"
              style={{ background: "var(--teal)", color: "#fff" }}
            >
              View Plans &amp; Pricing →
            </button>
          </Link>
        </div>
      </AppShell>
    );
  }

  /* ─── profile save handler ─── */
  const saveProfile = async (fields: Record<string, unknown>) => {
    setSaving(true);
    setSaveMsg("");
    try {
      const token = await getToken();
      const res = await fetch("/api/employer/profile", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (res.ok) {
        setSaveMsg("Saved!");
        setTimeout(() => setSaveMsg(""), 2000);
      } else {
        setSaveMsg("Error saving");
      }
    } catch {
      setSaveMsg("Error saving");
    } finally {
      setSaving(false);
    }
  };

  /* ─── helpers ─── */
  const formatTimestamp = (ts: unknown): string => {
    if (!ts) return "";
    if (typeof ts === "string") return new Date(ts).toLocaleDateString();
    if (typeof ts === "object" && ts !== null && "_seconds" in ts) {
      return new Date((ts as { _seconds: number })._seconds * 1000).toLocaleDateString();
    }
    return "";
  };

  const timeAgo = (ts: unknown): string => {
    if (!ts) return "";
    let date: Date;
    if (typeof ts === "string") date = new Date(ts);
    else if (typeof ts === "object" && ts !== null && "_seconds" in ts) {
      date = new Date((ts as { _seconds: number })._seconds * 1000);
    } else return "";
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  // Chart data (mock 30-day data based on actual view count)
  const chartBars = Array.from({ length: 12 }, (_, i) => {
    const base = stats.profileViews > 0 ? Math.max(10, Math.floor(Math.random() * 100)) : 0;
    return base + i * 3;
  });
  const maxBar = Math.max(...chartBars, 1);

  /* ─── render ─── */
  return (
    <OrgRoute>
      <AppShell>
        <div className="min-h-screen relative" style={{ background: "var(--bg, #020617)" }}>
          {/* Ambient background */}
          <div className="fixed inset-0 pointer-events-none z-0" style={{
            background: `radial-gradient(ellipse 120% 80% at 20% -30%, rgba(${AMBER_RGB},0.08), transparent 60%),
                         radial-gradient(ellipse 80% 60% at 80% 20%, rgba(59,130,246,0.06), transparent 50%),
                         radial-gradient(ellipse 60% 80% at 50% 110%, rgba(167,139,250,0.04), transparent 50%)`,
          }} />

          <div className="relative z-[1] max-w-[1100px] mx-auto px-4 py-8 md:px-10">
            {loading ? <LoadingSkeleton /> : (
              <>
                {/* ─── HERO ─── */}
                <div className="relative rounded-[20px] p-8 md:p-10 mb-8 overflow-hidden" style={{
                  background: `linear-gradient(135deg, rgba(${AMBER_RGB},0.08), rgba(59,130,246,0.06), rgba(167,139,250,0.04))`,
                  border: `1px solid rgba(${AMBER_RGB},0.15)`,
                }}>
                  <div className="flex items-center justify-between flex-wrap gap-4 relative z-[2]">
                    <div className="flex items-center gap-5">
                      <div className="relative">
                        <Avatar
                          name={org?.shortName || org?.name || ""}
                          size={64}
                          src={org?.logoUrl || org?.logo}
                          gradient={`linear-gradient(135deg, ${AMBER}, #F59E0B)`}
                        />
                      </div>
                      <div>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight" style={{
                          background: `linear-gradient(135deg, #fff 30%, ${AMBER})`,
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}>
                          {org?.name || "Dashboard"}
                        </h1>
                        <p className="text-sm mt-1" style={{ color: "var(--text-muted, #94a3b8)" }}>
                          Manage your organization, jobs, and applications
                        </p>
                        {org?.plan && (
                          <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{
                            background: `rgba(${AMBER_RGB},0.12)`, color: AMBER,
                          }}>
                            {org.plan} plan
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      {org?.slug && (
                        <Link href={`/org/${org.slug}`} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold no-underline transition-all hover:-translate-y-0.5" style={{
                          background: "rgba(255,255,255,0.05)",
                          backdropFilter: "blur(12px)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "var(--text-sec, #cbd5e1)",
                        }}>
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                          View Profile
                        </Link>
                      )}
                      <button
                        onClick={() => router.push("/org/dashboard/jobs/new")}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border-none cursor-pointer transition-all hover:-translate-y-0.5"
                        style={{
                          background: `linear-gradient(135deg, ${AMBER}, #F59E0B)`,
                          color: "#fff",
                          boxShadow: `0 4px 20px rgba(${AMBER_RGB},0.3)`,
                        }}
                      >
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        Post a Job
                      </button>
                    </div>
                  </div>
                </div>

                {/* ─── TAB PILLS ─── */}
                <div className="flex flex-wrap gap-2 mb-8">
                  {TABS.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium cursor-pointer transition-all border-none hover:-translate-y-0.5"
                      style={activeTab === tab ? {
                        color: "#fff",
                        background: `linear-gradient(135deg, rgba(${AMBER_RGB},0.15), rgba(245,158,11,0.1))`,
                        border: `1px solid rgba(${AMBER_RGB},0.4)`,
                        boxShadow: `0 0 20px rgba(${AMBER_RGB},0.1)`,
                      } : {
                        color: "var(--text-muted, #94a3b8)",
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid var(--border, rgba(30,41,59,0.6))",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      {tab}
                      {tab === "Analytics" && <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: `linear-gradient(135deg, ${AMBER}, #F59E0B)`, boxShadow: `0 0 6px rgba(${AMBER_RGB},0.5)` }} />}
                      {tab === "Edit Profile" && <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: `linear-gradient(135deg, ${AMBER}, #F59E0B)`, boxShadow: `0 0 6px rgba(${AMBER_RGB},0.5)` }} />}
                    </button>
                  ))}
                </div>

                {/* ─── TAB CONTENT ─── */}
                {activeTab === "Overview" && (
                  <OverviewTab stats={stats} chartBars={chartBars} maxBar={maxBar} activity={activity} jobs={jobs} timeAgo={timeAgo} formatTimestamp={formatTimestamp} />
                )}

                {activeTab === "Analytics" && (
                  <AnalyticsTab stats={stats} chartBars={chartBars} maxBar={maxBar} jobs={jobs} formatTimestamp={formatTimestamp} />
                )}

                {activeTab === "Edit Profile" && (
                  <EditProfileTab
                    profileSub={profileSub} setProfileSub={setProfileSub}
                    profileForm={profileForm} setProfileForm={setProfileForm}
                    hours={hours} setHours={setHours}
                    gallery={gallery} setGallery={setGallery}
                    tags={tags} setTags={setTags}
                    tagInput={tagInput} setTagInput={setTagInput}
                    indigenousGroups={indigenousGroups} setIndigenousGroups={setIndigenousGroups}
                    nation={nation} setNation={setNation}
                    treatyTerritory={treatyTerritory} setTreatyTerritory={setTreatyTerritory}
                    saving={saving} saveMsg={saveMsg}
                    saveProfile={saveProfile}
                    org={org}
                  />
                )}

                {activeTab === "Jobs" && <JobsTab jobs={jobs} orgId={orgId} getToken={getToken} formatTimestamp={formatTimestamp} />}
                {activeTab === "Applications" && <ApplicationsTab jobs={jobs} getToken={getToken} />}
                {activeTab === "Events" && <EventsTab orgId={orgId} getToken={getToken} />}
                {activeTab === "Scholarships" && <ScholarshipsTab orgId={orgId} getToken={getToken} />}
                {activeTab === "Talent Search" && <TalentSearchTab />}
                {activeTab === "Team" && <TeamTab orgId={orgId} getToken={getToken} />}
                {activeTab === "Templates" && <TemplatesTab />}
                {activeTab === "Billing" && <BillingTab org={org} orgId={orgId} />}
              </>
            )}
          </div>
        </div>
      </AppShell>
    </OrgRoute>
  );
}

/* ═══════════════════════════════════════════════════════════
   OVERVIEW TAB
   ═══════════════════════════════════════════════════════════ */
function OverviewTab({ stats, chartBars, maxBar, activity, jobs, timeAgo, formatTimestamp }: {
  stats: DashboardStats;
  chartBars: number[];
  maxBar: number;
  activity: ActivityItem[];
  jobs: DashJob[];
  timeAgo: (ts: unknown) => string;
  formatTimestamp: (ts: unknown) => string;
}) {
  const statCards = [
    { label: "Total Posts", value: stats.totalPosts, color: AMBER, rgb: AMBER_RGB },
    { label: "Active Posts", value: stats.activePosts, color: "#3B82F6", rgb: "59,130,246" },
    { label: "Applications", value: stats.applications, color: "#A78BFA", rgb: "167,139,250" },
    { label: "Profile Views", value: stats.profileViews, color: "#F59E0B", rgb: "245,158,11" },
  ];

  return (
    <>
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <DashCard key={s.label}>
            <div className="w-11 h-11 rounded-xl mb-4 flex items-center justify-center" style={{ background: `rgba(${s.rgb},0.1)` }}>
              <StatIcon label={s.label} color={s.color} />
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted, #64748b)" }}>{s.label}</div>
            <div className="text-3xl font-black tracking-tight" style={{
              background: "linear-gradient(135deg, var(--text, #f8fafc), var(--text-sec, #cbd5e1))",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              {s.value >= 1000 ? `${(s.value / 1000).toFixed(1)}k` : s.value}
            </div>
          </DashCard>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Profile Views Chart */}
        <DashCard>
          <div className="flex items-center justify-between mb-5">
            <span className="text-base font-bold" style={{ color: "var(--text, #f8fafc)" }}>Profile Views — 30 Days</span>
            <span className="px-3 py-1 rounded-lg text-[11px] font-semibold" style={{ background: `rgba(${AMBER_RGB},0.1)`, color: AMBER }}>
              {stats.profileViews > 0 ? `${stats.profileViews} total` : "No data yet"}
            </span>
          </div>
          <div className="relative h-[180px] flex items-end gap-1.5">
            {chartBars.map((val, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-md transition-all duration-300 hover:brightness-125 cursor-pointer min-h-[4px]"
                style={{
                  height: `${(val / maxBar) * 100}%`,
                  background: i % 3 === 0
                    ? `linear-gradient(to top, ${AMBER}, rgba(${AMBER_RGB},0.15))`
                    : `linear-gradient(to top, #3B82F6, rgba(59,130,246,0.15))`,
                }}
                title={`${val} views`}
              />
            ))}
          </div>
        </DashCard>

        {/* Recent Activity */}
        <DashCard>
          <div className="flex items-center justify-between mb-5">
            <span className="text-base font-bold" style={{ color: "var(--text, #f8fafc)" }}>Recent Activity</span>
            <span className="px-3 py-1 rounded-lg text-[11px] font-semibold" style={{ background: `rgba(${AMBER_RGB},0.1)`, color: AMBER }}>Live</span>
          </div>
          {activity.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted, #64748b)" }}>No activity yet. Activity will appear as your profile gets views and applications.</p>
          ) : (
            <div className="flex flex-col">
              {activity.slice(0, 5).map((a, i) => {
                const colors = [AMBER, "#3B82F6", "#A78BFA", "#22C55E"];
                const dotColor = colors[i % colors.length];
                return (
                  <div key={a.id} className="flex items-start gap-3.5 py-3.5 transition-all hover:pl-1" style={{ borderBottom: i < activity.length - 1 ? "1px solid rgba(30,41,59,0.4)" : "none" }}>
                    <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: dotColor, boxShadow: `0 0 8px ${dotColor}60` }} />
                    <div>
                      <div className="text-[13px] leading-relaxed" style={{ color: "var(--text-sec, #cbd5e1)" }}>{a.message}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: "var(--text-muted, #64748b)" }}>{timeAgo(a.timestamp)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DashCard>
      </div>

      {/* Top Performing Jobs */}
      <DashCard>
        <div className="flex items-center justify-between mb-5">
          <span className="text-base font-bold" style={{ color: "var(--text, #f8fafc)" }}>Top Performing Jobs</span>
          <Link href="/org/dashboard/jobs/new" className="px-3 py-1.5 rounded-lg text-xs font-semibold no-underline transition-all hover:-translate-y-0.5" style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-sec, #cbd5e1)",
          }}>View All</Link>
        </div>
        {jobs.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted, #64748b)" }}>No jobs posted yet. Post your first job to start tracking performance.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {jobs.slice(0, 5).map((job, i) => {
              const rankColors = [
                { bg: `rgba(${AMBER_RGB},0.1)`, text: AMBER },
                { bg: "rgba(59,130,246,0.1)", text: "#3B82F6" },
                { bg: "rgba(167,139,250,0.1)", text: "#A78BFA" },
                { bg: "rgba(34,197,94,0.1)", text: "#22C55E" },
                { bg: "rgba(245,158,11,0.1)", text: "#F59E0B" },
              ];
              const rc = rankColors[i % rankColors.length];
              return (
                <div key={job.id} className="flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all cursor-pointer hover:translate-x-1" style={{
                  background: "rgba(255,255,255,0.02)", border: "1px solid transparent",
                }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-extrabold shrink-0" style={{ background: rc.bg, color: rc.text }}>
                    #{i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: "var(--text, #f8fafc)" }}>{job.title}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-muted, #64748b)" }}>
                      {formatTimestamp(job.createdAt)} {job.location && `· ${job.location}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-extrabold tracking-tight" style={{ color: rc.text }}>{job.applicationCount}</div>
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted, #64748b)" }}>apps</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DashCard>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   ANALYTICS TAB
   ═══════════════════════════════════════════════════════════ */
function AnalyticsTab({ stats, chartBars, maxBar, jobs, formatTimestamp }: {
  stats: DashboardStats;
  chartBars: number[];
  maxBar: number;
  jobs: DashJob[];
  formatTimestamp: (ts: unknown) => string;
}) {
  const metricCards = [
    { label: "Profile Views", value: stats.profileViews, color: AMBER, rgb: AMBER_RGB },
    { label: "Job Views", value: stats.totalPosts * 50, color: "#3B82F6", rgb: "59,130,246" },
    { label: "Applications", value: stats.applications, color: "#A78BFA", rgb: "167,139,250" },
    { label: "Avg. Time to Fill", value: "14d", color: "#22C55E", rgb: "34,197,94", isText: true },
  ];

  const sources = [
    { name: "IOPPS Job Board", pct: 68, color: AMBER, rgb: AMBER_RGB },
    { name: "Direct Profile", pct: 18, color: "#3B82F6", rgb: "59,130,246" },
    { name: "Email Alerts", pct: 10, color: "#A78BFA", rgb: "167,139,250" },
    { name: "External Link", pct: 4, color: "#F59E0B", rgb: "245,158,11" },
  ];

  const demographics = [
    { label: "Saskatchewan", pct: "72%", color: AMBER },
    { label: "Alberta", pct: "15%", color: "#3B82F6" },
    { label: "Manitoba", pct: "8%", color: "#A78BFA" },
    { label: "Other", pct: "5%", color: "#F59E0B" },
  ];

  return (
    <>
      <h2 className="text-xl font-extrabold tracking-tight mb-5" style={{
        background: "linear-gradient(135deg, var(--text, #f8fafc), var(--text-sec, #cbd5e1))",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      }}>Analytics</h2>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {metricCards.map((m) => (
          <DashCard key={m.label}>
            <div className="w-11 h-11 rounded-xl mb-4 flex items-center justify-center" style={{ background: `rgba(${m.rgb},0.1)` }}>
              <StatIcon label={m.label} color={m.color} />
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted, #64748b)" }}>{m.label}</div>
            <div className="text-3xl font-black tracking-tight" style={{
              background: "linear-gradient(135deg, var(--text, #f8fafc), var(--text-sec, #cbd5e1))",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              {"isText" in m ? m.value : typeof m.value === "number" && m.value >= 1000 ? `${(m.value / 1000).toFixed(1)}k` : m.value}
            </div>
          </DashCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Views chart */}
        <DashCard>
          <div className="flex items-center justify-between mb-5">
            <span className="text-base font-bold" style={{ color: "var(--text, #f8fafc)" }}>Views Over Time</span>
            <span className="px-3 py-1 rounded-lg text-[11px] font-semibold" style={{ background: `rgba(${AMBER_RGB},0.1)`, color: AMBER }}>30 days</span>
          </div>
          <div className="relative h-[180px] flex items-end gap-1.5">
            {chartBars.map((val, i) => (
              <div key={i} className="flex-1 rounded-t-md transition-all duration-300 hover:brightness-125 cursor-pointer min-h-[4px]"
                style={{
                  height: `${(val / maxBar) * 100}%`,
                  background: i % 2 === 0
                    ? `linear-gradient(to top, ${AMBER}, rgba(${AMBER_RGB},0.15))`
                    : `linear-gradient(to top, #3B82F6, rgba(59,130,246,0.15))`,
                }}
                title={`${val} views`}
              />
            ))}
          </div>
        </DashCard>

        {/* Application Sources */}
        <DashCard>
          <div className="flex items-center justify-between mb-5">
            <span className="text-base font-bold" style={{ color: "var(--text, #f8fafc)" }}>Application Sources</span>
          </div>
          <div className="flex flex-col">
            {sources.map((s, i) => (
              <div key={s.name} className="flex items-center gap-3 py-3" style={{ borderBottom: i < sources.length - 1 ? "1px solid rgba(30,41,59,0.3)" : "none" }}>
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
                <span className="text-[13px] flex-1" style={{ color: "var(--text-sec, #cbd5e1)" }}>{s.name}</span>
                <span className="text-sm font-bold min-w-[40px] text-right" style={{ color: s.color }}>{s.pct}%</span>
                <div className="w-[100px] h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(30,41,59,0.5)" }}>
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${s.pct}%`, background: `linear-gradient(90deg, ${s.color}, rgba(${s.rgb},0.6))` }} />
                </div>
              </div>
            ))}
          </div>
        </DashCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top jobs */}
        <DashCard>
          <div className="flex items-center justify-between mb-5">
            <span className="text-base font-bold" style={{ color: "var(--text, #f8fafc)" }}>Top Performing Jobs</span>
          </div>
          {jobs.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: "var(--text-muted, #64748b)" }}>No jobs posted yet.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {jobs.slice(0, 3).map((job, i) => {
                const colors = [AMBER, "#3B82F6", "#A78BFA"];
                const c = colors[i % colors.length];
                return (
                  <div key={job.id} className="flex items-center gap-4 px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-extrabold shrink-0" style={{ background: `${c}18`, color: c }}>#{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: "var(--text, #f8fafc)" }}>{job.title}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted, #64748b)" }}>{formatTimestamp(job.createdAt)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-extrabold" style={{ color: c }}>{job.applicationCount}</div>
                      <div className="text-[10px] uppercase" style={{ color: "var(--text-muted, #64748b)" }}>apps</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DashCard>

        {/* Demographics */}
        <DashCard>
          <div className="flex items-center justify-between mb-5">
            <span className="text-base font-bold" style={{ color: "var(--text, #f8fafc)" }}>Visitor Demographics</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {demographics.map((d) => (
              <div key={d.label} className="p-4 rounded-xl text-center transition-all hover:-translate-y-0.5" style={{
                background: "rgba(255,255,255,0.02)", border: "1px solid var(--border, rgba(30,41,59,0.6))",
              }}>
                <div className="text-2xl font-black tracking-tight" style={{ color: d.color }}>{d.pct}</div>
                <div className="text-[11px] mt-1.5 font-medium" style={{ color: "var(--text-muted, #64748b)" }}>{d.label}</div>
              </div>
            ))}
          </div>
        </DashCard>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   EDIT PROFILE TAB
   ═══════════════════════════════════════════════════════════ */
function EditProfileTab({
  profileSub, setProfileSub, profileForm, setProfileForm,
  hours, setHours, gallery, setGallery, tags, setTags,
  tagInput, setTagInput, indigenousGroups, setIndigenousGroups,
  nation, setNation, treatyTerritory, setTreatyTerritory,
  saving, saveMsg, saveProfile, org,
}: {
  profileSub: string;
  setProfileSub: (s: string) => void;
  profileForm: { name: string; tagline: string; description: string; location: string; website: string; contactEmail: string; phone: string; instagram: string; facebook: string; tiktok: string };
  setProfileForm: React.Dispatch<React.SetStateAction<typeof profileForm>>;
  hours: HoursMap;
  setHours: React.Dispatch<React.SetStateAction<HoursMap>>;
  gallery: string[];
  setGallery: React.Dispatch<React.SetStateAction<string[]>>;
  tags: string[];
  setTags: React.Dispatch<React.SetStateAction<string[]>>;
  tagInput: string;
  setTagInput: React.Dispatch<React.SetStateAction<string>>;
  indigenousGroups: string[];
  setIndigenousGroups: React.Dispatch<React.SetStateAction<string[]>>;
  nation: string;
  setNation: React.Dispatch<React.SetStateAction<string>>;
  treatyTerritory: string;
  setTreatyTerritory: React.Dispatch<React.SetStateAction<string>>;
  saving: boolean;
  saveMsg: string;
  saveProfile: (fields: Record<string, unknown>) => Promise<void>;
  org: Organization | null;
}) {
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 16px",
    background: "rgba(2,6,23,0.6)", border: "1px solid var(--border, rgba(30,41,59,0.6))",
    borderRadius: 10, color: "var(--text, #f8fafc)", fontSize: 14, fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted, #94a3b8)",
    marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px",
  };

  return (
    <>
      <h2 className="text-xl font-extrabold tracking-tight mb-5" style={{
        background: "linear-gradient(135deg, var(--text, #f8fafc), var(--text-sec, #cbd5e1))",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      }}>Edit Profile</h2>

      {/* Sub-tab pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {PROFILE_SUBS.map((sub) => (
          <button
            key={sub}
            onClick={() => setProfileSub(sub)}
            className="px-4 py-2 rounded-xl text-[13px] font-medium cursor-pointer transition-all border-none"
            style={profileSub === sub ? {
              color: "#fff",
              background: `linear-gradient(135deg, rgba(${AMBER_RGB},0.15), rgba(245,158,11,0.1))`,
              border: `1px solid rgba(${AMBER_RGB},0.4)`,
            } : {
              color: "var(--text-muted, #94a3b8)",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--border, rgba(30,41,59,0.6))",
            }}
          >
            {sub}
            {["Hours", "Photo Gallery", "Service Tags", "Indigenous Identity"].includes(sub) && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase" style={{
                background: `linear-gradient(135deg, ${AMBER}, #F59E0B)`, color: "#fff",
              }}>NEW</span>
            )}
          </button>
        ))}
      </div>

      {/* Save message */}
      {saveMsg && (
        <div className="mb-4 px-4 py-2 rounded-lg text-sm font-semibold" style={{
          background: saveMsg === "Saved!" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
          color: saveMsg === "Saved!" ? "#22C55E" : "#EF4444",
        }}>
          {saveMsg}
        </div>
      )}

      {/* ─── General ─── */}
      {profileSub === "General" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DashCard>
            <h3 className="text-base font-bold mb-5" style={{ color: "var(--text, #f8fafc)" }}>Basic Info</h3>
            <div className="mb-5">
              <label style={labelStyle}>Organization Name</label>
              <input style={inputStyle} value={profileForm.name} onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="mb-5">
              <label style={labelStyle}>Tagline</label>
              <input style={inputStyle} value={profileForm.tagline} onChange={(e) => setProfileForm((p) => ({ ...p, tagline: e.target.value }))} placeholder="A short description of your org" />
            </div>
            <div className="mb-5">
              <label style={labelStyle}>Description</label>
              <textarea style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} value={profileForm.description} onChange={(e) => setProfileForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <GlowButton disabled={saving} onClick={() => saveProfile({ name: profileForm.name, tagline: profileForm.tagline, description: profileForm.description })}>
              {saving ? "Saving..." : "Save Changes"}
            </GlowButton>
          </DashCard>
          <div className="flex flex-col gap-4">
            <DashCard>
              <h3 className="text-base font-bold mb-5" style={{ color: "var(--text, #f8fafc)" }}>Logo & Banner</h3>
              <div className="flex items-center gap-4 mb-4">
                <Avatar name={org?.shortName || org?.name || ""} size={64} src={org?.logoUrl || org?.logo} gradient={`linear-gradient(135deg, ${AMBER}, #F59E0B)`} />
                <button className="px-4 py-2 rounded-lg text-sm font-semibold border-none cursor-pointer" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-sec, #cbd5e1)" }}>
                  Upload Logo
                </button>
              </div>
              <div className="w-full h-[100px] rounded-xl flex items-center justify-center cursor-pointer transition-all" style={{
                background: `linear-gradient(135deg, rgba(${AMBER_RGB},0.06), rgba(59,130,246,0.04))`,
                border: `1px dashed rgba(${AMBER_RGB},0.2)`, color: "var(--text-muted, #64748b)", fontSize: 13,
              }}>
                Click to upload banner
              </div>
            </DashCard>
            <DashCard>
              <h3 className="text-base font-bold mb-5" style={{ color: "var(--text, #f8fafc)" }}>Location</h3>
              <div className="mb-4">
                <label style={labelStyle}>City / Region</label>
                <input style={inputStyle} value={profileForm.location} onChange={(e) => setProfileForm((p) => ({ ...p, location: e.target.value }))} />
              </div>
              <GlowButton disabled={saving} onClick={() => saveProfile({ location: profileForm.location })}>
                {saving ? "Saving..." : "Save Location"}
              </GlowButton>
            </DashCard>
          </div>
        </div>
      )}

      {/* ─── Hours ─── */}
      {profileSub === "Hours" && (
        <DashCard>
          <h3 className="text-base font-bold mb-1" style={{ color: "var(--text, #f8fafc)" }}>Hours of Operation</h3>
          <p className="text-[13px] mb-6" style={{ color: "var(--text-muted, #64748b)" }}>Set your business hours so visitors know when to reach you.</p>
          <div className="flex flex-col gap-2">
            {DAYS.map((day) => (
              <div key={day} className="grid items-center gap-4 px-4 py-2.5 rounded-xl transition-all" style={{
                gridTemplateColumns: "90px 1fr auto",
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(30,41,59,0.3)",
              }}>
                <span className="text-[13px] font-semibold" style={{ color: "var(--text-muted, #94a3b8)" }}>{DAY_LABELS[day]}</span>
                {hours[day].isOpen ? (
                  <div className="flex items-center gap-2">
                    <input
                      className="text-center text-[13px] font-medium" style={{ ...inputStyle, width: 100, padding: "8px 12px", borderRadius: 8 }}
                      value={hours[day].open}
                      onChange={(e) => setHours((prev) => ({ ...prev, [day]: { ...prev[day], open: e.target.value } }))}
                    />
                    <span className="text-xs" style={{ color: "var(--text-muted, #64748b)" }}>to</span>
                    <input
                      className="text-center text-[13px] font-medium" style={{ ...inputStyle, width: 100, padding: "8px 12px", borderRadius: 8 }}
                      value={hours[day].close}
                      onChange={(e) => setHours((prev) => ({ ...prev, [day]: { ...prev[day], close: e.target.value } }))}
                    />
                  </div>
                ) : (
                  <span className="text-[13px] italic" style={{ color: "var(--text-muted, #64748b)" }}>Closed</span>
                )}
                <button
                  className="w-12 h-[26px] rounded-[13px] relative cursor-pointer transition-all border shrink-0"
                  style={{
                    background: hours[day].isOpen ? `linear-gradient(135deg, ${AMBER}, #F59E0B)` : "rgba(30,41,59,0.8)",
                    borderColor: hours[day].isOpen ? AMBER : "var(--border, rgba(30,41,59,0.6))",
                  }}
                  onClick={() => setHours((prev) => ({ ...prev, [day]: { ...prev[day], isOpen: !prev[day].isOpen } }))}
                >
                  <div className="absolute top-[3px] w-[18px] h-[18px] bg-white rounded-full transition-all shadow" style={{ left: hours[day].isOpen ? 26 : 3 }} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <GlowButton disabled={saving} onClick={() => saveProfile({ hours })}>
              {saving ? "Saving..." : "Save Hours"}
            </GlowButton>
            <button className="px-4 py-2.5 rounded-xl text-sm font-semibold border-none cursor-pointer" style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-sec, #cbd5e1)",
            }} onClick={() => {
              const weekday = hours.monday;
              setHours((prev) => {
                const next = { ...prev };
                ["monday", "tuesday", "wednesday", "thursday", "friday"].forEach((d) => {
                  next[d] = { ...weekday };
                });
                return next;
              });
            }}>
              Copy to All Weekdays
            </button>
          </div>
        </DashCard>
      )}

      {/* ─── Photo Gallery ─── */}
      {profileSub === "Photo Gallery" && (
        <DashCard>
          <h3 className="text-base font-bold mb-1" style={{ color: "var(--text, #f8fafc)" }}>Photo Gallery</h3>
          <p className="text-[13px] mb-6" style={{ color: "var(--text-muted, #64748b)" }}>Showcase your organization. Up to 12 photos, 5MB max each.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {gallery.map((url, i) => (
              <div key={i} className="aspect-square rounded-[14px] relative overflow-hidden flex items-center justify-center group transition-all hover:-translate-y-1" style={{
                background: `linear-gradient(135deg, rgba(${AMBER_RGB},0.1), var(--card, #0D1224))`,
                border: "1px solid var(--border, rgba(30,41,59,0.6))",
              }}>
                {url.startsWith("http") ? (
                  <img src={url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl opacity-20">📷</span>
                )}
                <button
                  onClick={() => setGallery((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity border-none"
                  style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
                >
                  ×
                </button>
              </div>
            ))}
            {gallery.length < 12 && (
              <div className="aspect-square rounded-[14px] flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all hover:-translate-y-1" style={{
                border: `1px dashed rgba(${AMBER_RGB},0.2)`, color: "var(--text-muted, #64748b)", fontSize: 12,
              }}>
                <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Add Photo
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 mt-4">
            <span className="text-xs" style={{ color: "var(--text-muted, #64748b)" }}>{gallery.length} of 12</span>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(30,41,59,0.5)" }}>
              <div className="h-full rounded-full" style={{ width: `${(gallery.length / 12) * 100}%`, background: `linear-gradient(90deg, ${AMBER}, #F59E0B)` }} />
            </div>
          </div>
        </DashCard>
      )}

      {/* ─── Service Tags ─── */}
      {profileSub === "Service Tags" && (
        <DashCard>
          <h3 className="text-base font-bold mb-1" style={{ color: "var(--text, #f8fafc)" }}>Service Tags</h3>
          <p className="text-[13px] mb-6" style={{ color: "var(--text-muted, #64748b)" }}>Tags help people discover your organization in search.</p>
          <div className="flex flex-wrap gap-2 p-3.5 rounded-xl mb-5 min-h-[52px] items-center transition-all" style={{
            background: "rgba(2,6,23,0.6)", border: "1px solid var(--border, rgba(30,41,59,0.6))",
          }}>
            {tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium" style={{
                background: `rgba(${AMBER_RGB},0.1)`, color: AMBER, border: `1px solid rgba(${AMBER_RGB},0.2)`,
              }}>
                {tag}
                <span className="cursor-pointer opacity-50 hover:opacity-100 text-sm" onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}>×</span>
              </span>
            ))}
            <input
              className="bg-transparent border-none text-sm outline-none flex-1 min-w-[120px]"
              style={{ color: "var(--text, #f8fafc)", fontFamily: "inherit" }}
              placeholder="Type a tag and press Enter..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && tagInput.trim()) {
                  e.preventDefault();
                  if (!tags.includes(tagInput.trim())) {
                    setTags((prev) => [...prev, tagInput.trim()]);
                  }
                  setTagInput("");
                }
              }}
            />
          </div>
          <div className="mb-5">
            <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted, #94a3b8)" }}>Suggested Tags</div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).map((t) => (
                <span key={t} className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all" style={{
                  background: "rgba(255,255,255,0.03)", color: "var(--text-muted, #94a3b8)",
                  border: "1px solid var(--border, rgba(30,41,59,0.6))",
                }} onClick={() => setTags((prev) => [...prev, t])}>
                  + {t}
                </span>
              ))}
            </div>
          </div>
          <GlowButton disabled={saving} onClick={() => saveProfile({ tags, services: tags })}>
            {saving ? "Saving..." : "Save Tags"}
          </GlowButton>
        </DashCard>
      )}

      {/* ─── Indigenous Identity ─── */}
      {profileSub === "Indigenous Identity" && (
        <div className="rounded-2xl p-7 relative overflow-hidden" style={{
          background: `linear-gradient(135deg, rgba(${AMBER_RGB},0.06), rgba(59,130,246,0.04))`,
          border: `1px solid rgba(${AMBER_RGB},0.15)`,
        }}>
          <h3 className="text-base font-bold mb-1 relative z-[2]" style={{ color: AMBER }}>Indigenous Identity</h3>
          <p className="text-[13px] mb-5 relative z-[2]" style={{ color: "var(--text-muted, #94a3b8)" }}>Select the Indigenous group(s) your organization represents.</p>
          <div className="flex gap-3 mb-5 relative z-[2]">
            {["First Nations", "Métis", "Inuit"].map((group) => (
              <button
                key={group}
                onClick={() => setIndigenousGroups((prev) => prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group])}
                className="flex-1 py-4 rounded-xl text-center text-sm font-semibold cursor-pointer transition-all border relative overflow-hidden"
                style={indigenousGroups.includes(group) ? {
                  background: `rgba(${AMBER_RGB},0.08)`, borderColor: `rgba(${AMBER_RGB},0.4)`, color: AMBER,
                  boxShadow: `0 0 24px rgba(${AMBER_RGB},0.08)`,
                } : {
                  background: "rgba(2,6,23,0.5)", borderColor: "var(--border, rgba(30,41,59,0.6))", color: "var(--text-muted, #94a3b8)",
                }}
              >
                {indigenousGroups.includes(group) && <span className="mr-1">✓</span>}
                {group}
              </button>
            ))}
          </div>
          <div className="relative z-[2]">
            <div className="mb-5">
              <label style={labelStyle}>Nation / Community <span style={{ color: "#EF4444" }}>*</span></label>
              <input style={inputStyle} value={nation} onChange={(e) => setNation(e.target.value)} placeholder="e.g. Federation of Sovereign Indigenous Nations (FSIN)" />
              <p className="text-[11px] mt-1.5" style={{ color: "var(--text-muted, #64748b)" }}>Required. Specify the Nation, community, or governing body.</p>
            </div>
            <div className="mb-5">
              <label style={labelStyle}>Treaty Territory (optional)</label>
              <select style={{ ...inputStyle, cursor: "pointer" }} value={treatyTerritory} onChange={(e) => setTreatyTerritory(e.target.value)}>
                {TREATY_OPTIONS.map((t) => <option key={t} value={t}>{t || "Select treaty territory..."}</option>)}
              </select>
            </div>
            <GlowButton disabled={saving} onClick={() => saveProfile({ indigenousGroups, nation, treatyTerritory })}>
              {saving ? "Saving..." : "Save Identity"}
            </GlowButton>
          </div>
        </div>
      )}

      {/* ─── Contact & Social ─── */}
      {profileSub === "Contact & Social" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DashCard>
            <h3 className="text-base font-bold mb-5" style={{ color: "var(--text, #f8fafc)" }}>Contact Information</h3>
            <div className="mb-5">
              <label style={labelStyle}>Email</label>
              <input type="email" style={inputStyle} value={profileForm.contactEmail} onChange={(e) => setProfileForm((p) => ({ ...p, contactEmail: e.target.value }))} />
            </div>
            <div className="mb-5">
              <label style={labelStyle}>Phone</label>
              <input type="tel" style={inputStyle} value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="mb-5">
              <label style={labelStyle}>Website</label>
              <input type="url" style={inputStyle} value={profileForm.website} onChange={(e) => setProfileForm((p) => ({ ...p, website: e.target.value }))} />
            </div>
            <GlowButton disabled={saving} onClick={() => saveProfile({ contactEmail: profileForm.contactEmail, phone: profileForm.phone, website: profileForm.website })}>
              {saving ? "Saving..." : "Save Contact"}
            </GlowButton>
          </DashCard>
          <DashCard>
            <h3 className="text-base font-bold mb-5" style={{ color: "var(--text, #f8fafc)" }}>Social Media</h3>
            <div className="mb-5">
              <label style={labelStyle}>Instagram</label>
              <input style={inputStyle} value={profileForm.instagram} onChange={(e) => setProfileForm((p) => ({ ...p, instagram: e.target.value }))} placeholder="@yourhandle" />
            </div>
            <div className="mb-5">
              <label style={labelStyle}>Facebook</label>
              <input style={inputStyle} value={profileForm.facebook} onChange={(e) => setProfileForm((p) => ({ ...p, facebook: e.target.value }))} placeholder="facebook.com/yourpage" />
            </div>
            <div className="mb-5">
              <label style={labelStyle}>TikTok</label>
              <input style={inputStyle} value={profileForm.tiktok} onChange={(e) => setProfileForm((p) => ({ ...p, tiktok: e.target.value }))} placeholder="@yourhandle" />
            </div>
            <GlowButton disabled={saving} onClick={() => saveProfile({
              socialLinks: { instagram: profileForm.instagram, facebook: profileForm.facebook, twitter: profileForm.tiktok },
            })}>
              {saving ? "Saving..." : "Save Social"}
            </GlowButton>
          </DashCard>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   BILLING TAB
   ═══════════════════════════════════════════════════════════ */
function BillingTab({ org, orgId }: { org: Organization | null; orgId: string }) {
  return (
    <>
      <h2 className="text-xl font-extrabold tracking-tight mb-5" style={{
        background: "linear-gradient(135deg, var(--text, #f8fafc), var(--text-sec, #cbd5e1))",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      }}>Billing & Subscription</h2>
      <DashCard>
        <div className="text-center py-8">
          <div className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center" style={{
            background: `rgba(${AMBER_RGB},0.04)`, border: `2px dashed rgba(${AMBER_RGB},0.15)`,
          }}>
            <svg width="32" height="32" fill="none" stroke={AMBER} strokeWidth="1.5" viewBox="0 0 24 24" style={{ opacity: 0.4 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
            </svg>
          </div>
          <div className="text-base font-semibold mb-2" style={{ color: "var(--text-sec, #cbd5e1)" }}>
            Current Plan: <span className="font-bold uppercase" style={{ color: AMBER }}>{org?.plan || "Free"}</span>
          </div>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted, #64748b)" }}>Manage your plan, payment methods, and invoices.</p>
          <Link href="/org/plans" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold no-underline transition-all hover:-translate-y-0.5" style={{
            background: `linear-gradient(135deg, ${AMBER}, #F59E0B)`, color: "#fff",
            boxShadow: `0 4px 20px rgba(${AMBER_RGB},0.3)`,
          }}>
            Upgrade Plan
          </Link>
        </div>
      </DashCard>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   JOBS TAB
   ═══════════════════════════════════════════════════════════ */
function JobsTab({ jobs, orgId, getToken, formatTimestamp }: {
  jobs: DashJob[]; orgId: string; getToken: () => Promise<string>; formatTimestamp: (ts: unknown) => string;
}) {
  const [filter, setFilter] = useState<"all"|"active"|"draft"|"expired">("all");
  const router = useRouter();

  const filtered = filter === "all" ? jobs : jobs.filter((j) => {
    if (filter === "active") return !j.status || j.status === "active";
    if (filter === "draft") return j.status === "draft";
    if (filter === "expired") return j.status === "expired" || j.status === "closed";
    return true;
  });

  const statusColor = (s?: string) => {
    if (!s || s === "active") return { bg: "rgba(34,197,94,0.1)", text: "#22C55E" };
    if (s === "draft") return { bg: "rgba(245,158,11,0.1)", text: "#F59E0B" };
    if (s === "expired" || s === "closed") return { bg: "rgba(239,68,68,0.1)", text: "#EF4444" };
    return { bg: "rgba(148,163,184,0.1)", text: "#94A3B8" };
  };

  return (
    <>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="text-xl font-extrabold tracking-tight" style={{
          background: "linear-gradient(135deg, var(--text, #f8fafc), var(--text-sec, #cbd5e1))",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>Jobs ({jobs.length})</h2>
        <div className="flex gap-2">
          {(["all","active","draft","expired"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none transition-all capitalize"
              style={filter === f ? { background: `rgba(${AMBER_RGB},0.12)`, color: AMBER } : { background: "rgba(255,255,255,0.03)", color: "var(--text-muted)" }}
            >{f === "all" ? `All (${jobs.length})` : f}</button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <DashCard>
          <div className="text-center py-12">
            <p className="text-4xl mb-3 opacity-30">💼</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No {filter === "all" ? "" : filter + " "}jobs found.</p>
          </div>
        </DashCard>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((job) => {
            const sc = statusColor(job.status);
            return (
              <DashCard key={job.id}>
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase" style={{ background: sc.bg, color: sc.text }}>
                        {job.status || "Active"}
                      </span>
                    </div>
                    <p className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>{job.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {formatTimestamp(job.createdAt)}{job.location ? ` · ${job.location}` : ""} · {job.applicationCount} application{job.applicationCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => router.push(`/org/dashboard/jobs/${job.slug || job.id}/edit`)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none transition-all"
                      style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-sec)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      Edit
                    </button>
                  </div>
                </div>
              </DashCard>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   APPLICATIONS TAB
   ═══════════════════════════════════════════════════════════ */
function ApplicationsTab({ jobs, getToken }: { jobs: DashJob[]; getToken: () => Promise<string> }) {
  const [applications, setApplications] = useState<Array<{id:string; jobTitle:string; applicantName:string; email:string; status:string; appliedAt:string; resumeUrl?:string}>>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch("/api/employer/applications", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setApplications(data.applications || []);
        }
      } catch { /* */ }
      setLoading(false);
    })();
  }, [getToken]);

  const statusColors: Record<string, {bg:string;text:string}> = {
    new: { bg: "rgba(59,130,246,0.1)", text: "#3B82F6" },
    reviewed: { bg: "rgba(245,158,11,0.1)", text: "#F59E0B" },
    shortlisted: { bg: "rgba(34,197,94,0.1)", text: "#22C55E" },
    rejected: { bg: "rgba(239,68,68,0.1)", text: "#EF4444" },
  };

  const filtered = statusFilter === "all" ? applications : applications.filter((a) => a.status === statusFilter);

  return (
    <>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="text-xl font-extrabold tracking-tight" style={{
          background: "linear-gradient(135deg, var(--text, #f8fafc), var(--text-sec, #cbd5e1))",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>Applications ({applications.length})</h2>
        <div className="flex gap-2">
          {["all","new","reviewed","shortlisted","rejected"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none transition-all capitalize"
              style={statusFilter === s ? { background: `rgba(${AMBER_RGB},0.12)`, color: AMBER } : { background: "rgba(255,255,255,0.03)", color: "var(--text-muted)" }}
            >{s}</button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="flex flex-col gap-3">{[1,2,3].map((i) => <div key={i} className="h-24 rounded-2xl skeleton" />)}</div>
      ) : filtered.length === 0 ? (
        <DashCard>
          <div className="text-center py-12">
            <p className="text-4xl mb-3 opacity-30">📋</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No applications yet. Applications will appear here when candidates apply to your jobs.</p>
          </div>
        </DashCard>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((app) => {
            const sc = statusColors[app.status] || statusColors.new;
            return (
              <DashCard key={app.id}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: sc.bg, color: sc.text }}>
                    {app.applicantName?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{app.applicantName}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Applied for: {app.jobTitle} · {app.email}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase shrink-0" style={{ background: sc.bg, color: sc.text }}>
                    {app.status}
                  </span>
                  {app.resumeUrl && (
                    <a href={app.resumeUrl} target="_blank" rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold no-underline transition-all shrink-0"
                      style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-sec)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      Resume
                    </a>
                  )}
                </div>
              </DashCard>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   EVENTS TAB
   ═══════════════════════════════════════════════════════════ */
function EventsTab({ orgId, getToken }: { orgId: string; getToken: () => Promise<string> }) {
  const [events, setEvents] = useState<Array<{id:string;title:string;eventType?:string;date?:string;location?:string;status?:string}>>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", eventType: "Powwow", date: "", endDate: "", location: "", description: "", admissionType: "Free", externalUrl: "" });

  const inputCls = "w-full px-4 py-3 rounded-xl text-sm";
  const inputSt: React.CSSProperties = { background: "rgba(2,6,23,0.6)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "inherit" };
  const lblSt: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.6px" };

  const EVENT_TYPES = [
    { value: "Powwow", emoji: "🥁" }, { value: "Career Fair", emoji: "💼" },
    { value: "Conference", emoji: "🎤" }, { value: "Workshop", emoji: "🛠️" },
    { value: "Cultural", emoji: "🪶" }, { value: "Community", emoji: "🤝" },
    { value: "Sports", emoji: "⚽" }, { value: "Fundraiser", emoji: "💛" },
    { value: "Ceremony", emoji: "🔥" },
  ];

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch("/api/employer/events", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { const d = await res.json(); setEvents(d.events || []); }
      } catch { /* */ }
      setLoading(false);
    })();
  }, [getToken]);

  const resetForm = () => setForm({ title: "", eventType: "Powwow", date: "", endDate: "", location: "", description: "", admissionType: "Free", externalUrl: "" });

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/employer/events", {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (res.ok) { const c = await res.json(); setEvents((p) => [c, ...p]); resetForm(); setShowForm(false); }
    } catch { /* */ }
    setSaving(false);
  };

  const selectedType = EVENT_TYPES.find(t => t.value === form.eventType);

  return (
    <>
      <div className="flex items-center justify-between mb-5 gap-3">
        <h2 className="text-xl font-extrabold tracking-tight text-text shrink-0">Events ({events.length})</h2>
        <GlowButton onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}>
          {showForm ? "✕ Cancel" : "+ Create Event"}
        </GlowButton>
      </div>

      {showForm && (
        <div className="rounded-2xl overflow-hidden mb-6" style={{ border: `1px solid rgba(${AMBER_RGB},0.25)`, boxShadow: `0 8px 40px rgba(${AMBER_RGB},0.06)` }}>
          {/* Header */}
          <div className="px-6 py-5 flex items-center justify-between" style={{ background: `linear-gradient(135deg, rgba(${AMBER_RGB},0.1) 0%, rgba(2,6,23,0.95) 100%)`, borderBottom: `1px solid rgba(${AMBER_RGB},0.15)` }}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: `rgba(${AMBER_RGB},0.15)` }}>
                {selectedType?.emoji ?? "📅"}
              </div>
              <div>
                <h3 className="text-base font-black text-text">Create New Event</h3>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>Share an event with the Indigenous community on IOPPS</p>
              </div>
            </div>
          </div>

          <div className="p-6" style={{ background: "rgba(2,6,23,0.7)" }}>

            {/* STEP 1: Event Type */}
            <div className="mb-7">
              <label style={lblSt}>① What kind of event?</label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {EVENT_TYPES.map((t) => (
                  <button key={t.value} type="button" onClick={() => setForm(p => ({ ...p, eventType: t.value }))}
                    className="flex items-center gap-2.5 px-3 py-3 rounded-xl cursor-pointer transition-all"
                    style={{
                      background: form.eventType === t.value ? `rgba(${AMBER_RGB},0.12)` : "rgba(255,255,255,0.02)",
                      border: form.eventType === t.value ? `1.5px solid rgba(${AMBER_RGB},0.45)` : "1.5px solid rgba(255,255,255,0.05)",
                      color: form.eventType === t.value ? AMBER : "var(--text-muted)",
                    }}>
                    <span className="text-lg leading-none shrink-0">{t.emoji}</span>
                    <span className="text-xs font-semibold">{t.value}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* STEP 2: Title */}
            <div className="mb-6">
              <label style={lblSt}>② Event Title <span style={{ color: "#EF4444" }}>*</span></label>
              <input className={inputCls}
                style={{ ...inputSt, fontSize: 15, fontWeight: 600 }}
                value={form.title}
                onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder={`e.g. ${form.eventType === "Powwow" ? "Annual Summer Powwow 2026" : form.eventType === "Career Fair" ? "Indigenous Careers Expo 2026" : `${form.eventType} 2026`}`}
              />
            </div>

            {/* STEP 3: Dates */}
            <div className="mb-6">
              <label style={lblSt}>③ Dates</label>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <input type="date" className={inputCls} style={inputSt} value={form.date} onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))} />
                  <p className="text-[10px] mt-1.5" style={{ color: "var(--text-muted)" }}>Start date</p>
                </div>
                <div className="pt-3.5 font-light text-lg" style={{ color: "var(--text-muted)" }}>→</div>
                <div className="flex-1">
                  <input type="date" className={inputCls} style={inputSt} value={form.endDate} onChange={(e) => setForm(p => ({ ...p, endDate: e.target.value }))} />
                  <p className="text-[10px] mt-1.5" style={{ color: "var(--text-muted)" }}>End date (optional)</p>
                </div>
              </div>
            </div>

            {/* STEP 4: Location + Admission */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div className="lg:col-span-2">
                <label style={lblSt}>④ Location</label>
                <input className={inputCls} style={inputSt} value={form.location}
                  onChange={(e) => setForm(p => ({ ...p, location: e.target.value }))}
                  placeholder="City, Province or 'Virtual'" />
              </div>
              <div>
                <label style={lblSt}>Admission</label>
                <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                  {[{ v: "Free", e: "🎟️" }, { v: "Paid", e: "💳" }, { v: "Donation", e: "🙏" }].map(({ v, e }) => (
                    <button key={v} type="button" onClick={() => setForm(p => ({ ...p, admissionType: v }))}
                      className="flex-1 py-3 text-[11px] font-bold cursor-pointer"
                      style={{
                        background: form.admissionType === v ? `rgba(${AMBER_RGB},0.15)` : "rgba(2,6,23,0.6)",
                        color: form.admissionType === v ? AMBER : "var(--text-muted)",
                        border: "none",
                        borderRight: v !== "Donation" ? "1px solid var(--border)" : "none",
                      }}>
                      {e} {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* STEP 5: Description */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label style={{ ...lblSt, marginBottom: 0 }}>⑤ Description</label>
                <span className="text-[10px]" style={{ color: form.description.length > 450 ? "#EF4444" : "var(--text-muted)" }}>
                  {form.description.length}/500
                </span>
              </div>
              <textarea className={inputCls} rows={4} maxLength={500}
                style={{ ...inputSt, resize: "vertical" as const }}
                value={form.description}
                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Tell the community what to expect — activities, performers, food, schedule highlights, what to bring..." />
            </div>

            {/* External link */}
            <div className="mb-6">
              <label style={lblSt}>🔗 Event Website or Ticket Link</label>
              <input className={inputCls} style={inputSt} value={form.externalUrl}
                onChange={(e) => setForm(p => ({ ...p, externalUrl: e.target.value }))}
                placeholder="https://..." />
            </div>

            {/* Live Preview */}
            {form.title && (
              <div className="mb-6 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>👁 Preview — how it will appear</span>
                </div>
                <div className="p-4" style={{ background: "rgba(255,255,255,0.01)" }}>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 text-center"
                      style={{ background: `rgba(${AMBER_RGB},0.08)`, border: `1px solid rgba(${AMBER_RGB},0.18)` }}>
                      <div className="text-[9px] font-black uppercase tracking-wide" style={{ color: AMBER }}>
                        {form.date ? new Date(form.date).toLocaleDateString("en-US", { month: "short" }) : "MON"}
                      </div>
                      <div className="text-2xl font-black leading-tight" style={{ color: AMBER }}>
                        {form.date ? new Date(form.date).getDate() : "—"}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-sm font-black text-text leading-tight">{form.title}</span>
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase"
                          style={{ background: `rgba(${AMBER_RGB},0.1)`, color: AMBER }}>
                          {selectedType?.emoji} {form.eventType}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold"
                          style={{ background: "rgba(34,197,94,0.1)", color: "#22C55E" }}>
                          {form.admissionType === "Free" ? "🎟️ Free" : form.admissionType === "Paid" ? "💳 Paid" : "🙏 Donation"}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                        {form.date ? new Date(form.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "Date TBD"}
                        {form.endDate && form.endDate !== form.date ? ` – ${new Date(form.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                        {form.location ? ` · 📍 ${form.location}` : ""}
                      </p>
                    </div>
                  </div>
                  {form.description && (
                    <p className="text-xs mt-3 leading-relaxed line-clamp-2" style={{ color: "var(--text-sec)" }}>{form.description}</p>
                  )}
                </div>
              </div>
            )}

            {/* Footer actions */}
            <div className="flex items-center gap-3 pt-4" style={{ borderTop: `1px solid rgba(${AMBER_RGB},0.12)` }}>
              <GlowButton disabled={saving || !form.title.trim()} onClick={handleCreate}>
                {saving ? "Publishing..." : "📅 Publish Event"}
              </GlowButton>
              <button type="button" onClick={() => { resetForm(); setShowForm(false); }}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.08)" }}>
                Cancel
              </button>
              {!form.title.trim() && <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>✦ Title is required</p>}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">{[1,2,3].map((i) => <div key={i} className="h-20 rounded-2xl skeleton" />)}</div>
      ) : events.length === 0 && !showForm ? (
        <DashCard>
          <div className="text-center py-14">
            <div className="text-5xl mb-4">📅</div>
            <p className="text-base font-bold mb-2" style={{ color: "var(--text-sec)" }}>No events yet</p>
            <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>Share pow wows, career fairs, conferences, and community gatherings with thousands of Indigenous community members.</p>
            <GlowButton onClick={() => setShowForm(true)}>+ Create Your First Event</GlowButton>
          </div>
        </DashCard>
      ) : (
        <div className="flex flex-col gap-2 mt-4">
          {events.map((ev) => (
            <DashCard key={ev.id}>
              <div className="flex items-center gap-4">
                <div className="w-13 h-13 rounded-xl flex flex-col items-center justify-center shrink-0 text-center px-2"
                  style={{ background: `rgba(${AMBER_RGB},0.07)`, minWidth: "3.25rem" }}>
                  <div className="text-[9px] font-black uppercase tracking-wide" style={{ color: AMBER }}>
                    {ev.date ? new Date(ev.date).toLocaleDateString("en-US", { month: "short" }) : ""}
                  </div>
                  <div className="text-xl font-black leading-tight" style={{ color: AMBER }}>
                    {ev.date ? new Date(ev.date).getDate() : "—"}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text">{ev.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {ev.eventType && `${EVENT_TYPES.find(t => t.value === ev.eventType)?.emoji ?? "🎪"} ${ev.eventType}`}
                    {ev.date ? ` · ${new Date(ev.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}
                    {ev.location ? ` · ${ev.location}` : ""}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase shrink-0"
                  style={{ background: "rgba(34,197,94,0.1)", color: "#22C55E" }}>
                  {ev.status || "Active"}
                </span>
              </div>
            </DashCard>
          ))}
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCHOLARSHIPS TAB
   ═══════════════════════════════════════════════════════════ */
function ScholarshipsTab({ orgId, getToken }: { orgId: string; getToken: () => Promise<string> }) {
  const [scholarships, setScholarships] = useState<Array<{id:string;title:string;amount?:string;deadline?:string;status?:string}>>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", amount: "", awardType: "One-Time", deadline: "", description: "",
    eligibility: [] as string[], fieldOfStudy: [] as string[], howToApply: "", externalUrl: ""
  });

  const inputCls = "w-full px-4 py-3 rounded-xl text-sm";
  const inputSt: React.CSSProperties = { background: "rgba(2,6,23,0.6)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "inherit" };
  const lblSt: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.6px" };

  const GOLD = "#FBBF24";
  const GOLD_RGB = "251,191,36";

  const ELIGIBILITY_OPTIONS = [
    "First Nations", "Métis", "Inuit", "Status Indian", "Non-Status",
    "Post-Secondary Student", "Enrolled Full-Time", "High School Graduate",
    "Treaty Member", "Band Member", "Women", "Youth (Under 25)",
  ];
  const FIELDS_OF_STUDY = [
    "Health & Wellness", "Business & Entrepreneurship", "Education", "Technology & IT",
    "Trades & Apprenticeship", "Arts & Culture", "Law & Justice", "Social Work",
    "Environmental Sciences", "Engineering", "Agriculture", "Any Field",
  ];

  const daysUntilDeadline = form.deadline
    ? Math.ceil((new Date(form.deadline).getTime() - Date.now()) / 86400000)
    : null;

  const toggleTag = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch("/api/employer/scholarships", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { const d = await res.json(); setScholarships(d.scholarships || []); }
      } catch { /* */ }
      setLoading(false);
    })();
  }, [getToken]);

  const resetForm = () => setForm({ title: "", amount: "", awardType: "One-Time", deadline: "", description: "", eligibility: [], fieldOfStudy: [], howToApply: "", externalUrl: "" });

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const token = await getToken();
      const payload = { ...form, eligibility: form.eligibility.join(", "), fieldOfStudy: form.fieldOfStudy.join(", ") };
      const res = await fetch("/api/employer/scholarships", {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (res.ok) { const c = await res.json(); setScholarships((p) => [c, ...p]); resetForm(); setShowForm(false); }
    } catch { /* */ }
    setSaving(false);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-5 gap-3">
        <h2 className="text-xl font-extrabold tracking-tight text-text shrink-0">Scholarships ({scholarships.length})</h2>
        <GlowButton onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}>
          {showForm ? "✕ Cancel" : "+ Post Scholarship"}
        </GlowButton>
      </div>

      {showForm && (
        <div className="rounded-2xl overflow-hidden mb-6" style={{ border: `1px solid rgba(${GOLD_RGB},0.25)`, boxShadow: `0 8px 40px rgba(${GOLD_RGB},0.06)` }}>
          {/* Header */}
          <div className="px-6 py-5 flex items-center justify-between" style={{ background: `linear-gradient(135deg, rgba(${GOLD_RGB},0.1) 0%, rgba(2,6,23,0.95) 100%)`, borderBottom: `1px solid rgba(${GOLD_RGB},0.15)` }}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: `rgba(${GOLD_RGB},0.15)` }}>🎓</div>
              <div>
                <h3 className="text-base font-black text-text">Post a Scholarship</h3>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>Invest in the next generation of Indigenous leaders</p>
              </div>
            </div>
          </div>

          <div className="p-6" style={{ background: "rgba(2,6,23,0.7)" }}>

            {/* Name + Amount */}
            <div className="mb-6">
              <label style={lblSt}>① Scholarship Name <span style={{ color: "#EF4444" }}>*</span></label>
              <input className={inputCls} style={{ ...inputSt, fontSize: 15, fontWeight: 600 }}
                value={form.title}
                onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Indigenous Excellence Award 2026" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
              {/* Amount */}
              <div>
                <label style={lblSt}>② Award Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-black" style={{ color: GOLD }}>$</span>
                  <input className={inputCls} style={{ ...inputSt, paddingLeft: "1.85rem" }}
                    value={form.amount}
                    onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="5,000" />
                </div>
                <p className="text-[10px] mt-1.5" style={{ color: "var(--text-muted)" }}>Number or range (e.g. 2,500 – 5,000)</p>
              </div>
              {/* Award Type */}
              <div>
                <label style={lblSt}>Award Type</label>
                <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                  {["One-Time", "Renewable", "Bursary"].map((v) => (
                    <button key={v} type="button" onClick={() => setForm(p => ({ ...p, awardType: v }))}
                      className="flex-1 py-3 text-[11px] font-bold cursor-pointer"
                      style={{
                        background: form.awardType === v ? `rgba(${GOLD_RGB},0.15)` : "rgba(2,6,23,0.6)",
                        color: form.awardType === v ? GOLD : "var(--text-muted)",
                        border: "none",
                        borderRight: v !== "Bursary" ? "1px solid var(--border)" : "none",
                      }}>
                      {v === "One-Time" ? "🎯" : v === "Renewable" ? "🔄" : "📚"} {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Deadline */}
            <div className="mb-6">
              <label style={lblSt}>③ Application Deadline</label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input type="date" className={inputCls} style={inputSt} value={form.deadline}
                    onChange={(e) => setForm(p => ({ ...p, deadline: e.target.value }))} />
                </div>
                {daysUntilDeadline !== null && (
                  <div className="px-4 py-2.5 rounded-xl text-sm font-bold shrink-0"
                    style={{
                      background: daysUntilDeadline < 14 ? "rgba(239,68,68,0.1)" : `rgba(${GOLD_RGB},0.1)`,
                      color: daysUntilDeadline < 14 ? "#EF4444" : GOLD,
                    }}>
                    {daysUntilDeadline < 0 ? "⚠️ Expired" : daysUntilDeadline === 0 ? "⚡ Due Today" : `⏰ ${daysUntilDeadline} days left`}
                  </div>
                )}
              </div>
            </div>

            {/* Eligibility */}
            <div className="mb-6">
              <label style={lblSt}>④ Who is Eligible?</label>
              <p className="text-[11px] mb-3" style={{ color: "var(--text-muted)" }}>Select all that apply</p>
              <div className="flex flex-wrap gap-2">
                {ELIGIBILITY_OPTIONS.map((opt) => {
                  const sel = form.eligibility.includes(opt);
                  return (
                    <button key={opt} type="button" onClick={() => setForm(p => ({ ...p, eligibility: toggleTag(p.eligibility, opt) }))}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                      style={{
                        background: sel ? `rgba(${GOLD_RGB},0.12)` : "rgba(255,255,255,0.03)",
                        border: sel ? `1px solid rgba(${GOLD_RGB},0.4)` : "1px solid rgba(255,255,255,0.07)",
                        color: sel ? GOLD : "var(--text-muted)",
                      }}>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fields of Study */}
            <div className="mb-6">
              <label style={lblSt}>⑤ Field of Study</label>
              <p className="text-[11px] mb-3" style={{ color: "var(--text-muted)" }}>Select all that apply (or leave blank for any field)</p>
              <div className="flex flex-wrap gap-2">
                {FIELDS_OF_STUDY.map((opt) => {
                  const sel = form.fieldOfStudy.includes(opt);
                  return (
                    <button key={opt} type="button" onClick={() => setForm(p => ({ ...p, fieldOfStudy: toggleTag(p.fieldOfStudy, opt) }))}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                      style={{
                        background: sel ? `rgba(${GOLD_RGB},0.12)` : "rgba(255,255,255,0.03)",
                        border: sel ? `1px solid rgba(${GOLD_RGB},0.4)` : "1px solid rgba(255,255,255,0.07)",
                        color: sel ? GOLD : "var(--text-muted)",
                      }}>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div className="mb-5">
              <label style={lblSt}>⑥ Description</label>
              <textarea className={inputCls} rows={3} style={{ ...inputSt, resize: "vertical" as const }}
                value={form.description}
                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="What is this scholarship for? What values or achievements does it recognize?" />
            </div>

            {/* How to Apply + Link */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
              <div>
                <label style={lblSt}>How to Apply</label>
                <textarea className={inputCls} rows={3} style={{ ...inputSt, resize: "vertical" as const }}
                  value={form.howToApply}
                  onChange={(e) => setForm(p => ({ ...p, howToApply: e.target.value }))}
                  placeholder="e.g. Submit cover letter, transcript, and 2 references to scholarships@org.ca" />
              </div>
              <div>
                <label style={lblSt}>Application Link / Website</label>
                <div className="relative">
                  <span className="absolute left-3 top-3.5 text-xs" style={{ color: "var(--text-muted)" }}>🔗</span>
                  <input className={inputCls} style={{ ...inputSt, paddingLeft: "2rem" }}
                    value={form.externalUrl}
                    onChange={(e) => setForm(p => ({ ...p, externalUrl: e.target.value }))}
                    placeholder="https://..." />
                </div>
                {form.amount && (
                  <div className="mt-4 p-4 rounded-xl" style={{ background: `rgba(${GOLD_RGB},0.06)`, border: `1px solid rgba(${GOLD_RGB},0.15)` }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Award Summary</p>
                    <p className="text-2xl font-black" style={{ color: GOLD }}>${form.amount}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{form.awardType}{form.deadline ? ` · Due ${new Date(form.deadline).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}` : ""}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 pt-4" style={{ borderTop: `1px solid rgba(${GOLD_RGB},0.12)` }}>
              <GlowButton disabled={saving || !form.title.trim()} onClick={handleCreate}>
                {saving ? "Publishing..." : "🎓 Publish Scholarship"}
              </GlowButton>
              <button type="button" onClick={() => { resetForm(); setShowForm(false); }}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.08)" }}>
                Cancel
              </button>
              {!form.title.trim() && <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>✦ Name is required</p>}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">{[1,2,3].map((i) => <div key={i} className="h-20 rounded-2xl skeleton" />)}</div>
      ) : scholarships.length === 0 && !showForm ? (
        <DashCard>
          <div className="text-center py-14">
            <div className="text-5xl mb-4">🎓</div>
            <p className="text-base font-bold mb-2" style={{ color: "var(--text-sec)" }}>No scholarships posted yet</p>
            <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>Help Indigenous students access education funding. Your scholarship will reach thousands of community members on IOPPS.</p>
            <GlowButton onClick={() => setShowForm(true)}>+ Post Your First Scholarship</GlowButton>
          </div>
        </DashCard>
      ) : (
        <div className="flex flex-col gap-2 mt-4">
          {scholarships.map((s) => {
            const days = s.deadline ? Math.ceil((new Date(s.deadline).getTime() - Date.now()) / 86400000) : null;
            return (
              <DashCard key={s.id}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 text-center"
                    style={{ background: `rgba(${GOLD_RGB},0.08)`, border: `1px solid rgba(${GOLD_RGB},0.15)` }}>
                    <span className="text-xl">🎓</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text">{s.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {s.amount ? `$${s.amount} · ` : ""}
                      {s.deadline ? `Deadline ${new Date(s.deadline).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}` : "No deadline set"}
                    </p>
                  </div>
                  {days !== null && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0"
                      style={{ background: days < 14 ? "rgba(239,68,68,0.1)" : `rgba(${GOLD_RGB},0.1)`, color: days < 14 ? "#EF4444" : GOLD }}>
                      {days < 0 ? "Expired" : days === 0 ? "Today" : `${days}d left`}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase shrink-0"
                    style={{ background: "rgba(34,197,94,0.1)", color: "#22C55E" }}>
                    {s.status || "Active"}
                  </span>
                </div>
              </DashCard>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   TALENT SEARCH TAB
   ═══════════════════════════════════════════════════════════ */
function TalentSearchTab() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{id:string; name:string; title?:string; location?:string; skills?:string[]}>>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true); setSearched(true);
    try {
      const res = await fetch(`/api/talent?q=${encodeURIComponent(query)}`);
      if (res.ok) { const d = await res.json(); setResults(d.members || []); }
    } catch { /* */ }
    setLoading(false);
  };

  return (
    <>
      <h2 className="text-xl font-extrabold tracking-tight mb-5" style={{ background: "linear-gradient(135deg, var(--text, #f8fafc), var(--text-sec, #cbd5e1))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Talent Search</h2>
      <DashCard>
        <div className="flex gap-3 mb-6">
          <input className="flex-1 px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(2,6,23,0.6)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "inherit" }}
            placeholder="Search by name, skills, or location..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
          <GlowButton onClick={handleSearch}>Search</GlowButton>
        </div>
        {loading ? (
          <div className="flex flex-col gap-3">{[1,2].map((i) => <div key={i} className="h-16 rounded-xl skeleton" />)}</div>
        ) : !searched ? (
          <div className="text-center py-8"><p className="text-4xl mb-3 opacity-30">🔍</p><p className="text-sm" style={{ color: "var(--text-muted)" }}>Search for candidates from the IOPPS community.</p></div>
        ) : results.length === 0 ? (
          <p className="text-center text-sm py-6" style={{ color: "var(--text-muted)" }}>No results found for &quot;{query}&quot;</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {results.map((m) => (
              <div key={m.id} className="px-4 py-3.5 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
                <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{m.name}</p>
                {m.title && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{m.title}</p>}
                {m.location && <p className="text-xs" style={{ color: "var(--text-muted)" }}>📍 {m.location}</p>}
                {m.skills && m.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {m.skills.slice(0, 4).map((s) => <span key={s} className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: `rgba(${AMBER_RGB},0.08)`, color: AMBER }}>{s}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DashCard>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   TEAM TAB
   ═══════════════════════════════════════════════════════════ */
function TeamTab({ orgId, getToken }: { orgId: string; getToken: () => Promise<string> }) {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [saving] = useState(false);
  const [members] = useState<Array<{email:string; role:string; name?:string}>>([]);
  const inputCls = "w-full px-4 py-3 rounded-xl text-sm";
  const inputSt: React.CSSProperties = { background: "rgba(2,6,23,0.6)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "inherit" };
  const lblSt: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.5px" };

  const roleColors: Record<string, {bg:string;text:string}> = {
    owner: { bg: `rgba(${AMBER_RGB},0.1)`, text: AMBER },
    admin: { bg: "rgba(167,139,250,0.1)", text: "#A78BFA" },
    editor: { bg: "rgba(59,130,246,0.1)", text: "#3B82F6" },
    viewer: { bg: "rgba(148,163,184,0.1)", text: "#94A3B8" },
  };

  return (
    <>
      <div className="flex items-center justify-between mb-5 gap-3">
        <h2 className="text-xl font-extrabold tracking-tight text-text shrink-0">Team</h2>
        <GlowButton onClick={() => setShowInvite(!showInvite)}>{showInvite ? "Cancel" : "+ Invite Member"}</GlowButton>
      </div>
      {showInvite && (
        <DashCard>
          <h3 className="text-base font-bold mb-5" style={{ color: "var(--text)" }}>Invite Team Member</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
            <div><label style={lblSt}>Email *</label><input type="email" className={inputCls} style={inputSt} value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="team@example.com" /></div>
            <div><label style={lblSt}>Role</label><select className={inputCls} style={{ ...inputSt, cursor: "pointer" }} value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              <option value="admin">Admin — Full access</option><option value="editor">Editor — Post jobs, events, scholarships</option><option value="viewer">Viewer — View applications & analytics</option>
            </select></div>
          </div>
          <GlowButton disabled={saving || !inviteEmail.trim()} onClick={() => { /* TODO: POST /api/employer/team */ }}>Send Invite</GlowButton>
        </DashCard>
      )}
      {members.length === 0 ? (
        <DashCard><div className="text-center py-12"><p className="text-4xl mb-3 opacity-30">👥</p><p className="text-sm mb-2" style={{ color: "var(--text-sec)" }}>No team members yet</p><p className="text-xs" style={{ color: "var(--text-muted)" }}>Invite people to help manage your organization on IOPPS.</p></div></DashCard>
      ) : (
        <div className="flex flex-col gap-2 mt-4">
          {members.map((m) => {
            const rc = roleColors[m.role] || roleColors.viewer;
            return (
              <DashCard key={m.email}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: rc.bg, color: rc.text }}>{(m.name || m.email).charAt(0).toUpperCase()}</div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-bold" style={{ color: "var(--text)" }}>{m.name || m.email}</p><p className="text-xs" style={{ color: "var(--text-muted)" }}>{m.email}</p></div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase" style={{ background: rc.bg, color: rc.text }}>{m.role}</span>
                </div>
              </DashCard>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATES TAB
   ═══════════════════════════════════════════════════════════ */
function TemplatesTab() {
  const [templates] = useState<Array<{id:string; title:string; usedCount:number}>>([]);
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between mb-5 gap-3">
        <h2 className="text-xl font-extrabold tracking-tight text-text shrink-0">Templates</h2>
        <GlowButton onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "+ Create Template"}</GlowButton>
      </div>
      {showForm && (
        <DashCard>
          <h3 className="text-base font-bold mb-3" style={{ color: "var(--text)" }}>New Template</h3>
          <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>Create a job posting template to speed up future posts. Go to &quot;Post a Job&quot; and fill in the details, then save as template.</p>
          <GlowButton onClick={() => setShowForm(false)}>Got It</GlowButton>
        </DashCard>
      )}
      {templates.length === 0 && !showForm ? (
        <DashCard><div className="text-center py-12"><p className="text-4xl mb-3 opacity-30">📄</p><p className="text-sm mb-2" style={{ color: "var(--text-sec)" }}>No templates yet</p><p className="text-xs" style={{ color: "var(--text-muted)" }}>Save job posting templates for faster creation.</p></div></DashCard>
      ) : (
        <div className="flex flex-col gap-2 mt-4">
          {templates.map((t) => (
            <DashCard key={t.id}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: `rgba(${AMBER_RGB},0.08)` }}>📄</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-bold" style={{ color: "var(--text)" }}>{t.title}</p><p className="text-xs" style={{ color: "var(--text-muted)" }}>Used {t.usedCount} time{t.usedCount !== 1 ? "s" : ""}</p></div>
                <button className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none" style={{ background: `rgba(${AMBER_RGB},0.1)`, color: AMBER }}>Use Template</button>
              </div>
            </DashCard>
          ))}
        </div>
      )}
    </>
  );
}


/* ═══════════════════════════════════════════════════════════
   PLACEHOLDER TAB
   ═══════════════════════════════════════════════════════════ */
function PlaceholderTab({ title, desc, icon }: { title: string; desc: string; icon: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    clipboard: <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />,
    calendar: <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25" />,
    graduation: <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.905 59.905 0 0 1 12 3.493a59.902 59.902 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />,
    search: <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />,
    team: <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />,
    template: <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />,
  };

  return (
    <>
      <h2 className="text-xl font-extrabold tracking-tight mb-5" style={{
        background: "linear-gradient(135deg, var(--text, #f8fafc), var(--text-sec, #cbd5e1))",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      }}>{title}</h2>
      <DashCard>
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center" style={{
            background: `rgba(${AMBER_RGB},0.04)`, border: `2px dashed rgba(${AMBER_RGB},0.15)`,
          }}>
            <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ color: "var(--text-muted, #64748b)", opacity: 0.4 }}>
              {iconMap[icon]}
            </svg>
          </div>
          <div className="text-[15px] mb-2" style={{ color: "var(--text-sec, #cbd5e1)" }}>No {title.toLowerCase()} yet</div>
          <div className="text-[13px]" style={{ color: "var(--text-muted, #64748b)" }}>{desc}</div>
        </div>
      </DashCard>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════════════════ */

function DashCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative p-7 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg" style={{
      background: "var(--card, #0D1224)", border: "1px solid var(--border, rgba(30,41,59,0.6))",
    }}>
      {children}
    </div>
  );
}

function GlowButton({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border-none cursor-pointer transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
      style={{
        background: `linear-gradient(135deg, ${AMBER}, #F59E0B)`,
        color: "#fff",
        boxShadow: `0 4px 20px rgba(${AMBER_RGB},0.3)`,
      }}
    >
      {children}
    </button>
  );
}

function StatIcon({ label, color }: { label: string; color: string }) {
  const icons: Record<string, React.ReactNode> = {
    "Total Posts": <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />,
    "Active Posts": <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />,
    "Applications": <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />,
    "Profile Views": <><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></>,
    "Job Views": <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25" />,
    "Avg. Time to Fill": <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  };

  return (
    <svg width="20" height="20" fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24">
      {icons[label] || icons["Total Posts"]}
    </svg>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-32 rounded-[20px] skeleton" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-9 w-24 rounded-xl skeleton" />)}
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-2xl skeleton" />)}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-60 rounded-2xl skeleton" />
        <div className="h-60 rounded-2xl skeleton" />
      </div>
    </div>
  );
}
