"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Footer from "@/components/Footer";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Link from "next/link";
import { getPosts, type Post } from "@/lib/firestore/posts";
import CreatePostModal from "@/components/CreatePostModal";
import { getOrganizations, type Organization, getOrganization } from "@/lib/firestore/organizations";
import { getSavedItems, type SavedItem } from "@/lib/firestore/savedItems";
import { getApplications, type Application } from "@/lib/firestore/applications";
import { getVendors, type ShopVendor } from "@/lib/firestore/shop";
import { getMemberProfile } from "@/lib/firestore/members";
import ProfileCompleteness from "@/components/ProfileCompleteness";
import FeedSidebar from "@/components/FeedSidebar";
import FeedRightSidebar from "@/components/FeedRightSidebar";
import InstallPrompt from "@/components/InstallPrompt";
import OnboardingTour from "@/components/OnboardingTour";

import { displayLocation } from "@/lib/utils";

const tabs = ["All", "Jobs", "Events", "Scholarships", "Businesses", "Schools", "Stories"];
const navTabs: Record<string, string> = { Livestreams: "/livestreams" };

const typeToTab: Record<string, string> = {
  job: "Jobs",
  event: "Events",
  scholarship: "Scholarships",
  program: "Schools",
  story: "Stories",
  spotlight: "Stories",
};

export default function FeedPage() {
  return (
    <ProtectedRoute>
      <AppShell>
      <div className="min-h-screen bg-bg flex flex-col">
        <Suspense><FeedContent /></Suspense>
        <InstallPrompt />
        <OnboardingTour />
        <Footer />
      </div>
    </AppShell>
    </ProtectedRoute>
  );
}

interface Livestream {
  id: string;
  title: string;
  status: string;
}

function FeedContent() {
  const [tab, setTab] = useState("All");
  const [posts, setPosts] = useState<Post[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [vendors, setVendors] = useState<ShopVendor[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [livestream, setLivestream] = useState<Livestream | null>(null);
  const [orgPending, setOrgPending] = useState(false);
  const [userRole, setUserRole] = useState<string | undefined>();
  const [userOrgRole, setUserOrgRole] = useState<string | undefined>();
  const [hasOrg, setHasOrg] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const { user, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Auto-open story modal when ?compose=true is in URL
  useEffect(() => {
    if (searchParams.get("compose") === "true") {
      setShowCreatePost(true);
    }
  }, [searchParams]);

  useEffect(() => {
    async function load() {
      try {
        const [p, o, v] = await Promise.all([getPosts(), getOrganizations(), getVendors()]);
        setPosts(p);
        setOrgs(o);
        setVendors(v);

        // Fetch active livestream
        try {
          const liveQ = query(
            collection(db, "livestreams"),
            where("status", "==", "live"),
            limit(1)
          );
          const liveSnap = await getDocs(liveQ);
          if (!liveSnap.empty) {
            const doc = liveSnap.docs[0];
            setLivestream({ id: doc.id, ...doc.data() } as Livestream);
          } else {
            // Fallback: get most recent livestream
            const recentQ = query(
              collection(db, "livestreams"),
              orderBy("createdAt", "desc"),
              limit(1)
            );
            const recentSnap = await getDocs(recentQ);
            if (!recentSnap.empty) {
              const doc = recentSnap.docs[0];
              const data = doc.data();
              if (data.status === "live") {
                setLivestream({ id: doc.id, ...data } as Livestream);
              }
            }
          }
        } catch {
          // livestreams collection may not exist yet — silently ignore
        }

        if (user) {
          const [s, a] = await Promise.all([
            getSavedItems(user.uid).catch(() => []),
            getApplications(user.uid).catch(() => []),
          ]);
          setSavedItems(s);
          setApplications(a);

          // Check if user's org is pending
          try {
            const profile = await getMemberProfile(user.uid);
            if (profile?.role) setUserRole(profile.role);
            if (profile?.orgRole) setUserOrgRole(profile.orgRole);
            if (profile?.orgId) {
              setHasOrg(true);
              const org = await getOrganization(profile.orgId);
              if (org && (org as unknown as Record<string, unknown>).status === "pending") {
                setOrgPending(true);
              }
            }
          } catch {
            // ignore — user may not have org
          }
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

  const handlePostCreated = async () => {
    try {
      const freshPosts = await getPosts();
      setPosts(freshPosts);
    } catch (err) {
      console.error("Failed to refresh feed:", err);
    }
  };

  const filtered = tab === "All" ? posts : posts.filter((p) => typeToTab[p.type] === tab);

  const hiringOrgs = orgs
    .filter((o) => o.type === "employer" && o.openJobs > 0)
    .map((o) => ({ name: o.shortName, count: o.openJobs, id: o.id }));

  const featuredPartners = orgs.filter((o) => o.tier === "premium" || o.tier === "school").slice(0, 3);
  const events = posts.filter((p) => p.type === "event").slice(0, 3);
  const closingSoon = posts.filter((p) => p.closingSoon || p.featured).slice(0, 3);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] xl:grid-cols-[260px_1fr_260px] gap-6 max-w-[1200px] mx-auto px-4 py-4 md:px-10 md:py-6">
      {/* ═══ Left Sidebar ═══ */}
      <FeedSidebar
        featuredPartners={featuredPartners}
        closingSoon={closingSoon}
        events={events}
        onSignOut={handleSignOut}
        userRole={userRole}
        orgRole={userOrgRole}
        hasOrg={hasOrg}
      />

      {/* ═══ Center Feed ═══ */}
      <div className="min-w-0" data-tour-step="feed">
        {/* Welcome greeting */}
        {user && (
          <div
            className="rounded-2xl mb-3"
            style={{
              padding: "16px 20px",
              background: "var(--card)",
              border: "1.5px solid var(--border)",
            }}
          >
            <h2 className="text-lg font-bold m-0" style={{ color: "var(--text)" }}>
              Welcome back, {user.displayName || "there"}!
            </h2>
            <p className="text-sm m-0 mt-1" style={{ color: "var(--text-sec)" }}>
              Here&apos;s what&apos;s new in your community
            </p>
          </div>
        )}

        {/* Create post prompt */}
        {user && (
          <div
            className="rounded-2xl mb-3 cursor-pointer"
            style={{
              padding: "14px 20px",
              background: "var(--card)",
              border: "1.5px solid var(--border)",
            }}
            onClick={() => setShowCreatePost(true)}
          >
            <div className="flex items-center gap-3">
              <Avatar
                name={user.displayName || "U"}
                size={36}
                src={user.photoURL || undefined}
              />
              <div
                className="flex-1 text-sm text-text-muted rounded-full"
                style={{
                  padding: "10px 16px",
                  background: "var(--bg)",
                  border: "1.5px solid var(--border)",
                }}
              >
                Share a story or update...
              </div>
              <button
                className="flex items-center gap-1.5 text-xs font-semibold border-none cursor-pointer rounded-lg"
                style={{
                  padding: "8px 12px",
                  background: "color-mix(in srgb, var(--teal) 10%, transparent)",
                  color: "var(--teal)",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreatePost(true);
                }}
              >
                &#128247; Photo
              </button>
            </div>
          </div>
        )}

        {/* Profile completeness */}
        <ProfileCompleteness />

        {/* Pending org banner */}
        {orgPending && (
          <div
            className="flex items-center gap-3 rounded-[14px] mb-3"
            style={{
              padding: "12px 16px",
              background: "var(--gold-soft)",
              border: "1.5px solid rgba(217,119,6,.25)",
            }}
          >
            <span
              className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0"
              style={{ background: "rgba(217,119,6,.15)" }}
            >
              &#9432;
            </span>
            <p className="text-sm text-text m-0">
              <strong style={{ color: "var(--gold)" }}>Your organization is under review.</strong>{" "}
              We&apos;ll notify you once approved. In the meantime, you can explore the community.
            </p>
          </div>
        )}

        {/* LIVE banner — only shown when an active livestream exists */}
        {livestream && (
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
              &#9679; LIVE
            </span>
            <span className="text-white text-sm font-semibold">{livestream.title}</span>
            <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,.7)" }}>Watch &#8594;</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-1.5 mb-3">
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
          {Object.entries(navTabs).map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className="px-4 py-2 rounded-full whitespace-nowrap font-semibold text-[13px] no-underline transition-colors"
              style={{
                background: "var(--border)",
                color: "var(--text-sec)",
              }}
            >
              {label}
            </Link>
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
        ) : tab === "Businesses" ? (
          vendors.length === 0 ? (
            <Card style={{ padding: 40, textAlign: "center" }}>
              <p className="text-3xl mb-2">&#127978;</p>
              <p className="text-sm font-bold text-text mb-1">No businesses found</p>
              <p className="text-sm text-text-muted">Indigenous businesses will be featured here soon.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {vendors.map((vendor) => (
                <VendorCard key={vendor.id} vendor={vendor} />
              ))}
            </div>
          )
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
      <FeedRightSidebar
        applications={applications}
        savedItems={savedItems}
      />

      {/* Create Post Modal */}
      <CreatePostModal
        open={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onPostCreated={handlePostCreated}
      />
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
            {post.location && <span>&#128205; {displayLocation(post.location)}</span>}
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
              {post.location && <span>&#128205; {displayLocation(post.location)}</span>}
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
              {post.location && <span>&#128205; {displayLocation(post.location)}</span>}
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
              {post.location && <span>&#128205; {displayLocation(post.location)}</span>}
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
              {post.location && <span>&#128205; {displayLocation(post.location)}</span>}
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

function VendorCard({ vendor }: { vendor: ShopVendor }) {
  const initial = vendor.name?.charAt(0)?.toUpperCase() || "?";
  const locationStr = vendor.location
    ? `${vendor.location.city}, ${vendor.location.province}`
    : null;

  return (
    <Link href={`/shop/${vendor.slug}`} className="no-underline">
      <Card className="cursor-pointer">
        <div style={{ padding: "16px 20px" }}>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0"
              style={{ background: "linear-gradient(135deg, var(--gold), #B45309)" }}
            >
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-text truncate m-0">{vendor.name}</p>
              <Badge text={vendor.category} color="var(--gold)" bg="var(--gold-soft)" small />
            </div>
          </div>
          {locationStr && (
            <p className="text-xs text-text-muted mb-2">&#128205; {locationStr}</p>
          )}
          <span
            className="text-xs font-semibold"
            style={{ color: "var(--gold)" }}
          >
            Visit &#8594;
          </span>
        </div>
      </Card>
    </Link>
  );
}
