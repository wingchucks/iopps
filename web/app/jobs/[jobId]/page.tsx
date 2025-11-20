"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  createJobApplication,
  getJobPosting,
  incrementJobViews,
  listSavedJobIds,
  toggleSavedJob,
} from "@/lib/firestore";
import type { JobPosting } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import { ButtonLink } from "@/components/ui/ButtonLink";

export default function JobDetailPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params?.jobId;
  const [job, setJob] = useState<JobPosting | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applyNote, setApplyNote] = useState("");
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);
  const { user, role } = useAuth();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    (async () => {
      const data = await getJobPosting(jobId);
      setJob(data);
      setLoading(false);
      if (data) {
        try {
          await incrementJobViews(jobId);
          if (user && role === "community") {
            const ids = await listSavedJobIds(user.uid);
            setSaved(ids.includes(jobId));
          }
        } catch (err) {
          console.error("Failed to record job view", err);
        }
      }
    })();
  }, [jobId, role, user]);

  const handleApply = async (event: FormEvent) => {
    event.preventDefault();
    if (!job || !user) return;
    setApplying(true);
    setApplyError(null);
    setApplySuccess(null);

    try {
      await createJobApplication({
        jobId: job.id,
        employerId: job.employerId,
        memberId: user.uid,
        memberEmail: user.email ?? undefined,
        memberDisplayName: user.displayName ?? undefined,
        note: applyNote || undefined,
      });
      setApplySuccess(
        "Application recorded. Follow any external instructions above to complete your application."
      );
      setApplyNote("");
    } catch (err) {
      console.error(err);
      setApplyError(
        err instanceof Error ? err.message : "Could not submit application."
      );
    } finally {
      setApplying(false);
    }
  };

  const handleSaveToggle = async () => {
    if (!job || !user || role !== "community") return;
    setSaving(true);
    try {
      await toggleSavedJob(user.uid, job.id, !saved);
      setSaved(!saved);
    } catch (err) {
      console.error("Failed to toggle save", err);
      setApplyError(
        err instanceof Error ? err.message : "Could not update saved jobs."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-slate-300">Loading job...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Job not found</h1>
        <p className="text-sm text-slate-300">
          This posting may have been removed or is not active yet.
        </p>
        <ButtonLink href="/jobs">Back to jobs</ButtonLink>
      </div>
    );
  }

  const isEmployerOwner =
    role === "employer" && user && job.employerId === user.uid;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-teal-300">
          Job listing
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {job.title}
        </h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-lg text-slate-200">
            {job.employerName || "Employer"}
          </p>
          {role === "community" && user && (
            <button
              onClick={handleSaveToggle}
              disabled={saving}
              className={`rounded-md border px-3 py-1 text-xs ${
                saved
                  ? "border-teal-400 text-teal-200"
                  : "border-slate-700 text-slate-200 hover:border-teal-400 hover:text-teal-200"
              }`}
            >
              {saving ? "Updating..." : saved ? "Saved" : "Save job"}
            </button>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-300">
          <span>{job.location}</span>
          <span aria-hidden className="text-slate-600">|</span>
          <span>{job.employmentType}</span>
          {job.remoteFlag && (
            <>
              <span aria-hidden className="text-slate-600">|</span>
              <span>Remote / Hybrid</span>
            </>
          )}
          {job.indigenousPreference && (
            <span className="rounded-full bg-teal-500/10 px-3 py-1 text-xs text-teal-200">
              Indigenous preference
            </span>
          )}
        </div>
      </div>

      {isEmployerOwner && (
        <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
          <p className="font-semibold text-slate-100">
            You published this posting as an employer.
          </p>
          <p className="mt-1">
            Manage applicants, edit details, or pause the role from your
            employer dashboard.
          </p>
          <Link
            href="/employer#opportunities"
            className="mt-3 inline-flex text-xs font-semibold text-teal-300 underline"
          >
            Go to employer dashboard
          </Link>
        </section>
      )}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-50">About</h2>
          <p className="mt-2 text-sm text-slate-300 whitespace-pre-line">
            {job.description}
          </p>
        </div>
        {job.responsibilities && job.responsibilities.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Responsibilities
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
              {job.responsibilities.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        {job.qualifications && job.qualifications.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Qualifications
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
              {job.qualifications.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap gap-3 text-sm text-slate-300">
          {job.salaryRange && <span>Salary: {job.salaryRange}</span>}
          {job.closingDate && (
            <span>
              Closing:{" "}
              {typeof job.closingDate === "string"
                ? job.closingDate
                : job.closingDate?.toDate().toLocaleDateString()}
            </span>
          )}
          {typeof job.viewsCount === "number" && (
            <span>Views: {job.viewsCount}</span>
          )}
          {typeof job.applicationsCount === "number" && (
            <span>Applications: {job.applicationsCount}</span>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-50">Apply</h2>
        {job.applicationLink && (
          <ButtonLink href={job.applicationLink} target="_blank">
            Apply on employer site
          </ButtonLink>
        )}
        {job.applicationEmail && (
          <p className="text-sm text-slate-300">
            Or email:{" "}
            <a
              className="text-teal-300 underline"
              href={`mailto:${job.applicationEmail}`}
            >
              {job.applicationEmail}
            </a>
          </p>
        )}

        {role === "community" && user && (
          <form onSubmit={handleApply} className="mt-4 space-y-3">
            <p className="text-sm text-slate-300">
              Record your application so you can track it in your member
              dashboard. Be sure to still complete any external application
              steps above.
            </p>
            <label className="block text-sm font-medium text-slate-200">
              Note to yourself (optional)
            </label>
            <textarea
              value={applyNote}
              onChange={(e) => setApplyNote(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
              placeholder="Example: Submitted resume on employer portal on Nov 10."
            />
            {applyError && (
              <p className="text-sm text-red-400">{applyError}</p>
            )}
            {applySuccess && (
              <p className="text-sm text-teal-300">{applySuccess}</p>
            )}
            <button
              type="submit"
              disabled={applying}
              className="rounded-md bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-teal-400 disabled:opacity-60"
            >
              {applying ? "Recording..." : "Record my application"}
            </button>
          </form>
        )}

        {role !== "community" && (
          <div className="text-xs text-slate-400">
            <p>Sign in as a community member to save jobs and track applications.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <ButtonLink href="/login" variant="outline">
                Login
              </ButtonLink>
              <ButtonLink href="/register" variant="outline">
                Create account
              </ButtonLink>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
