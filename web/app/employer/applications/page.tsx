"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  getMemberProfile,
  listEmployerApplications,
  listEmployerJobs,
  updateApplicationStatus,
} from "@/lib/firestore";
import type {
  ApplicationStatus,
  JobApplication,
  JobPosting,
} from "@/lib/types";

export default function ApplicationsInboxPage() {
  const { user, role, loading } = useAuth();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [selectedJob, setSelectedJob] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ApplicationStatus>(
    "all"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [appsLoading, setAppsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [memberInfo, setMemberInfo] = useState<
    Record<
      string,
      {
        resumeUrl?: string;
        messagingHandle?: string;
        availability?: string;
      }
    >
  >({});

  useEffect(() => {
    if (!user || role !== "employer") return;
    (async () => {
      try {
        setAppsLoading(true);
        const [apps, myJobs] = await Promise.all([
          listEmployerApplications(user.uid),
          listEmployerJobs(user.uid),
        ]);
        setApplications(apps);
        setJobs(myJobs);
        const memberIds = Array.from(new Set(apps.map((app) => app.memberId)));
        const entries = await Promise.all(
          memberIds.map(async (memberId) => {
            const profile = await getMemberProfile(memberId);
            return [
              memberId,
              {
                resumeUrl: profile?.resumeUrl,
                messagingHandle: profile?.messagingHandle,
                availability: profile?.availableForInterviews,
              },
            ] as const;
          })
        );
        setMemberInfo(Object.fromEntries(entries));
      } catch (err) {
        console.error(err);
        setError("Unable to load applications.");
      } finally {
        setAppsLoading(false);
      }
    })();
  }, [role, user]);

  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      if (selectedJob !== "all" && app.jobId !== selectedJob) return false;
      if (statusFilter !== "all" && app.status !== statusFilter) return false;
      if (searchTerm) {
        const text = `${app.memberDisplayName ?? ""} ${
          app.memberEmail ?? ""
        }`.toLowerCase();
        return text.includes(searchTerm.toLowerCase());
      }
      return true;
    });
  }, [applications, searchTerm, selectedJob, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<ApplicationStatus, number> = {
      submitted: 0,
      reviewed: 0,
      shortlisted: 0,
      rejected: 0,
      hired: 0,
    };
    applications.forEach((app) => {
      counts[app.status] = (counts[app.status] ?? 0) + 1;
    });
    return counts;
  }, [applications]);

  const handleStatusChange = async (
    applicationId: string,
    status: ApplicationStatus
  ) => {
    try {
      setUpdatingId(applicationId);
      await updateApplicationStatus(applicationId, status);
      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId ? { ...app, status } : app
        )
      );
    } catch (err) {
      console.error(err);
      setError("Could not update status.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm text-slate-300">Loading dashboard...</p>
      </div>
    );
  }

  if (!user || role !== "employer") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Employer access only
        </h1>
        <p className="text-sm text-slate-300">
          Sign in with an employer account to view applications.
        </p>
        <Link
          href="/login"
          className="rounded-md bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-teal-400"
        >
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-teal-300">
            Applications inbox
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Review candidates
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Filter by job or status, update stages, and follow up quickly.
          </p>
        </div>
        <Link href="/employer" className="text-xs text-teal-300 underline">
          Back to dashboard
        </Link>
      </div>

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-5">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div
              key={status}
              className="rounded-md border border-slate-800 bg-slate-900/70 p-3"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                {status}
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-50">
                {count}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <select
            value={selectedJob}
            onChange={(e) => setSelectedJob(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-teal-500 focus:outline-none"
          >
            <option value="all">All jobs</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | ApplicationStatus)
            }
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-teal-500 focus:outline-none"
          >
            <option value="all">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="reviewed">Reviewed</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="rejected">Rejected</option>
            <option value="hired">Hired</option>
          </select>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name or email"
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-teal-500 focus:outline-none"
          />
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        {appsLoading ? (
          <p className="mt-4 text-sm text-slate-300">Loading applications...</p>
        ) : filteredApps.length === 0 ? (
          <p className="mt-4 text-sm text-slate-300">
            No applications match your filters yet.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {filteredApps.map((app) => (
              <div
                key={app.id}
                className="rounded-md border border-slate-800 bg-slate-950/40 p-4"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-50">
                      {app.memberDisplayName || "Applicant"}
                    </p>
                    <p className="text-xs text-slate-300">
                      {app.memberEmail || "Email not provided"}
                    </p>
                    <p className="text-xs text-slate-400">
                      Applied on{" "}
                      {app.createdAt
                        ? typeof app.createdAt === "string"
                          ? app.createdAt
                          : app.createdAt.toDate().toLocaleDateString()
                        : ""}
                    </p>
                    <Link
                      href={`/jobs/${app.jobId}`}
                      className="mt-1 inline-flex text-xs text-teal-300 underline"
                    >
                      View job posting
                    </Link>
                    {memberInfo[app.memberId]?.availability && (
                      <p className="mt-1 text-xs text-slate-300">
                        Availability: {memberInfo[app.memberId]?.availability}
                      </p>
                    )}
                    {memberInfo[app.memberId]?.messagingHandle && (
                      <p className="text-xs text-slate-300">
                        Messaging handle: {memberInfo[app.memberId]?.messagingHandle}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                    <span className="rounded-full border border-slate-700 px-3 py-1 uppercase tracking-widest">
                      {app.status}
                    </span>
                    {memberInfo[app.memberId]?.resumeUrl && (
                      <a
                        href={memberInfo[app.memberId]?.resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-slate-700 px-3 py-1 hover:border-teal-400"
                      >
                        Resume
                      </a>
                    )}
                    {app.memberEmail && (
                      <a
                        href={
                          memberInfo[app.memberId]?.messagingHandle ||
                          `mailto:${app.memberEmail}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-slate-700 px-3 py-1 hover:border-teal-400"
                      >
                        Message
                      </a>
                    )}
                    {app.memberEmail && (
                      <a
                        href={`mailto:${app.memberEmail}?subject=Interview%20Invitation:%20${encodeURIComponent(
                          jobs.find((job) => job.id === app.jobId)?.title ??
                            "IOPPS Opportunity"
                        )}`}
                        className="rounded-full border border-slate-700 px-3 py-1 hover:border-teal-400"
                      >
                        Email
                      </a>
                    )}
                    {app.memberEmail && (
                      <a
                        href={`https://calendar.google.com/calendar/u/0/r/eventedit?text=${encodeURIComponent(
                          `Interview: ${
                            jobs.find((job) => job.id === app.jobId)?.title ??
                            "IOPPS"
                          }`
                        )}&add=${encodeURIComponent(app.memberEmail)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-slate-700 px-3 py-1 hover:border-teal-400"
                      >
                        Schedule
                      </a>
                    )}
                    <select
                      value={app.status}
                      disabled={updatingId === app.id}
                      onChange={(e) =>
                        handleStatusChange(
                          app.id,
                          e.target.value as ApplicationStatus
                        )
                      }
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:border-teal-500 focus:outline-none"
                    >
                      <option value="submitted">Submitted</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="rejected">Rejected</option>
                      <option value="hired">Hired</option>
                    </select>
                  </div>
                </div>
                {app.note && (
                  <p className="mt-3 text-xs text-slate-300">Note: {app.note}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
