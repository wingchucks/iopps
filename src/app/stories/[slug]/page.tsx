"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { getPost, getPosts, type Post } from "@/lib/firestore/posts";
import { getOrganization, type Organization } from "@/lib/firestore/organizations";
import { savePost, unsavePost, isPostSaved } from "@/lib/firestore/savedItems";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import ReportButton from "@/components/ReportButton";
import { displayLocation } from "@/lib/utils";

export default function StoryDetailPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <StoryDetailContent />
      </div>
    </ProtectedRoute>
  );
}

function StoryDetailContent() {
  const params = useParams();
  const slug = params.slug as string;
  const [post, setPost] = useState<Post | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [related, setRelated] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        // Try story-{slug} first, then spotlight-{slug}, then raw slug
        let postData = await getPost(`story-${slug}`);
        if (!postData) postData = await getPost(`spotlight-${slug}`);
        if (!postData) postData = await getPost(slug);
        setPost(postData);
        if (postData?.orgId) {
          const orgData = await getOrganization(postData.orgId);
          setOrg(orgData);
        }
        if (postData && user) {
          const isSaved = await isPostSaved(user.uid, postData.id);
          setSaved(isSaved);
        }
        // Load related stories and spotlights
        const [stories, spotlights] = await Promise.all([
          getPosts({ type: "story", max: 10 }),
          getPosts({ type: "spotlight", max: 10 }),
        ]);
        const all = [...stories, ...spotlights];
        setRelated(
          all
            .filter((s) => s.id !== `story-${slug}` && s.id !== `spotlight-${slug}` && s.id !== slug)
            .slice(0, 3)
        );
      } catch (err) {
        console.error("Failed to load story:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, user]);

  const handleSave = async () => {
    if (!user || !post) return;
    setActionLoading("save");
    try {
      if (saved) {
        await unsavePost(user.uid, post.id);
        setSaved(false);
      } else {
        await savePost(user.uid, post.id, post.title, post.type);
        setSaved(true);
      }
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setActionLoading("");
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("Link copied to clipboard!", "success");
    } catch {
      showToast("Failed to copy link", "error");
    }
  };

  if (loading) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-6 md:px-10 md:py-8">
        <div className="skeleton h-4 w-24 rounded mb-4" />
        <div className="skeleton h-[180px] rounded-2xl mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="skeleton h-[150px] rounded-2xl mb-6" />
            <div className="skeleton h-[100px] rounded-2xl" />
          </div>
          <div>
            <div className="skeleton h-[280px] rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-[600px] mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">&#128214;</p>
        <h2 className="text-2xl font-extrabold text-text mb-2">Story Not Found</h2>
        <p className="text-text-sec mb-6">This story doesn&apos;t exist or may have been removed.</p>
        <Link href="/feed">
          <Button primary>Back to Feed &#8594;</Button>
        </Link>
      </div>
    );
  }

  const isSpotlight = post.type === "spotlight";
  const orgLink = org ? `/org/${org.id}` : "#";
  const isPremium = org?.tier === "premium";

  return (
    <div className="max-w-[900px] mx-auto px-4 py-6 md:px-10 md:py-8">
      {/* Back link */}
      <Link
        href="/feed"
        className="inline-flex items-center gap-1 text-sm text-text-muted no-underline hover:text-teal mb-4"
      >
        &#8592; Back to Feed
      </Link>

      {/* Hero Banner */}
      <div
        className="rounded-2xl mb-6 relative overflow-hidden"
        style={{
          background: isSpotlight
            ? "linear-gradient(135deg, rgba(217,119,6,.08), rgba(15,43,76,.06))"
            : "linear-gradient(135deg, rgba(5,150,105,.06), rgba(13,148,136,.08))",
          padding: "clamp(24px, 4vw, 48px)",
        }}
      >
        <div className="text-center">
          <span className="text-6xl sm:text-7xl block mb-4">
            {isSpotlight ? <>&#127775;</> : <>&#128214;</>}
          </span>
          <div className="flex flex-wrap justify-center gap-2 mb-3">
            <Badge
              text={isSpotlight ? "Partner Spotlight" : "Success Story"}
              color={isSpotlight ? "var(--gold)" : "var(--green)"}
              bg={isSpotlight ? "var(--gold-soft)" : "var(--green-soft)"}
              small
            />
            {post.featured && (
              <Badge text="Featured" color="var(--gold)" bg="var(--gold-soft)" small icon={<span>&#11088;</span>} />
            )}
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-text mb-2">{post.title}</h1>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-text-sec">
            {(post.author || post.orgName) && (
              <span>By {post.author || post.orgName}</span>
            )}
            {post.community && <span>{post.community}</span>}
            {post.location && <span>&#128205; {displayLocation(post.location)}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2">
          {/* Author/Org Header */}
          {(org || post.orgName) && (
            <div className="flex items-center gap-3 mb-6">
              <Avatar
                name={post.orgShort || org?.shortName || post.orgName || ""}
                size={40}
                gradient={
                  isSpotlight
                    ? "linear-gradient(135deg, rgba(217,119,6,.25), rgba(15,43,76,.19))"
                    : isPremium
                    ? "linear-gradient(135deg, var(--navy), var(--teal))"
                    : undefined
                }
              />
              <div>
                {org ? (
                  <Link href={orgLink} className="text-[15px] text-teal font-bold no-underline hover:underline">
                    {post.orgName || org.name}
                  </Link>
                ) : (
                  <p className="text-[15px] text-teal font-bold m-0">{post.orgName}</p>
                )}
                {isPremium && (
                  <div className="flex items-center gap-1.5">
                    <Badge text="&#10003; Premium Partner" color="var(--gold)" bg="var(--gold-soft)" small />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quote */}
          {post.quote && (
            <div
              className="rounded-xl mb-6"
              style={{
                padding: "20px 24px",
                background: isSpotlight
                  ? "rgba(217,119,6,.04)"
                  : "rgba(5,150,105,.04)",
                borderLeft: `4px solid ${isSpotlight ? "var(--gold)" : "var(--green)"}`,
              }}
            >
              <p className="text-[17px] font-semibold italic text-text leading-relaxed m-0">
                &quot;{post.quote}&quot;
              </p>
              {(post.author || post.title) && (
                <p className="text-sm text-text-sec mt-2 m-0">
                  &mdash; {post.author || post.title}
                  {post.community && <>, {post.community}</>}
                </p>
              )}
            </div>
          )}

          {/* Description / Full Content */}
          {post.description && (
            <>
              <h3 className="text-lg font-bold text-text mb-2">
                {isSpotlight ? "About This Spotlight" : "The Story"}
              </h3>
              <p className="text-[15px] text-text-sec leading-[1.8] mb-6 whitespace-pre-line">
                {post.description}
              </p>
            </>
          )}

          {/* Excerpt (if separate from description) */}
          {post.excerpt && post.excerpt !== post.description && (
            <>
              <h3 className="text-lg font-bold text-text mb-2">Summary</h3>
              <p className="text-sm text-text-sec leading-relaxed mb-6 whitespace-pre-line">
                {post.excerpt}
              </p>
            </>
          )}

          {/* Organization Info */}
          {org && (
            <>
              <h3 className="text-lg font-bold text-text mb-2">About {org.shortName}</h3>
              <p className="text-sm text-text-sec leading-relaxed mb-6">
                {org.description}
              </p>
            </>
          )}

          {/* Tags */}
          {post.badges && post.badges.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {post.badges.map((b) => (
                <span
                  key={b}
                  className="rounded-xl text-[13px] font-semibold"
                  style={{
                    padding: "8px 14px",
                    background: isSpotlight
                      ? "rgba(217,119,6,.06)"
                      : "rgba(13,148,136,.06)",
                    border: isSpotlight
                      ? "1.5px solid rgba(217,119,6,.1)"
                      : "1.5px solid rgba(13,148,136,.1)",
                    color: isSpotlight ? "var(--gold)" : "var(--teal)",
                  }}
                >
                  {b}
                </span>
              ))}
            </div>
          )}

          {/* Related Stories */}
          {related.length > 0 && (
            <>
              <h3 className="text-lg font-bold text-text mb-3">More Stories</h3>
              <div className="flex flex-col gap-2 mb-6">
                {related.map((r) => {
                  const rSlug = r.id.replace(/^(story|spotlight)-/, "");
                  const rIsSpotlight = r.type === "spotlight";
                  return (
                    <Link key={r.id} href={`/stories/${rSlug}`} className="no-underline">
                      <Card className="cursor-pointer">
                        <div className="flex gap-3 items-center" style={{ padding: "14px 16px" }}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                text={rIsSpotlight ? "Spotlight" : "Story"}
                                color={rIsSpotlight ? "var(--gold)" : "var(--green)"}
                                bg={rIsSpotlight ? "var(--gold-soft)" : "var(--green-soft)"}
                                small
                              />
                            </div>
                            <h4 className="text-sm font-bold text-text m-0 mb-0.5">{r.title}</h4>
                            <div className="flex flex-wrap gap-2 text-xs text-text-sec">
                              {r.orgName && <span>{r.orgName}</span>}
                              {r.community && <span>{r.community}</span>}
                            </div>
                          </div>
                          <span className="text-text-muted">&#8250;</span>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div>
          {/* Save & Share Card */}
          <Card className="mb-4" style={{ position: "sticky", top: 80 }}>
            <div style={{ padding: 20 }}>
              <Button
                full
                onClick={handleSave}
                style={{
                  borderRadius: 14,
                  padding: "14px 24px",
                  fontSize: 14,
                  fontWeight: 700,
                  marginBottom: 12,
                  opacity: actionLoading === "save" ? 0.7 : 1,
                }}
              >
                {saved ? "&#10004; Saved" : "&#128278; Save Story"}
              </Button>

              <Button
                full
                onClick={handleCopyLink}
                style={{
                  borderRadius: 14,
                  padding: "12px 24px",
                  fontSize: 14,
                  marginBottom: 16,
                }}
              >
                &#128279; Copy Link
              </Button>

              <div className="border-t border-border pt-4">
                <p className="text-xs font-bold text-text-muted mb-3 tracking-[1px]">
                  {isSpotlight ? "SPOTLIGHT DETAILS" : "STORY DETAILS"}
                </p>
                <div className="flex flex-col gap-2.5">
                  <div className="flex justify-between">
                    <span className="text-xs text-text-muted">Type</span>
                    <span
                      className="text-xs font-semibold"
                      style={{ color: isSpotlight ? "var(--gold)" : "var(--green)" }}
                    >
                      {isSpotlight ? "Partner Spotlight" : "Success Story"}
                    </span>
                  </div>
                  {post.community && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Community</span>
                      <span className="text-xs font-semibold text-text">{post.community}</span>
                    </div>
                  )}
                  {(post.author || post.orgName) && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">{isSpotlight ? "Organization" : "Author"}</span>
                      <span className="text-xs font-semibold text-text">{post.author || post.orgName}</span>
                    </div>
                  )}
                  {post.location && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Location</span>
                      <span className="text-xs font-semibold text-text">{displayLocation(post.location)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Organization Card */}
          {org && (
            <Card>
              <div style={{ padding: 16 }}>
                <p className="text-xs font-bold text-text-muted mb-3 tracking-[1px]">ABOUT THE ORGANIZATION</p>
                <div className="flex gap-2.5 items-center mb-2.5">
                  <Avatar
                    name={org.shortName}
                    size={36}
                    gradient={isPremium ? "linear-gradient(135deg, var(--navy), var(--teal))" : undefined}
                  />
                  <div>
                    <p className="text-sm font-bold text-text m-0">{org.shortName}</p>
                    <p className="text-[11px] text-text-muted m-0">
                      {org.openJobs} open roles
                      {org.employees && <> &bull; {org.employees} employees</>}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-text-sec leading-relaxed mb-3">
                  {(org.description || "").length > 120 ? (org.description || "").slice(0, 120) + "..." : org.description}
                </p>
                <Link href={orgLink} className="text-xs text-teal font-semibold no-underline hover:underline">
                  View Organization Profile &#8594;
                </Link>
              </div>
            </Card>
          )}

          {/* Report */}
          <div className="mt-3 text-center">
            <ReportButton
              targetType="post"
              targetId={post.id}
              targetTitle={post.title}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
