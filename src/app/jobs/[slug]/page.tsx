"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { savePost, unsavePost, isPostSaved } from "@/lib/firestore/savedItems";
import { hasApplied } from "@/lib/firestore/applications";
import { useAuth } from "@/lib/auth-context";
import type { Job } from "@/lib/firestore/jobs";

export default function JobDetailPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <div className="min-h-screen bg-bg">
          <JobDetailContent />
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

function JobDetailContent() {
  const params = useParams();
  const slug = params.slug as string;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function load() {
      // Load job data
      try {
        const res = await fetch(`/api/jobs/${slug}`);
        if (!res.ok) {
          setJob(null);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setJob(data.job ?? null);
      } catch (err) {
        console.error("Failed to load job:", err);
        setJob(null);
      } finally {
        setLoading(false);
      }

      // Check saved/applied status separately — don't let these crash the job display
      if (user) {
        try {
          const alreadyApplied = await hasApplied(user.uid, slug);
          setApplied(alreadyApplied);
        } catch { /* ignore — user just won't see applied state */ }
        try {
          const alreadySaved = await isPostSaved(user.uid, slug);
          setSaved(alreadySaved);
        } catch { /* ignore — user just won't see saved state */ }
      }
    }
    load();
  }, [slug, user]);

  const handleSave = async () => {
    if (!user || !job) return;
    setActionLoading("save");
    try {
      if (saved) {
        await unsavePost(user.uid, slug);
        setSaved(false);
      } else {
        await savePost(user.uid, slug, job.title, "job", job.employerName || job.orgName || "");
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

  if (!job) {
    return (
      <div className="max-w-[600px] mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">💼</p>
        <h2 className="text-2xl font-extrabold text-text mb-2">Job Not Found</h2>
        <p className="text-text-sec mb-6">This job posting doesn&apos;t exist or may have been removed.</p>
        <Link href="/jobs">
          <Button primary>Browse Jobs →</Button>
        </Link>
      </div>
    );
  }

  const jobType = job.employmentType || job.jobType;
  const employerName = job.employerName || job.orgName || job.orgShort || "";
  const closingDate = job.closingDate
    ? new Date(job.closingDate as string).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })
    : null;
  const applicationUrl = job.applicationUrl
    || (job as unknown as Record<string, unknown>).applicationLink as string | undefined
    || (job as unknown as Record<string, unknown>).externalUrl as string | undefined
    || (job as unknown as Record<string, unknown>).externalApplyUrl as string | undefined;
  const workLocation = (job as unknown as Record<string, unknown>).workLocation as string | undefined;
  const category = (job as unknown as Record<string, unknown>).category as string | undefined;
  const positions = (job as unknown as Record<string, unknown>).positions as string | undefined;
  const requiresResume = !!(job as unknown as Record<string, unknown>).requiresResume;
  const requiresCoverLetter = !!(job as unknown as Record<string, unknown>).requiresCoverLetter;
  const requiresReferences = !!(job as unknown as Record<string, unknown>).requiresReferences;

  return (
    <div className="max-w-[900px] mx-auto px-4 py-6 md:px-10 md:py-8">
      {/* Back link */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1 text-sm text-text-muted no-underline hover:text-teal mb-4"
      >
        ← Back to Jobs
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {job.featured && (
                <Badge text="Featured" color="var(--gold)" bg="var(--gold-soft)" small icon={<span>⭐</span>} />
              )}
              {jobType && (
                <Badge text={jobType} color="var(--blue)" bg="var(--blue-soft)" small />
              )}
              {workLocation && (
                <Badge text={workLocation} color="var(--teal)" bg="var(--teal-soft)" small />
              )}
              {job.indigenousPreference && (
                <Badge text="Indigenous Preference" color="var(--teal)" bg="var(--teal-soft)" small />
              )}
              {!!(job as unknown as Record<string, unknown>).willTrain && (
                <Badge text="Will Train" color="var(--green)" bg="var(--green-soft, rgba(16,185,129,.12))" small />
              )}
              {!!(job as unknown as Record<string, unknown>).driversLicense && (
                <Badge text="Driver's License Required" color="var(--amber)" bg="var(--amber-soft, rgba(217,119,6,.12))" small />
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-text mb-3">{job.title}</h1>

            <div className="flex items-center gap-3 mb-3">
              <Avatar
                name={job.orgShort || employerName}
                size={40}
                gradient="linear-gradient(135deg, var(--navy), var(--blue))"
              />
              <div>
                <p className="text-[15px] text-teal font-bold m-0">{employerName}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-text-sec">
              {job.location && <span>📍 {job.location}</span>}
              {job.salary && typeof job.salary === "string" && <span>💰 {job.salary}</span>}
              {closingDate && <span>📅 Closes: {closingDate}</span>}
            </div>
          </div>

          {/* Description */}
          {job.description ? (
            <>
              <h3 className="text-lg font-bold text-text mb-2">About This Role</h3>
              {job.description.includes("<") ? (
                <div
                  className="text-sm text-text-sec leading-relaxed mb-6 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: job.description }}
                />
              ) : (
                <p className="text-sm text-text-sec leading-relaxed mb-6 whitespace-pre-line">
                  {job.description}
                </p>
              )}
            </>
          ) : applicationUrl ? (
            <div className="mb-6 p-5 rounded-2xl border border-border bg-[var(--card)]">
              <p className="text-sm text-text-sec mb-4">
                Full job details are available on the employer&apos;s career site.
              </p>
              <a href={applicationUrl} target="_blank" rel="noopener noreferrer" className="no-underline">
                <Button primary style={{ borderRadius: 12, padding: "12px 24px", fontSize: 15, fontWeight: 700 }}>
                  View Full Details &amp; Apply ↗
                </Button>
              </a>
            </div>
          ) : null}

          {/* Requirements */}
          {job.requirements && (
            <>
              <h3 className="text-lg font-bold text-text mb-2">Requirements</h3>
              <p className="text-sm text-text-sec leading-relaxed mb-6 whitespace-pre-line">
                {job.requirements}
              </p>
            </>
          )}

          {/* Responsibilities */}
          {Array.isArray((job as unknown as Record<string, unknown>).responsibilities) &&
            ((job as unknown as Record<string, unknown>).responsibilities as string[]).length > 0 && (
            <>
              <h3 className="text-lg font-bold text-text mb-2">Responsibilities</h3>
              <ul className="mb-6 pl-0 list-none">
                {((job as unknown as Record<string, unknown>).responsibilities as string[]).map((r, i) => (
                  <li key={i} className="flex gap-2 items-start mb-2">
                    <span className="text-teal text-sm mt-0.5">✓</span>
                    <span className="text-sm text-text-sec">{r}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Qualifications */}
          {Array.isArray((job as unknown as Record<string, unknown>).qualifications) &&
            ((job as unknown as Record<string, unknown>).qualifications as string[]).length > 0 && (
            <>
              <h3 className="text-lg font-bold text-text mb-2">Qualifications</h3>
              <ul className="mb-6 pl-0 list-none">
                {((job as unknown as Record<string, unknown>).qualifications as string[]).map((q, i) => (
                  <li key={i} className="flex gap-2 items-start mb-2">
                    <span className="text-blue text-sm mt-0.5">•</span>
                    <span className="text-sm text-text-sec">{q}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div>
          <Card className="mb-4" style={{ position: "sticky", top: 80 }}>
            <div style={{ padding: 20 }}>
              {/* Apply button */}
              {applicationUrl ? (
                <a href={applicationUrl} target="_blank" rel="noopener noreferrer" className="block no-underline mb-3">
                  <Button
                    primary
                    full
                    style={{ padding: "14px 24px", borderRadius: 14, fontSize: 16, fontWeight: 700 }}
                  >
                    Apply Now ↗
                  </Button>
                </a>
              ) : (
                <Button
                  primary
                  full
                  onClick={() => { if (!applied) router.push(`/jobs/${slug}/apply`); }}
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
                  {applied ? "✓ Applied" : "Apply Now"}
                </Button>
              )}

              {/* Save button */}
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
                {saved ? "✓ Saved" : "🔖 Save Job"}
              </Button>

              {/* Job Details */}
              <div className="border-t border-border pt-4">
                <p className="text-xs font-bold text-text-muted mb-3 tracking-[1px]">JOB DETAILS</p>
                <div className="flex flex-col gap-2.5">
                  {jobType && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Type</span>
                      <span className="text-xs font-semibold text-text">{jobType}</span>
                    </div>
                  )}
                  {job.salary && typeof job.salary === "string" && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Salary</span>
                      <span className="text-xs font-semibold text-text">{job.salary}</span>
                    </div>
                  )}
                  {job.location && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Location</span>
                      <span className="text-xs font-semibold text-text">{job.location}</span>
                    </div>
                  )}
                  {closingDate && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Deadline</span>
                      <span className="text-xs font-semibold" style={{ color: "var(--red, #ef4444)" }}>{closingDate}</span>
                    </div>
                  )}
                  {job.department && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Department</span>
                      <span className="text-xs font-semibold text-text">{job.department}</span>
                    </div>
                  )}
                  {category && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Category</span>
                      <span className="text-xs font-semibold text-text">{category}</span>
                    </div>
                  )}
                  {positions && positions !== "1" && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Openings</span>
                      <span className="text-xs font-semibold text-text">{positions}</span>
                    </div>
                  )}
                  {!!(job as unknown as Record<string, unknown>).willTrain && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Training</span>
                      <span className="text-xs font-semibold" style={{ color: "var(--green)" }}>Will Train ✓</span>
                    </div>
                  )}
                  {!!(job as unknown as Record<string, unknown>).driversLicense && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Driver&apos;s License</span>
                      <span className="text-xs font-semibold" style={{ color: "var(--amber)" }}>Required</span>
                    </div>
                  )}
                </div>
              </div>
              {(requiresResume || requiresCoverLetter || requiresReferences) && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs font-bold text-text-muted mb-2 tracking-[1px]">TO APPLY</p>
                  <div className="flex flex-col gap-1.5">
                    {requiresResume && <span className="text-xs text-text-sec">📄 Resume / CV required</span>}
                    {requiresCoverLetter && <span className="text-xs text-text-sec">✉️ Cover letter required</span>}
                    {requiresReferences && <span className="text-xs text-text-sec">👥 References required</span>}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
