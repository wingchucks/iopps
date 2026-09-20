"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getDashboardHref, getStandaloneDashboardHref, getDashboardRedirect } from "@/lib/dashboard-navigation";
import BusinessListingStatus from "@/components/business-review/BusinessListingStatus";
import type { BusinessListingReview } from "@/lib/business-listing-review";
import BusinessOverview from "@/components/employer/BusinessOverview";
import { EmployerOverview, EmployerMetrics } from "@/components/employer/EmployerOverview";
import OrgRoute from "@/components/OrgRoute";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import type { Organization } from "@/lib/firestore/organizations";
import Avatar from "@/components/Avatar";
import CanonicalEditProfileTab from "@/components/org-dashboard/CanonicalEditProfileTab";
import { getOrganizationBusinessIdentity, normalizeOrganizationRecord, isOrganizationPubliclyVisible } from "@/lib/organization-profile";
import {
  buildSchoolVisibilityPatch,
  getOrganizationPublicHref,
  isSchoolOrganization,
  isSchoolPubliclyVisible,
} from "@/lib/school-visibility";

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

interface SchoolProgramItem {
  id: string;
  title: string;
  slug?: string;
  status?: string;
  credential?: string;
  format?: string;
  location?: string;
  description?: string;
  createdAt?: unknown;
}

interface StudentInquiryItem {
  id: string;
  name?: string;
  email?: string;
  message?: string;
  programName?: string;
  status?: string;
  createdAt?: unknown;
}

interface HoursDay {
  open: string;
  close: string;
  isOpen: boolean;
  label?: string;
}
type HoursMap = Record<string, HoursDay>;

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
function createDefaultHours(): HoursMap {
  const hours: HoursMap = {};
  DAYS.forEach((day) => {
    hours[day] = {
      open: "9:00 AM",
      close: "5:00 PM",
      isOpen: day !== "saturday" && day !== "sunday",
    };
  });
  return hours;
}

const ORG_TABS = [
  "Overview", "Jobs", "Applications", "Events", "Scholarships",
  "Analytics", "Edit Profile", "Team", "Billing",
 ] as const;

const SCHOOL_TABS = [
  "Overview", "Programs", "Student Inquiries", "Jobs", "Applications",
  "Events", "Scholarships", "Analytics", "Edit Profile", "Team", "Billing",
] as const;

type DashboardTab = (typeof ORG_TABS)[number] | (typeof SCHOOL_TABS)[number];
const ALL_TABS = [...new Set<DashboardTab>([...ORG_TABS, ...SCHOOL_TABS])];

const PROFILE_SUBS = ["Identity", "Story", "Credibility", "Discoverability", "Contact", "Media"] as const;

/* ─── brand accent color ─── */
const ACCENT = "#0D9488";
const ACCENT_RGB = "13,148,136";




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
  const [schoolPrograms, setSchoolPrograms] = useState<SchoolProgramItem[]>([]);
  const [studentInquiries, setStudentInquiries] = useState<StudentInquiryItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ totalPosts: 0, activePosts: 0, applications: 0, profileViews: 0 });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [statsAvailable, setStatsAvailable] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>("Overview");
  const [profileSub, setProfileSub] = useState<(typeof PROFILE_SUBS)[number]>("Identity");
  const isSchoolOrg = isSchoolOrganization(org);
  const businessFirst = !isSchoolOrg && org?.capabilities?.includes("list_business") === true && !org?.capabilities?.includes("post_jobs");
  const schoolIsPublic = isSchoolPubliclyVisible(org);
  const availableTabs = isSchoolOrg ? SCHOOL_TABS : ORG_TABS;

  // Edit profile state
  const [profileForm, setProfileForm] = useState({
    name: "",
    businessIdentity: "not_specified" as import("@/lib/organization-profile").OrganizationBusinessIdentity,
    tagline: "",
    description: "",
    industry: "",
    size: "",
    foundedYear: "",
    city: "",
    province: "",
    address: "",
    website: "",
    contactEmail: "",
    phone: "",
    linkedin: "",
    instagram: "",
    facebook: "",
    twitter: "",
    logoUrl: "",
    bannerUrl: "",
  });
  const [hours, setHours] = useState<HoursMap>(createDefaultHours);
  const [gallery, setGallery] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [serviceInput, setServiceInput] = useState("");
  const [indigenousGroups, setIndigenousGroups] = useState<string[]>([]);
  const [nation, setNation] = useState("");
  const [treatyTerritory, setTreatyTerritory] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    const destination = getDashboardRedirect(searchParams);
    if (destination) { router.replace(destination); return; }
    const requestedTab = searchParams.get("tab");
    const requestedSection = searchParams.get("section");

    if (requestedTab && ALL_TABS.includes(requestedTab as DashboardTab)) {
      setActiveTab(requestedTab as DashboardTab);
    } else {
      setActiveTab("Overview");
    }
    if (
      requestedSection &&
      PROFILE_SUBS.includes(requestedSection as (typeof PROFILE_SUBS)[number])
    ) {
      setActiveTab("Edit Profile");
      setProfileSub(requestedSection as (typeof PROFILE_SUBS)[number]);
    }
  }, [searchParams, router]);


  useEffect(() => {
    if (!loading && org && !availableTabs.some((tab) => tab === activeTab)) {
      setActiveTab("Overview");
    }
  }, [activeTab, availableTabs, loading, org]);

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

        const normalizedOrg = normalizeOrganizationRecord(dashData.org as Organization);
        setOrg(normalizedOrg);
        const jobPosts = (dashData.posts || []).filter((post: Record<string, unknown>) => post.type === "job");
        const programPosts = (dashData.schoolPrograms || dashData.posts || []).filter(
          (post: Record<string, unknown>) => post.type === "program" || !post.type,
        );

        setJobs([...(dashData.jobs || []), ...jobPosts] as DashJob[]);
        setSchoolPrograms(programPosts as SchoolProgramItem[]);
        setStudentInquiries((dashData.studentInquiries || []) as StudentInquiryItem[]);

        // Populate profile form from org data
        const o = normalizedOrg;
        setProfileForm({
          name: o.name || "",
          businessIdentity: getOrganizationBusinessIdentity(o),
          tagline: o.tagline || "",
          description: o.description || "",
          industry: o.industry || "",
          size: o.size || "",
          foundedYear: o.foundedYear ? String(o.foundedYear) : "",
          city: o.location?.city || "",
          province: o.location?.province || "",
          address: o.address || "",
          website: o.website || "",
          contactEmail: o.contactEmail || "",
          phone: o.phone || "",
          linkedin: o.socialLinks?.linkedin || "",
          instagram: o.socialLinks?.instagram || "",
          facebook: o.socialLinks?.facebook || "",
          twitter: o.socialLinks?.twitter || "",
          logoUrl: o.logoUrl || o.logo || "",
          bannerUrl: o.bannerUrl || "",
        });
        setHours(o.hours || createDefaultHours());
        setGallery(o.gallery || []);
        setTags(o.tags || []);
        setServices(o.services || []);
        setIndigenousGroups(o.indigenousGroups || []);
        setNation(o.nation || "");
        setTreatyTerritory(o.treatyTerritory || "");

        // Fetch stats
        const statsRes = await fetch("/api/employer/stats", { headers });
        if (statsRes.ok) {
          const s = await statsRes.json();
          setStats(s);
          setStatsAvailable(true);
        }

        // Fetch activity
        const actRes = await fetch("/api/employer/activity", { headers });
        if (actRes.ok) {
          const a = await actRes.json();
          setActivity(a.activity || []);
        }
      } catch (err) {
        console.error("[Dashboard] load failed:", err);
        setLoadError("We couldn’t load your dashboard. Please reload to try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const showSaveMessage = (message: string) => {
    setSaveMsg(message);
    setTimeout(() => setSaveMsg(""), 2500);
  };

  const putProfileFields = async (fields: Record<string, unknown>) => {
    const token = await getToken();
    const res = await fetch("/api/employer/profile", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });

    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error || "Error saving");
    }

    const payload = await res.json();
    setOrg((prev) => {
      if (!prev) return prev;

      const nextFields =
        isSchoolOrganization(prev) && typeof fields.isPublished === "boolean"
          ? { ...fields, ...buildSchoolVisibilityPatch(fields.isPublished) }
          : fields;

      return normalizeOrganizationRecord({
        ...prev,
        ...nextFields,
        ...payload.updates,
        directoryReview: payload.directoryReview || undefined,
      } as Organization);
    });
  };

  const submitListing = async (revision: number): Promise<BusinessListingReview> => {
    const response = await fetch("/api/employer/business-review", {
      method: "POST", headers: { Authorization: `Bearer ${await getToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ revision }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Unable to submit listing.");
    setOrg(previous => previous ? { ...previous, directoryReview: payload.review } : previous);
    return payload.review;
  };
  const refreshListing = async () => {
    const response = await fetch("/api/employer/business-review", { headers: { Authorization: `Bearer ${await getToken()}` } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Unable to refresh listing status.");
    setOrg(previous => previous ? { ...previous, ...payload.org, directoryReview: payload.review || undefined } : previous);
  };

  /* ─── profile save handler ─── */
  const saveProfile = async (fields: Record<string, unknown>) => {
    setSaving(true);
    setSaveMsg("");
    try {
      await putProfileFields(fields);
      showSaveMessage("Saved!");
    } catch (error) {
      showSaveMessage(error instanceof Error ? error.message : "Error saving");
    } finally {
      setSaving(false);
    }
  };

  const persistSingleMedia = async (slot: "logo" | "banner", url: string) => {
    const field = slot === "logo" ? "logoUrl" : "bannerUrl";

    setSaving(true);
    setSaveMsg("");
    try {
      await putProfileFields({ [field]: url });
      setProfileForm((prev) => ({ ...prev, [field]: url }));
      showSaveMessage("Saved!");
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to save ${slot}`;
      showSaveMessage(message);
      throw error instanceof Error ? error : new Error(message);
    } finally {
      setSaving(false);
    }
  };

  const hasCredibilityOrMediaSignal =
    gallery.length > 0 ||
    nation.trim().length > 0 ||
    treatyTerritory.trim().length > 0 ||
    DAYS.some((day) => {
      const current = hours[day];
      return current?.isOpen && Boolean(current.open || current.close || current.label);
    });

  const profileChecks = (() => {
    const checks = [
      { label: "Logo", done: Boolean(profileForm.logoUrl) },
      { label: "Banner", done: Boolean(profileForm.bannerUrl) },
      { label: "Story", done: Boolean(profileForm.description.trim() || profileForm.tagline.trim()) },
      { label: "Industry", done: Boolean(profileForm.industry.trim()) },
      { label: "Location", done: Boolean(profileForm.city.trim() || profileForm.province.trim()) },
      {
        label: "Contact",
        done: Boolean(
          profileForm.website.trim() ||
          profileForm.contactEmail.trim() ||
          profileForm.phone.trim() ||
          profileForm.address.trim()
        ),
      },
      { label: "Tags / Services", done: tags.length > 0 || services.length > 0 },
      { label: "Credibility / Media", done: hasCredibilityOrMediaSignal },
    ];
    const completed = checks.filter((check) => check.done).length;
    return {
      checks,
      completed,
      total: checks.length,
      percent: Math.round((completed / checks.length) * 100),
    };
  })();

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

  const businessIsPublic = org ? isOrganizationPubliclyVisible(org) : false;
  const publicProfileHref = isSchoolOrg ? "/opportunities-update" : !businessIsPublic ? "/org/dashboard?tab=Edit%20Profile" : getOrganizationPublicHref(org);
  const heroDescription = isSchoolOrg
    ? "Manage your existing account records, jobs, events, and scholarships."
    : businessFirst ? "Promote your business, share your services, and help people find you." : "Manage your organization, jobs, and applications";
  const primaryActionLabel = businessFirst ? "Edit Business Profile" : "Post a Job";
  const primaryAction = () => {
    if (businessFirst) { router.push("/org/dashboard?tab=Edit%20Profile"); return; }

    router.push("/org/dashboard/jobs/new");
  };
  const schoolStatusSummary = "Public school and program promotion has ended. Existing records remain available here. Contact IOPPS for help with a previous subscription.";

  /* ─── render ─── */
  return (
    <OrgRoute>
      <AppShell>
        <div className="employer-workspace min-h-screen relative" style={{ background: "var(--bg, #020617)" }}>
          {/* Ambient background */}
          <div className="fixed inset-0 pointer-events-none z-0" style={{
            background: `radial-gradient(ellipse 120% 80% at 20% -30%, rgba(${ACCENT_RGB},0.08), transparent 60%),
                         radial-gradient(ellipse 80% 60% at 80% 20%, rgba(59,130,246,0.06), transparent 50%),
                         radial-gradient(ellipse 60% 80% at 50% 110%, rgba(167,139,250,0.04), transparent 50%)`,
          }} />

          <div className="relative z-[1] max-w-[1100px] mx-auto px-4 py-8 md:px-10">
            {loading ? <LoadingSkeleton /> : loadError ? <div role="alert" className="employer-panel"><h1>Dashboard unavailable</h1><p>{loadError}</p><button className="employer-primary" onClick={() => window.location.reload()}>Reload dashboard</button></div> : (
              <>
                {/* ─── HERO ─── */}
                <div className="employer-hero relative rounded-[20px] p-8 md:p-10 mb-8 overflow-hidden" style={{
                  background: `linear-gradient(135deg, rgba(${ACCENT_RGB},0.08), rgba(59,130,246,0.06), rgba(167,139,250,0.04))`,
                  border: `1px solid rgba(${ACCENT_RGB},0.15)`,
                }}>
                  <div className="flex items-center justify-between flex-wrap gap-4 relative z-[2]">
                    <div className="flex items-center gap-5">
                      <div className="relative">
                        <Avatar
                          name={org?.shortName || org?.name || ""}
                          size={64}
                          src={org?.logoUrl || org?.logo}
                          gradient={`linear-gradient(135deg, ${ACCENT}, #F59E0B)`}
                        />
                      </div>
                      <div>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight" style={{
                          background: `linear-gradient(135deg, #fff 30%, ${ACCENT})`,
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}>
                          {org?.name || "Dashboard"}
                        </h1>
                        <p className="text-sm mt-1" style={{ color: "var(--text-muted, #94a3b8)" }}>
                          {heroDescription}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {org?.plan && (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{
                              background: `rgba(${ACCENT_RGB},0.12)`, color: ACCENT,
                            }}>
                              {org.plan} plan
                            </span>
                          )}
                          {isSchoolOrg && (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{
                              background: schoolIsPublic ? "rgba(34,197,94,0.12)" : "rgba(251,191,36,0.12)",
                              color: schoolIsPublic ? "#4ADE80" : "#FBBF24",
                            }}>
                              School promotion retired
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      {org && (
                        <Link href={publicProfileHref} className="brand-button inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold no-underline transition-all hover:-translate-y-0.5" style={{
                          background: "var(--button-gradient-soft)",
                          backdropFilter: "blur(12px)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "var(--button-gradient-soft-text)",
                        }}>
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                          {isSchoolOrg ? "Service update" : businessIsPublic ? "View Profile" : "Review listing"}
                        </Link>
                      )}
                      <button
                        onClick={primaryAction}
                        className="brand-button inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border-none cursor-pointer transition-all hover:-translate-y-0.5"
                        style={{
                          background: "var(--button-gradient)",
                          color: "#fff",
                          boxShadow: "var(--button-gradient-shadow)",
                        }}
                      >
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        {primaryActionLabel}
                      </button>
                    </div>
                  </div>
                </div>

                {isSchoolOrg && (
                  <div className="mb-6 rounded-2xl p-5" style={{
                    background: "rgba(251,191,36,0.08)",
                    border: "1px solid rgba(251,191,36,0.24)",
                  }}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "#FBBF24" }}>
                          School Visibility
                        </div>
                        <h3 className="text-lg font-bold mt-2" style={{ color: "var(--text, #f8fafc)" }}>
                          School promotion has ended
                        </h3>
                        <p className="text-sm mt-2" style={{ color: "var(--text-muted, #94a3b8)" }}>
                          {schoolStatusSummary}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("Edit Profile");
                          setProfileSub("Identity");
                        }}
                        className="brand-button px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer border-none"
                        style={{
                          background: "var(--button-gradient-soft)",
                          color: "var(--button-gradient-soft-text)",
                          border: "1px solid rgba(255,255,255,0.12)",
                        }}
                      >
                        Review School Profile
                      </button>
                    </div>
                  </div>
                )}

                {/* ─── TAB PILLS ─── */}
                <label className="mb-4 block text-sm font-semibold md:hidden">Dashboard section<select className="mt-2 w-full rounded-xl border border-border bg-card p-3 text-text" value={activeTab} onChange={event => router.push(getDashboardHref(event.target.value as DashboardTab), { scroll: false })}>{availableTabs.map(tab => <option key={tab} value={tab}>{tab}</option>)}</select></label>
                <div className="employer-tabs flex flex-wrap gap-2 mb-8">
                  {availableTabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => router.push(getDashboardHref(tab), { scroll: false })}
                      aria-current={activeTab === tab ? "page" : undefined}
                      className="brand-button inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium cursor-pointer transition-all border-none hover:-translate-y-0.5"
                      style={activeTab === tab ? {
                        color: "var(--button-gradient-soft-text)",
                        background: "var(--button-gradient-soft)",
                        border: `1px solid rgba(${ACCENT_RGB},0.4)`,
                        boxShadow: `0 0 20px rgba(${ACCENT_RGB},0.1)`,
                      } : {
                        color: "var(--button-gradient-soft-text)",
                        background: "var(--button-gradient-soft)",
                        border: "1px solid var(--border, rgba(30,41,59,0.6))",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      {tab}
                      {tab === "Analytics" && <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: `linear-gradient(135deg, ${ACCENT}, #F59E0B)`, boxShadow: `0 0 6px rgba(${ACCENT_RGB},0.5)` }} />}
                      {tab === "Edit Profile" && <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: `linear-gradient(135deg, ${ACCENT}, #F59E0B)`, boxShadow: `0 0 6px rgba(${ACCENT_RGB},0.5)` }} />}
                    </button>
                  ))}
                </div>

                {!isSchoolOrg && org && (activeTab === "Overview" || activeTab === "Edit Profile") && <BusinessListingStatus
                  org={org as unknown as Record<string, unknown>} onSubmit={submitListing}
                  onEdit={() => setActiveTab("Edit Profile")} onRefresh={refreshListing}
                />}

                {/* ─── TAB CONTENT ─── */}
                {activeTab === "Overview" && (
                  isSchoolOrg ? (
                    <SchoolOverviewTab
                      org={org}
                      stats={stats}
                      schoolPrograms={schoolPrograms}
                      studentInquiries={studentInquiries}
                      jobs={jobs}
                      schoolIsPublic={schoolIsPublic}
                      publicProfileHref={publicProfileHref}
                      setActiveTab={tab => router.push(getDashboardHref(tab))}
                      timeAgo={timeAgo}
                    />
                  ) : (
                    businessFirst ? <BusinessOverview publicHref={publicProfileHref} isPublic={businessIsPublic} /> : <EmployerOverview stats={stats} statsAvailable={statsAvailable} activity={activity} jobs={jobs} timeAgo={timeAgo} formatTimestamp={formatTimestamp} />
                  )
                )}

                {activeTab === "Analytics" && (
                  <AnalyticsTab stats={stats} statsAvailable={statsAvailable} jobs={jobs} formatTimestamp={formatTimestamp} />
                )}

                {activeTab === "Edit Profile" && (
                  <CanonicalEditProfileTab
                    profileSub={profileSub} setProfileSub={setProfileSub}
                    profileForm={profileForm} setProfileForm={setProfileForm}
                    hours={hours} setHours={setHours}
                    gallery={gallery} setGallery={setGallery}
                    tags={tags} setTags={setTags}
                    tagInput={tagInput} setTagInput={setTagInput}
                    services={services} setServices={setServices}
                    serviceInput={serviceInput} setServiceInput={setServiceInput}
                    indigenousGroups={indigenousGroups} setIndigenousGroups={setIndigenousGroups}
                    nation={nation} setNation={setNation}
                    treatyTerritory={treatyTerritory} setTreatyTerritory={setTreatyTerritory}
                    saving={saving} saveMsg={saveMsg}
                    saveProfile={saveProfile}
                    profileChecks={profileChecks}
                    getToken={getToken}
                    persistSingleMedia={persistSingleMedia}
                    isSchool={isSchoolOrg}
                    schoolIsPublished={schoolIsPublic}
                    toggleSchoolPublished={(next) => saveProfile({ isPublished: next })}
                  />
                )}

                {activeTab === "Programs" && <ProgramsTab programs={schoolPrograms} formatTimestamp={formatTimestamp} />}
                {activeTab === "Student Inquiries" && <StudentInquiriesTab inquiries={studentInquiries} timeAgo={timeAgo} />}
                {getStandaloneDashboardHref(activeTab) && <LoadingSkeleton />}
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
function SchoolOverviewTab({
  org,
  stats,
  schoolPrograms,
  studentInquiries,
  jobs,
  schoolIsPublic,
  publicProfileHref,
  setActiveTab,
  timeAgo,
}: {
  org: Organization | null;
  stats: DashboardStats;
  schoolPrograms: SchoolProgramItem[];
  studentInquiries: StudentInquiryItem[];
  jobs: DashJob[];
  schoolIsPublic: boolean;
  publicProfileHref: string;
  setActiveTab: (tab: DashboardTab) => void;
  timeAgo: (ts: unknown) => string;
}) {
  const unreadInquiryCount = studentInquiries.filter((inquiry) => {
    const status = String(inquiry.status || "").toLowerCase();
    return !status || status === "new" || status === "unread";
  }).length;

  const statCards = [
    { label: "Programs", value: schoolPrograms.length, color: ACCENT, rgb: ACCENT_RGB, icon: "🎓" },
    { label: "New Inquiries", value: unreadInquiryCount, color: "#3B82F6", rgb: "59,130,246", icon: "✉️" },
    { label: "Profile Views", value: stats.profileViews, color: "#A78BFA", rgb: "167,139,250", icon: "👀" },
    { label: "Open Jobs", value: jobs.filter((job) => !job.status || job.status === "active").length, color: "#22C55E", rgb: "34,197,94", icon: "💼" },
  ];

  const actionCards = [
    {
      title: "Manage Programs",
      description: "Review your active school programs and the opportunities attached to them.",
      accent: ACCENT,
      bg: `rgba(${ACCENT_RGB},0.08)`,
      action: () => setActiveTab("Programs"),
      meta: `${schoolPrograms.length} program${schoolPrograms.length === 1 ? "" : "s"}`,
    },
    {
      title: "Student Inquiries",
      description: "See incoming student messages and keep follow-up from slipping through.",
      accent: "#3B82F6",
      bg: "rgba(59,130,246,0.08)",
      action: () => setActiveTab("Student Inquiries"),
      meta: unreadInquiryCount > 0 ? `${unreadInquiryCount} new` : "No unread inquiries",
    },
    {
      title: "Scholarships",
      description: "Keep bursaries and scholarship offers current for student discovery.",
      accent: "#A78BFA",
      bg: "rgba(167,139,250,0.08)",
      action: () => setActiveTab("Scholarships"),
      meta: "Manage scholarship posts",
    },
    {
      title: "Service update",
      description: "Read about school and program promotion changes.",
      accent: "#22C55E",
      bg: "rgba(34,197,94,0.08)",
      href: publicProfileHref,
      meta: "Existing records retained",
    },
  ] as const;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <DashCard key={card.label}>
            <div className="w-11 h-11 rounded-xl mb-4 flex items-center justify-center text-lg" style={{ background: `rgba(${card.rgb},0.1)` }}>
              {card.icon}
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted, #64748b)" }}>
              {card.label}
            </div>
            <div className="text-3xl font-black tracking-tight" style={{
              background: "linear-gradient(135deg, var(--text, #f8fafc), var(--text-sec, #cbd5e1))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              {card.value}
            </div>
          </DashCard>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-4 mb-4">
        <DashCard>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: ACCENT }}>
                School Status
              </div>
              <h3 className="text-xl font-bold mt-2" style={{ color: "var(--text, #f8fafc)" }}>
                {org?.name || "School Dashboard"}
              </h3>
              <p className="text-sm mt-2" style={{ color: "var(--text-muted, #94a3b8)" }}>
                School promotion has ended. Existing account records remain available.
              </p>
            </div>
            <span className="px-3 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider" style={{
              background: schoolIsPublic ? "rgba(34,197,94,0.1)" : "rgba(251,191,36,0.12)",
              color: schoolIsPublic ? "#4ADE80" : "#FBBF24",
            }}>
              Promotion retired
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setActiveTab("Edit Profile")}
              className="rounded-2xl p-4 text-left cursor-pointer border-none transition-all hover:-translate-y-0.5"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="text-sm font-bold" style={{ color: "var(--text, #f8fafc)" }}>Edit School Profile</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted, #94a3b8)" }}>
                Update the contact details and media in your account records.
              </div>
            </button>
            <Link
              href={publicProfileHref}
              className="rounded-2xl p-4 text-left no-underline transition-all hover:-translate-y-0.5"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="text-sm font-bold" style={{ color: "var(--text, #f8fafc)" }}>Open Public School Profile</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted, #94a3b8)" }}>
                Preview the live `/schools` experience students will land on.
              </div>
            </Link>
          </div>
        </DashCard>

        <DashCard>
          <div className="flex items-center justify-between mb-5">
            <span className="text-base font-bold" style={{ color: "var(--text, #f8fafc)" }}>Recent Student Inquiries</span>
            <button
              type="button"
              onClick={() => setActiveTab("Student Inquiries")}
              className="button-gradient-soft px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none"
              style={{ background: `rgba(${ACCENT_RGB},0.08)`, color: ACCENT }}
            >
              View all
            </button>
          </div>
          {studentInquiries.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-4xl mb-3 opacity-30">✉️</p>
              <p className="text-sm" style={{ color: "var(--text-sec, #cbd5e1)" }}>No student inquiries yet</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted, #94a3b8)" }}>
                Student questions will appear here once they reach out through your school presence.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {studentInquiries.slice(0, 4).map((inquiry) => (
                <div
                  key={inquiry.id}
                  className="rounded-xl px-4 py-3"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate" style={{ color: "var(--text, #f8fafc)" }}>
                        {inquiry.name || inquiry.email || "Prospective student"}
                      </div>
                      <div className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted, #94a3b8)" }}>
                        {[inquiry.programName, inquiry.email].filter(Boolean).join(" · ") || "General inquiry"}
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider shrink-0" style={{ color: ACCENT }}>
                      {timeAgo(inquiry.createdAt)}
                    </span>
                  </div>
                  {inquiry.message && (
                    <p className="text-xs mt-2 line-clamp-2" style={{ color: "var(--text-muted, #94a3b8)" }}>
                      {inquiry.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </DashCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {actionCards.map((card) =>
          "href" in card ? (
            <Link
              key={card.title}
              href={card.href}
              className="no-underline"
            >
              <DashCard>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg" style={{ background: card.bg, color: card.accent }}>
                  ↗
                </div>
                <h3 className="text-base font-bold mt-5" style={{ color: "var(--text, #f8fafc)" }}>{card.title}</h3>
                <p className="text-sm mt-2" style={{ color: "var(--text-muted, #94a3b8)" }}>{card.description}</p>
                <p className="text-xs font-semibold mt-4" style={{ color: card.accent }}>{card.meta}</p>
              </DashCard>
            </Link>
          ) : (
            <button
              key={card.title}
              type="button"
              onClick={() => {
                card.action?.();
              }}
              className="text-left cursor-pointer border-none bg-transparent p-0"
            >
              <DashCard>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg" style={{ background: card.bg, color: card.accent }}>
                  →
                </div>
                <h3 className="text-base font-bold mt-5" style={{ color: "var(--text, #f8fafc)" }}>{card.title}</h3>
                <p className="text-sm mt-2" style={{ color: "var(--text-muted, #94a3b8)" }}>{card.description}</p>
                <p className="text-xs font-semibold mt-4" style={{ color: card.accent }}>{card.meta}</p>
              </DashCard>
            </button>
          ),
        )}
      </div>
    </>
  );
}

function ProgramsTab({ programs, formatTimestamp }: {
  programs: SchoolProgramItem[];
  formatTimestamp: (ts: unknown) => string;
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-5 gap-3">
        <h2 className="text-xl font-extrabold tracking-tight text-text">Programs</h2>
        <span className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: `rgba(${ACCENT_RGB},0.08)`, color: ACCENT }}>
          {programs.length} total
        </span>
      </div>
      {programs.length === 0 ? (
        <DashCard>
          <div className="text-center py-12">
            <p className="text-4xl mb-3 opacity-30">🎓</p>
            <p className="text-sm mb-2" style={{ color: "var(--text-sec)" }}>No school programs yet</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Programs linked to your school will appear here once they are published through the IOPPS program workflow.
            </p>
          </div>
        </DashCard>
      ) : (
        <div className="flex flex-col gap-2">
          {programs.map((program) => (
            <DashCard key={program.id}>
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: `rgba(${ACCENT_RGB},0.08)` }}>
                  🎓
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>{program.title}</p>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase" style={{
                      background: program.status === "draft" ? "rgba(251,191,36,0.1)" : "rgba(34,197,94,0.1)",
                      color: program.status === "draft" ? "#FBBF24" : "#22C55E",
                    }}>
                      {program.status || "Active"}
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    {[program.credential, program.format, program.location, formatTimestamp(program.createdAt)].filter(Boolean).join(" · ")}
                  </p>
                  {program.description && (
                    <p className="text-xs mt-2 line-clamp-2" style={{ color: "var(--text-muted)" }}>{program.description}</p>
                  )}
                </div>
              </div>
            </DashCard>
          ))}
        </div>
      )}
    </>
  );
}

function StudentInquiriesTab({ inquiries, timeAgo }: {
  inquiries: StudentInquiryItem[];
  timeAgo: (ts: unknown) => string;
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-5 gap-3">
        <h2 className="text-xl font-extrabold tracking-tight text-text">Student Inquiries</h2>
        <span className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: `rgba(${ACCENT_RGB},0.08)`, color: ACCENT }}>
          {inquiries.length} total
        </span>
      </div>
      {inquiries.length === 0 ? (
        <DashCard>
          <div className="text-center py-12">
            <p className="text-4xl mb-3 opacity-30">📨</p>
            <p className="text-sm mb-2" style={{ color: "var(--text-sec)" }}>No student inquiries yet</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              When students contact your school through IOPPS, their messages will land here.
            </p>
          </div>
        </DashCard>
      ) : (
        <div className="flex flex-col gap-2">
          {inquiries.map((inquiry) => {
            const status = String(inquiry.status || "new").toLowerCase();
            const statusStyles = status === "replied"
              ? { bg: "rgba(34,197,94,0.1)", text: "#22C55E" }
              : { bg: `rgba(${ACCENT_RGB},0.1)`, text: ACCENT };

            return (
              <DashCard key={inquiry.id}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: statusStyles.bg, color: statusStyles.text }}>
                    {(inquiry.name || inquiry.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
                        {inquiry.name || inquiry.email || "Prospective student"}
                      </p>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase" style={{ background: statusStyles.bg, color: statusStyles.text }}>
                        {status}
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      {[inquiry.programName, inquiry.email, timeAgo(inquiry.createdAt)].filter(Boolean).join(" · ")}
                    </p>
                    {inquiry.message && (
                      <p className="text-sm mt-3 leading-relaxed" style={{ color: "var(--text-sec)" }}>
                        {inquiry.message}
                      </p>
                    )}
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
   ANALYTICS TAB
   ═══════════════════════════════════════════════════════════ */
function AnalyticsTab({stats, statsAvailable, jobs, formatTimestamp}: {
  stats: DashboardStats; statsAvailable: boolean; jobs: DashJob[]; formatTimestamp: (ts: unknown) => string;
}) {
  return <><h2 className="text-xl font-bold mb-5">Hiring activity</h2><EmployerMetrics stats={stats} available={statsAvailable} />
    <section className="employer-panel"><h3>Jobs by recorded applications</h3>{[...jobs].sort((a,b) => (b.applicationCount || 0) - (a.applicationCount || 0)).slice(0,5).map(job => <Link className="employer-job-row" key={job.id} href={`/org/dashboard/jobs/${job.id}/edit`}><div><h3>{job.title}</h3><p>{formatTimestamp(job.createdAt)}</p></div><strong>{job.applicationCount || 0}</strong></Link>)}{!jobs.length && <p>No jobs to report yet.</p>}</section>
    <p className="employer-note">These are recorded totals, not a date-filtered report. Visitor trends, referral sources, and time-to-hire reporting are not available yet.</p></>;
}

function DashCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative p-7 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg" style={{
      background: "var(--card, #0D1224)", border: "1px solid var(--border, rgba(30,41,59,0.6))",
    }}>
      {children}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-32 rounded-[20px] skeleton" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-9 w-24 rounded-xl skeleton" />)}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-2xl skeleton" />)}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-60 rounded-2xl skeleton" />
        <div className="h-60 rounded-2xl skeleton" />
      </div>
    </div>
  );
}
