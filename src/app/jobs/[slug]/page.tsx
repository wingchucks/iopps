"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { getPost, type Post } from "@/lib/firestore/posts";
import { getOrganization, type Organization } from "@/lib/firestore/organizations";
import { savePost, unsavePost } from "@/lib/firestore/savedItems";
import { hasApplied } from "@/lib/firestore/applications";
import { useAuth } from "@/lib/auth-context";
import ReportButton from "@/components/ReportButton";
import { displayLocation } from "@/lib/utils";

export default function JobDetailPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <JobDetailContent />
      </div>
    </ProtectedRoute>
  );
}

function JobDetailContent() {
  const params = useParams();
  const slug = params.slug as string;
  const [post, setPost] = useState<Post | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    async function load() {
      try {
        const postData = await getPost(`job-${slug}`);
        setPost(postData);
        if (postData?.orgId) {
          const orgData = await getOrganization(postData.orgId);
          setOrg(orgData);
        }
        if (postData && user) {
          const alreadyApplied = await hasApplied(user.uid, postData.id);
          setApplied(alreadyApplied);
        }
      } catch (err) {
        console.error("Failed to load job:", err);
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
        await savePost(user.uid, post.id, post.title, post.type, post.orgName);
        setSaved(true);
      }
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setActionLoading("");
    }
  };

  const router = useRouter();

  if (loading) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-6 md:px-10 md:py-8">
        <div className="skeleton h-4 w-24 rounded mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="skeleton h-6 w-48 rounded mb-3" />
            <div className="skeleton h-10 w-80 rounded mb-3" />
            <div className="skeleton h-[200px] rounded-2xl mb-6" />
            <div className="skeleton h-[150px] rounded-2xl" />
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
        <p className="text-5xl mb-4">💼</p>
        <h2 className="text-2xl font-extrabold text-text mb-2">Job Not Found</h2>
        <p className="text-text-sec mb-6">This job posting doesn&apos;t exist or may have been removed.</p>
        <Link href="/feed">
          <Button primary>Back to Feed →</Button>
        </Link>
      </div>
    );
  }

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {post.featured && (
                <Badge text="Featured" color="var(--gold)" bg="var(--gold-soft)" small icon={<span>&#11088;</span>} />
              )}
              {post.closingSoon && (
                <Badge text="Closing Soon" color="var(--red)" bg="var(--red-soft)" small />
              )}
              {post.jobType && (
                <Badge text={post.jobType} color="var(--blue)" bg="var(--blue-soft)" small />
              )}
              {post.badges?.filter(b => b !== "Featured" && b !== "Closing Soon").map((b) => (
                <Badge key={b} text={b} color="var(--green)" bg="var(--green-soft)" small />
              ))}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text mb-3">{post.title}</h1>
            <div className="flex items-center gap-3 mb-3">
              <Avatar
                name={post.orgShort || ""}
                size={40}
                gradient={isPremium ? "linear-gradient(135deg, var(--navy), var(--teal))" : undefined}
              />
              <div>
                <Link href={orgLink} className="text-[15px] text-teal font-bold no-underline hover:underline">
                  {post.orgName}
                </Link>
                <div className="flex items-center gap-1.5">
                  {isPremium && (
                    <Badge text="&#10003; Premium Partner" color="var(--gold)" bg="var(--gold-soft)" small />
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-text-sec">
              {post.location && <span>&#128205; {displayLocation(post.location)}</span>}
              {post.salary && <span>&#128176; {post.salary}</span>}
              {post.deadline && <span>&#128197; Deadline: {post.deadline}</span>}
            </div>
          </div>

          {/* Description */}
          {post.description && (
            <>
              <h3 className="text-lg font-bold text-text mb-2">About This Role</h3>
              <p className="text-sm text-text-sec leading-relaxed mb-6 whitespace-pre-line">
                {post.description}
              </p>
            </>
          )}

          {/* Responsibilities */}
          {post.responsibilities && post.responsibilities.length > 0 && (
            <>
              <h3 className="text-lg font-bold text-text mb-2">Responsibilities</h3>
              <ul className="mb-6 pl-0 list-none">
                {post.responsibilities.map((r, i) => (
                  <li key={i} className="flex gap-2 items-start mb-2">
                    <span className="text-teal text-sm mt-0.5">&#10003;</span>
                    <span className="text-sm text-text-sec">{r}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Qualifications */}
          {post.qualifications && post.qualifications.length > 0 && (
            <>
              <h3 className="text-lg font-bold text-text mb-2">Qualifications</h3>
              <ul className="mb-6 pl-0 list-none">
                {post.qualifications.map((q, i) => (
                  <li key={i} className="flex gap-2 items-start mb-2">
                    <span className="text-blue text-sm mt-0.5">&#9679;</span>
                    <span className="text-sm text-text-sec">{q}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Benefits */}
          {post.benefits && post.benefits.length > 0 && (
            <>
              <h3 className="text-lg font-bold text-text mb-2">Benefits</h3>
              <div className="flex flex-wrap gap-2 mb-6">
                {post.benefits.map((b, i) => (
                  <span
                    key={i}
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
          {org && (org.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {(org.tags || []).map((t) => (
                <span
                  key={t}
                  className="rounded-xl text-[13px] font-semibold text-teal"
                  style={{
                    padding: "8px 14px",
                    background: "rgba(13,148,136,.06)",
                    border: "1.5px solid rgba(13,148,136,.1)",
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div>
          {/* Apply Card */}
          <Card className="mb-4" style={{ position: "sticky", top: 80 }}>
            <div style={{ padding: 20 }}>
              <Button
                primary
                full
                onClick={() => {
                  if (!applied) router.push(`/jobs/${slug}/apply`);
                }}
                style={{
                  background: applied ? "var(--green)" : "var(--teal)",
                  padding: "14px 24px",
                  borderRadius: 14,
                  fontSize: 16,
                  fontWeight: 700,
                  marginBottom: 12,
                  cursor: applied ? "default" : "pointer",
                }}
              >
                {applied ? "\u2713 Applied" : "Apply Now"}
              </Button>
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
                {saved ? "✓ Saved" : "&#128278; Save Job"}
              </Button>

              <div className="border-t border-border pt-4">
                <p className="text-xs font-bold text-text-muted mb-3 tracking-[1px]">JOB DETAILS</p>
                <div className="flex flex-col gap-2.5">
                  {post.jobType && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Type</span>
                      <span className="text-xs font-semibold text-text">{post.jobType}</span>
                    </div>
                  )}
                  {post.salary && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Salary</span>
                      <span className="text-xs font-semibold text-text">{post.salary}</span>
                    </div>
                  )}
                  {post.location && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Location</span>
                      <span className="text-xs font-semibold text-text">{displayLocation(post.location)}</span>
                    </div>
                  )}
                  {post.deadline && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Deadline</span>
                      <span className="text-xs font-semibold text-red">{post.deadline}</span>
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

          {/* Company Card */}
          {org && (
            <Card>
              <div style={{ padding: 16 }}>
                <p className="text-xs font-bold text-text-muted mb-3 tracking-[1px]">ABOUT THE COMPANY</p>
                <div className="flex gap-2.5 items-center mb-2.5">
                  <Avatar
                    name={org.shortName}
                    size={36}
                    gradient={isPremium ? "linear-gradient(135deg, var(--navy), var(--teal))" : undefined}
                  />
                  <div>
                    <p className="text-sm font-bold text-text m-0">{org.shortName}</p>
                    <p className="text-[11px] text-text-muted m-0">
                      {org.openJobs} open jobs
                      {org.employees && <> &bull; {org.employees} employees</>}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-text-sec leading-relaxed mb-3">
                  {(org.description || "").length > 120 ? (org.description || "").slice(0, 120) + "..." : org.description}
                </p>
                <Link href={orgLink} className="text-xs text-teal font-semibold no-underline hover:underline">
                  View Company Profile &#8594;
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
