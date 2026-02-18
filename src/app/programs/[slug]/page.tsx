"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { getPost, getPosts, type Post } from "@/lib/firestore/posts";
import { getOrganization, type Organization } from "@/lib/firestore/organizations";
import { savePost, unsavePost, isPostSaved } from "@/lib/firestore/savedItems";
import { useAuth } from "@/lib/auth-context";
import ReportButton from "@/components/ReportButton";
import { displayLocation } from "@/lib/utils";

export default function ProgramDetailPage() {
  return (
    <ProtectedRoute>
      <AppShell>
      <div className="min-h-screen bg-bg">
        <ProgramDetailContent />
      </div>
    </AppShell>
    </ProtectedRoute>
  );
}

function ProgramDetailContent() {
  const params = useParams();
  const slug = params.slug as string;
  const [post, setPost] = useState<Post | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [related, setRelated] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    async function load() {
      try {
        const postData = await getPost(`program-${slug}`);
        setPost(postData);
        if (postData?.orgId) {
          const orgData = await getOrganization(postData.orgId);
          setOrg(orgData);
        }
        if (postData && user) {
          const isSaved = await isPostSaved(user.uid, postData.id);
          setSaved(isSaved);
        }
        // Load related programs from the same org, or any programs
        const allPrograms = await getPosts({ type: "program", max: 10 });
        setRelated(
          allPrograms.filter((p) => p.id !== `program-${slug}`).slice(0, 3)
        );
      } catch (err) {
        console.error("Failed to load program:", err);
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
        <p className="text-5xl mb-4">&#128218;</p>
        <h2 className="text-2xl font-extrabold text-text mb-2">Program Not Found</h2>
        <p className="text-text-sec mb-6">This program doesn&apos;t exist or may have been removed.</p>
        <Link href="/programs">
          <Button primary>Browse Programs &#8594;</Button>
        </Link>
      </div>
    );
  }

  const orgLink = org ? `/org/${org.id}` : "#";
  const isPremium = org?.tier === "premium";
  const isSchool = org?.tier === "school";

  return (
    <div className="max-w-[900px] mx-auto px-4 py-6 md:px-10 md:py-8">
      {/* Back link */}
      <Link
        href="/programs"
        className="inline-flex items-center gap-1 text-sm text-text-muted no-underline hover:text-teal mb-4"
      >
        &#8592; Back to Programs
      </Link>

      {/* Hero Banner */}
      <div
        className="rounded-2xl mb-6 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(13,148,136,.06), rgba(59,130,246,.08))",
          padding: "clamp(24px, 4vw, 48px)",
        }}
      >
        <div className="text-center">
          <span className="text-6xl sm:text-7xl block mb-4">&#128218;</span>
          <div className="flex flex-wrap justify-center gap-2 mb-3">
            <Badge text="Program" color="var(--teal)" bg="var(--teal-soft)" small />
            {post.featured && (
              <Badge text="Featured" color="var(--gold)" bg="var(--gold-soft)" small icon={<span>&#11088;</span>} />
            )}
            {post.credential && (
              <Badge text={post.credential} color="var(--blue)" bg="var(--blue-soft)" small />
            )}
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-text mb-2">{post.title}</h1>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-text-sec">
            {post.orgName && <span>{post.orgName}</span>}
            {post.duration && <span>&#9202; {post.duration}</span>}
            {post.dates && <span>&#128197; {post.dates}</span>}
            {post.location && <span>&#128205; {displayLocation(post.location)}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2">
          {/* Organization Header */}
          {org && (
            <div className="flex items-center gap-3 mb-6">
              <Avatar
                name={post.orgShort || org.shortName}
                size={40}
                gradient={
                  isSchool
                    ? "linear-gradient(135deg, var(--teal), var(--blue))"
                    : isPremium
                    ? "linear-gradient(135deg, var(--navy), var(--teal))"
                    : undefined
                }
              />
              <div>
                <Link href={orgLink} className="text-[15px] text-teal font-bold no-underline hover:underline">
                  {post.orgName || org.name}
                </Link>
                {(isPremium || isSchool) && (
                  <div className="flex items-center gap-1.5">
                    <Badge
                      text={isSchool ? "&#127891; Education Partner" : "&#10003; Premium Partner"}
                      color={isSchool ? "var(--teal)" : "var(--gold)"}
                      bg={isSchool ? "var(--teal-soft)" : "var(--gold-soft)"}
                      small
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {post.description && (
            <>
              <h3 className="text-lg font-bold text-text mb-2">About This Program</h3>
              <p className="text-sm text-text-sec leading-relaxed mb-6 whitespace-pre-line">
                {post.description}
              </p>
            </>
          )}

          {/* Highlights */}
          {post.highlights && post.highlights.length > 0 && (
            <>
              <h3 className="text-lg font-bold text-text mb-2">Program Highlights</h3>
              <ul className="mb-6 pl-0 list-none">
                {post.highlights.map((h, i) => (
                  <li key={i} className="flex gap-2 items-start mb-2">
                    <span className="text-teal text-sm mt-0.5">&#10003;</span>
                    <span className="text-sm text-text-sec">{h}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Requirements */}
          {post.requirements && post.requirements.length > 0 && (
            <>
              <h3 className="text-lg font-bold text-text mb-2">Requirements</h3>
              <ul className="mb-6 pl-0 list-none">
                {post.requirements.map((r, i) => (
                  <li key={i} className="flex gap-2 items-start mb-2">
                    <span className="text-teal text-sm mt-0.5">&#10003;</span>
                    <span className="text-sm text-text-sec">{r}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Eligibility */}
          {post.eligibility && (
            <>
              <h3 className="text-lg font-bold text-text mb-2">Eligibility</h3>
              <p className="text-sm text-text-sec leading-relaxed mb-6 whitespace-pre-line">
                {post.eligibility}
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
                  className="rounded-xl text-[13px] font-semibold text-teal"
                  style={{
                    padding: "8px 14px",
                    background: "rgba(13,148,136,.06)",
                    border: "1.5px solid rgba(13,148,136,.1)",
                  }}
                >
                  {b}
                </span>
              ))}
            </div>
          )}

          {/* Related Programs */}
          {related.length > 0 && (
            <>
              <h3 className="text-lg font-bold text-text mb-3">Related Programs</h3>
              <div className="flex flex-col gap-2 mb-6">
                {related.map((r) => {
                  const rSlug = r.id.replace(/^program-/, "");
                  return (
                    <Link key={r.id} href={`/programs/${rSlug}`} className="no-underline">
                      <Card className="cursor-pointer">
                        <div className="flex gap-3 items-center" style={{ padding: "14px 16px" }}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge text="Program" color="var(--teal)" bg="var(--teal-soft)" small />
                            </div>
                            <h4 className="text-sm font-bold text-text m-0 mb-0.5">{r.title}</h4>
                            <div className="flex flex-wrap gap-2 text-xs text-text-sec">
                              {r.orgName && <span>{r.orgName}</span>}
                              {r.duration && <span>&#9202; {r.duration}</span>}
                              {r.location && <span>&#128205; {r.location}</span>}
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
          {/* Learn More / Save Card */}
          <Card className="mb-4" style={{ position: "sticky", top: 80 }}>
            <div style={{ padding: 20 }}>
              {post.programUrl ? (
                <a href={post.programUrl} target="_blank" rel="noopener noreferrer" className="no-underline">
                  <Button
                    primary
                    full
                    style={{
                      background: "var(--teal)",
                      padding: "14px 24px",
                      borderRadius: 14,
                      fontSize: 16,
                      fontWeight: 700,
                      marginBottom: 12,
                    }}
                  >
                    Learn More &#8594;
                  </Button>
                </a>
              ) : post.applicationUrl ? (
                <a href={post.applicationUrl} target="_blank" rel="noopener noreferrer" className="no-underline">
                  <Button
                    primary
                    full
                    style={{
                      background: "var(--teal)",
                      padding: "14px 24px",
                      borderRadius: 14,
                      fontSize: 16,
                      fontWeight: 700,
                      marginBottom: 12,
                    }}
                  >
                    Apply Now &#8594;
                  </Button>
                </a>
              ) : (
                <Button
                  primary
                  full
                  style={{
                    background: "var(--teal)",
                    padding: "14px 24px",
                    borderRadius: 14,
                    fontSize: 16,
                    fontWeight: 700,
                    marginBottom: 12,
                    opacity: 0.6,
                    cursor: "default",
                  }}
                >
                  Details Coming Soon
                </Button>
              )}
              <Button
                full
                onClick={handleSave}
                style={{
                  borderRadius: 14,
                  padding: "12px 24px",
                  fontSize: 14,
                  marginBottom: 16,
                  opacity: actionLoading === "save" ? 0.7 : 1,
                }}
              >
                {saved ? "&#10004; Saved" : "&#128278; Save Program"}
              </Button>

              <div className="border-t border-border pt-4">
                <p className="text-xs font-bold text-text-muted mb-3 tracking-[1px]">PROGRAM DETAILS</p>
                <div className="flex flex-col gap-2.5">
                  {post.duration && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Duration</span>
                      <span className="text-xs font-semibold text-text">{post.duration}</span>
                    </div>
                  )}
                  {post.credential && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Credential</span>
                      <span className="text-xs font-semibold text-teal">{post.credential}</span>
                    </div>
                  )}
                  {post.dates && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Dates</span>
                      <span className="text-xs font-semibold text-text">{post.dates}</span>
                    </div>
                  )}
                  {post.location && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Location</span>
                      <span className="text-xs font-semibold text-text">{displayLocation(post.location)}</span>
                    </div>
                  )}
                  {post.orgName && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Organization</span>
                      <span className="text-xs font-semibold text-text">{post.orgName}</span>
                    </div>
                  )}
                  {post.source && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Source</span>
                      <span className="text-xs font-semibold text-text">{post.source}</span>
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
                    gradient={
                      isSchool
                        ? "linear-gradient(135deg, var(--teal), var(--blue))"
                        : isPremium
                        ? "linear-gradient(135deg, var(--navy), var(--teal))"
                        : undefined
                    }
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
