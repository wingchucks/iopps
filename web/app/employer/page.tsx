"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  getEmployerProfile,
  listEmployerJobs,
  listEmployerConferences,
  listEmployerApplications,
  deleteJobPosting,
  deleteConference,
  addEmployerInterview,
  updateEmployerInterview,
  deleteEmployerInterview,
} from "@/lib/firestore";
import type {
  EmployerProfile,
  Interview,
  JobPosting,
  Conference,
  JobApplication,
} from "@/lib/types";

type SectionConfig = {
  id: string;
  label: string;
  group: "Overview" | "Manage" | "Organization";
};

const sections: SectionConfig[] = [
  { id: "overview", label: "Overview", group: "Overview" },
  { id: "opportunities", label: "Opportunities", group: "Manage" },
  { id: "candidates", label: "Candidates & Talent", group: "Manage" },
  { id: "profile", label: "Profile & TRC #92", group: "Organization" },
  { id: "interview", label: "Interview", group: "Organization" },
];

const groupedSections = sections.reduce<
  { title: SectionConfig["group"]; sections: SectionConfig[] }[]
>((acc, section) => {
  const existing = acc.find((group) => group.title === section.group);
  if (existing) {
    existing.sections.push(section);
  } else {
    acc.push({ title: section.group, sections: [section] });
  }
  return acc;
}, []);


type MaybeTimestamp = string | { toDate: () => Date } | Date | null | undefined;

const quickActions = [
  {
    label: "Performance Analytics",
    href: "/employer/analytics",
    description: "View detailed metrics and insights for your jobs.",
    featured: true,
  },
  {
    label: "Post a Job",
    href: "/employer/jobs/new",
    description: "Share a new Indigenous-focused role.",
  },
  {
    label: "Add a Conference",
    href: "/employer/conferences/new",
    description: "Publish upcoming gatherings or summits.",
  },
  {
    label: "Edit Profile",
    href: "/employer/profile",
    description: "Update your organization info and TRC commitments.",
  },
  {
    label: "View Applications",
    href: "/employer/applications",
    description: "Review candidates and manage applications.",
  },
  {
    label: "View Pricing & Plans",
    href: "/pricing",
    description: "Compare single posts and annual employer packages.",
  },
];

// Sample data removed - using live data only


const toDateValue = (value: MaybeTimestamp): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object" && "toDate" in value) {
    const maybe = (value as { toDate: () => Date }).toDate();
    return maybe instanceof Date ? maybe : null;
  }
  return null;
};

const formatDateValue = (value: MaybeTimestamp, includeTime = false) => {
  const date = toDateValue(value);
  if (!date) return null;
  return includeTime
    ? date.toLocaleString("en-CA", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : date.toLocaleDateString("en-CA", {
        month: "short",
        day: "numeric",
      });
};

const formatNumber = (value?: number | null) =>
  typeof value === "number"
    ? new Intl.NumberFormat("en-CA").format(value)
    : "-";

type OpportunityRow = {
  id: string;
  title: string;
  pillar: string;
  status: string;
  views: string;
  applications: string;
  posted: string;
  createdAtMs: number;
};

type CandidateRow = {
  name: string;
  role: string;
  status: string;
  date: string;
  createdAtMs: number;
};

type EventRow = {
  name: string;
  type: string;
  date: string;
  startMs: number;
};

export default function EmployerDashboardPage() {
  const { user, role, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmType, setDeleteConfirmType] = useState<"job" | "conference" | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check employer approval status
  const employerStatus = profile?.status || "approved"; // Legacy employers without status are approved
  const isApproved = employerStatus === "approved";
  const isPending = employerStatus === "pending";
  const isRejected = employerStatus === "rejected";
  const jobTitleMap = useMemo(
    () => new Map(jobs.map((job) => [job.id, job.title])),
    [jobs]
  );
  const trcPercent = useMemo(() => {
    const trcFields: (keyof EmployerProfile)[] = [
      "organizationName",
      "description",
      "website",
      "location",
      "logoUrl",
    ];
    if (!profile) return 0;
    const filled = trcFields.filter((field) => {
      const value = profile[field];
      if (typeof value === "string") {
        return value.trim().length > 0;
      }
      return Boolean(value);
    }).length;
    return Math.round((filled / trcFields.length) * 100) || 0;
  }, [profile]);

  const handleDeleteClick = (id: string, type: "job" | "conference") => {
    setDeleteConfirmId(id);
    setDeleteConfirmType(type);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId || !deleteConfirmType) return;
    setDeleting(true);
    setDataError(null);
    setSuccessMessage(null);

    try {
      if (deleteConfirmType === "job") {
        await deleteJobPosting(deleteConfirmId);
        setJobs(jobs.filter((job) => job.id !== deleteConfirmId));
        setSuccessMessage("Job posting deleted successfully");
      } else {
        await deleteConference(deleteConfirmId);
        setConferences(conferences.filter((conf) => conf.id !== deleteConfirmId));
        setSuccessMessage("Conference deleted successfully");
      }
      setDeleteConfirmId(null);
      setDeleteConfirmType(null);
    } catch (err) {
      console.error(err);
      setDataError(
        err instanceof Error ? err.message : "Could not delete. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmId(null);
    setDeleteConfirmType(null);
  };

  const kpiData = useMemo(() => {
    const activeJobs = jobs.filter((job) => job.active !== false).length;
    const views = jobs.reduce((sum, job) => sum + (job.viewsCount ?? 0), 0);
    const threshold = Date.now() - 1000 * 60 * 60 * 24 * 30;
    const applications30Days = applications.filter((application) => {
      const created = toDateValue(application.createdAt);
      return created ? created.getTime() >= threshold : false;
    }).length;
    return [
      {
        title: "Active Job Posts",
        value: activeJobs.toString(),
        sub: "Currently live",
      },
      {
        title: "Views (30d)",
        value: formatNumber(views),
        sub: "Total job views",
      },
      {
        title: "Applications (30d)",
        value: formatNumber(applications30Days),
        sub: "Recent applicants",
      },
    ];
  }, [applications, jobs]);

  const { opportunityRows, showingSampleOpportunities } = useMemo<{
    opportunityRows: OpportunityRow[];
    showingSampleOpportunities: boolean;
  }>(() => {
    const jobRows: OpportunityRow[] = jobs.map((job) => {
      const created = toDateValue(job.createdAt);
      return {
        id: job.id,
        title: job.title || "Untitled job",
        pillar: "Job",
        status: job.active === false ? "Paused" : "Published",
        views: formatNumber(job.viewsCount ?? 0),
        applications: formatNumber(job.applicationsCount ?? 0),
        posted: formatDateValue(job.createdAt) ?? "-",
        createdAtMs: created ? created.getTime() : 0,
      };
    });
    const confRows: OpportunityRow[] = conferences.map((conf) => {
      const created = toDateValue(conf.createdAt);
      const confMetrics = conf as Conference & {
        viewsCount?: number;
        registrationsCount?: number;
        attendeesCount?: number;
      };
      const confApplications =
        confMetrics.registrationsCount ?? confMetrics.attendeesCount;
      return {
        id: conf.id,
        title: conf.title || "Untitled conference",
        pillar: "Conference",
        status: conf.active === false ? "Draft" : "Published",
        views:
          confMetrics.viewsCount != null
            ? formatNumber(confMetrics.viewsCount)
            : "-",
        applications:
          confApplications != null ? formatNumber(confApplications) : "-",
        posted: formatDateValue(conf.createdAt) ?? "-",
        createdAtMs: created ? created.getTime() : 0,
      };
    });
    const rows = [...jobRows, ...confRows].sort(
      (a, b) => b.createdAtMs - a.createdAtMs
    );
    return { opportunityRows: rows, showingSampleOpportunities: false };
  }, [conferences, jobs]);

  const { candidateRows, showingSampleCandidates } = useMemo<{
    candidateRows: CandidateRow[];
    showingSampleCandidates: boolean;
  }>(() => {
    const rows = [...applications]
      .sort(
        (a, b) =>
          (toDateValue(b.createdAt)?.getTime() ?? 0) -
          (toDateValue(a.createdAt)?.getTime() ?? 0)
      )
      .slice(0, 5)
      .map((application) => ({
        name:
          application.memberDisplayName ||
          application.memberEmail ||
          "Candidate",
        role: jobTitleMap.get(application.jobId) || "Opportunity",
        status: application.status ?? "Submitted",
        date: formatDateValue(application.createdAt) ?? "-",
        createdAtMs: toDateValue(application.createdAt)?.getTime() ?? 0,
      }));
    return { candidateRows: rows, showingSampleCandidates: false };
  }, [applications, jobTitleMap]);

  const onboardingSteps = useMemo(
    () => [
      {
        id: "profile",
        title: "Complete employer profile",
        description:
          "Add organization info, description, and land acknowledgement.",
        href: "/employer/profile",
        complete: trcPercent >= 80,
      },
      {
        id: "postOpportunity",
        title: "Publish your first opportunity",
        description: "Post a job, conference, or scholarship for the community.",
        href: "/employer/jobs/new",
        complete: jobs.length + conferences.length > 0,
      },
      {
        id: "reviewApplicants",
        title: "Review recent applicants",
        description: "See who has applied in the last 30 days.",
        href: "/employer/applications",
        complete: applications.length > 0,
      },
    ],
    [applications.length, conferences.length, jobs.length, trcPercent]
  );

  const { eventsRows, showingSampleEvents } = useMemo<{
    eventsRows: EventRow[];
    showingSampleEvents: boolean;
  }>(() => {
    const now = Date.now();
    const rows = conferences
      .map((conf) => {
        const start =
          toDateValue(conf.startDate) ?? toDateValue(conf.createdAt) ?? null;
        return {
          name: conf.title,
          type: "Conference",
          date:
            formatDateValue(conf.startDate, true) ??
            formatDateValue(conf.createdAt, true) ??
            "Date TBA",
          startMs: start ? start.getTime() : 0,
        };
      })
      .filter((row) => !row.startMs || row.startMs >= now - 24 * 60 * 60 * 1000)
      .sort((a, b) => {
        if (!a.startMs) return 1;
        if (!b.startMs) return -1;
        return a.startMs - b.startMs;
      })
      .slice(0, 3);
    return { eventsRows: rows, showingSampleEvents: false };
  }, [conferences]);

  useEffect(() => {
    if (!user || role !== "employer") return;
    setDataLoading(true);
    (async () => {
      try {
        setDataError(null);
        const [profileData, jobData, conferenceData, applicationData] =
          await Promise.all([
            getEmployerProfile(user.uid),
            listEmployerJobs(user.uid),
            listEmployerConferences(user.uid),
            listEmployerApplications(user.uid),
          ]);
        setProfile(profileData);
        setJobs(jobData);
        setConferences(conferenceData);
        setApplications(applicationData);
      } catch (err) {
        console.error(err);
        setDataError("Unable to load dashboard data right now.");
      } finally {
        setDataLoading(false);
      }
    })();
  }, [role, user]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-slate-300">Loading dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          Please sign in
        </h1>
        <p className="text-sm text-slate-300">
          Employers must be logged in to view the dashboard.
        </p>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-[#0D0D0F] hover:bg-[#14B8A6]/90 transition-colors"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-[#14B8A6] hover:text-[#14B8A6]"
          >
            Register
          </Link>
        </div>
      </div>
    );
  }

  if (role !== "employer") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          Employer access required
        </h1>
        <p className="text-sm text-slate-300">
          Switch to an employer account to view the dashboard.
        </p>
      </div>
    );
  }

  const renderOpportunities = () => {
    if (dataLoading) {
      return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 text-sm text-slate-300 shadow-lg">
          Loading your opportunities...
        </div>
      );
    }

    // Group opportunities by pillar
    const groupedOpportunities = opportunityRows.reduce<
      Record<string, OpportunityRow[]>
    >((acc, opp) => {
      const pillar = opp.pillar;
      if (!acc[pillar]) {
        acc[pillar] = [];
      }
      acc[pillar].push(opp);
      return acc;
    }, {});

    const pillarOrder = ["Job", "Conference", "Scholarship", "Pow Wow", "Shop"];
    const sortedPillars = pillarOrder.filter((p) => groupedOpportunities[p]);

    return (
      <div className="space-y-6">
        {deleteConfirmId && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
            <p className="text-sm font-semibold text-amber-100">
              Are you sure you want to delete this {deleteConfirmType}?
            </p>
            <p className="mt-1 text-xs text-amber-200">
              This action cannot be undone.
            </p>
            <div className="mt-3 flex gap-3">
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="rounded-md bg-red-600 px-3 py-1 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
              <button
                onClick={handleDeleteCancel}
                disabled={deleting}
                className="rounded-md border border-slate-700 px-3 py-1 text-sm text-slate-200 hover:border-slate-600 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {dataError && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
            {dataError}
          </div>
        )}
        {successMessage && (
          <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-4 text-sm text-green-100">
            {successMessage}
          </div>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 shadow-lg">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  All opportunities
                </p>
                {showingSampleOpportunities && (
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                    Sample data
                  </span>
                )}
              </div>
              <h2 className="text-xl font-semibold text-slate-50">
                Multi-pillar control center
              </h2>
            </div>
            {isApproved ? (
              <Link
                href="/employer/jobs/new"
                className="rounded-full bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors"
              >
                Create new
              </Link>
            ) : (
              <div
                className="rounded-full bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-400 cursor-not-allowed opacity-60"
                title="Account must be approved to create opportunities"
              >
                Create new (requires approval)
              </div>
            )}
          </div>

          <div className="mt-6 space-y-8">
            {sortedPillars.map((pillar) => (
              <div key={pillar}>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#14B8A6]">
                  {pillar}s
                </h3>
                <div className="space-y-2">
                  {groupedOpportunities[pillar].map((opp) => (
                    <div
                      key={`${opp.title}-${opp.createdAtMs}`}
                      className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-700"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-slate-100">
                              {opp.title}
                            </h4>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs ${
                                opp.status === "Published"
                                  ? "bg-green-500/20 text-green-300"
                                  : "bg-slate-700 text-slate-300"
                              }`}
                            >
                              {opp.status}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                            <span>{opp.views} views</span>
                            <span>•</span>
                            <span>{opp.applications} applications</span>
                            <span>•</span>
                            <span>Posted {opp.posted}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {!opp.id.startsWith("sample-") ? (
                            <>
                              <Link
                                href={
                                  opp.pillar === "Job"
                                    ? `/jobs/${opp.id}`
                                    : `/conferences/${opp.id}`
                                }
                                className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-[#14B8A6] hover:text-[#14B8A6] transition-colors"
                              >
                                View
                              </Link>
                              <Link
                                href={
                                  opp.pillar === "Job"
                                    ? `/employer/jobs/${opp.id}/edit`
                                    : `/employer/conferences/${opp.id}/edit`
                                }
                                className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-[#14B8A6] hover:text-[#14B8A6] transition-colors"
                              >
                                Edit
                              </Link>
                              <button
                                onClick={() =>
                                  handleDeleteClick(
                                    opp.id,
                                    opp.pillar === "Job" ? "job" : "conference"
                                  )
                                }
                                className="rounded-md border border-red-700 px-3 py-1 text-xs text-red-300 hover:border-red-600 hover:bg-red-900/20 transition-colors"
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-500 italic">
                              Sample data - no actions
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {sortedPillars.length === 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-8 text-center">
                <p className="text-sm text-slate-400">
                  No opportunities yet. {isApproved ? "Create your first job, conference, or scholarship to get started." : "Complete your profile and wait for approval to start posting opportunities."}
                </p>
                {isApproved ? (
                  <Link
                    href="/employer/jobs/new"
                    className="mt-4 inline-block rounded-full bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors"
                  >
                    Post your first opportunity
                  </Link>
                ) : (
                  <Link
                    href="/employer/profile"
                    className="mt-4 inline-block rounded-full border border-[#14B8A6] px-4 py-2 text-sm font-semibold text-[#14B8A6] hover:bg-[#14B8A6] hover:text-slate-900 transition-colors"
                  >
                    Complete your profile
                  </Link>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    );
  };

  const renderCandidates = () => {
    if (dataLoading) {
      return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 text-sm text-slate-300 shadow-lg">
          Loading candidates...
        </div>
      );
    }

    // Get latest 10 applications
    const latestCandidates = [...applications]
      .sort(
        (a, b) =>
          (toDateValue(b.createdAt)?.getTime() ?? 0) -
          (toDateValue(a.createdAt)?.getTime() ?? 0)
      )
      .slice(0, 10)
      .map((application) => ({
        name:
          application.memberDisplayName ||
          application.memberEmail ||
          "Candidate",
        role: jobTitleMap.get(application.jobId) || "Opportunity",
        status: application.status ?? "Submitted",
        date: formatDateValue(application.createdAt) ?? "-",
        createdAtMs: toDateValue(application.createdAt)?.getTime() ?? 0,
      }));

    return (
      <div className="space-y-6">
        {dataError && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
            {dataError}
          </div>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 shadow-lg">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Candidates & Talent
                </p>
                {showingSampleCandidates && (
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                    Sample data
                  </span>
                )}
              </div>
              <h2 className="text-xl font-semibold text-slate-50">
                Latest Applications
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Review recent candidates who have applied to your opportunities.
              </p>
            </div>
            <Link
              href="/employer/applications"
              className="rounded-full bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors"
            >
              View all applications
            </Link>
          </div>

          {/* Candidates list */}
          <div className="mt-6 divide-y divide-slate-800">
            {latestCandidates.length > 0 ? (
              latestCandidates.map((candidate, idx) => (
                <div
                  key={`${candidate.name}-${candidate.createdAtMs}-${idx}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div>
                    <p className="font-semibold text-slate-100">
                      {candidate.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      Applied for {candidate.role} - {candidate.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200">
                      {candidate.status}
                    </span>
                    <Link
                      href="/employer/applications"
                      className="text-xs text-[#14B8A6] underline hover:text-[#14B8A6]/80"
                    >
                      View profile
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-8 text-center">
                <p className="text-sm text-slate-400">
                  No applications yet. {isApproved ? "Post your first job to start receiving candidates." : "Your account must be approved before you can post jobs."}
                </p>
                {isApproved ? (
                  <Link
                    href="/employer/jobs/new"
                    className="mt-4 inline-block rounded-full bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors"
                  >
                    Post a job
                  </Link>
                ) : (
                  <Link
                    href="/employer/profile"
                    className="mt-4 inline-block rounded-full border border-[#14B8A6] px-4 py-2 text-sm font-semibold text-[#14B8A6] hover:bg-[#14B8A6] hover:text-slate-900 transition-colors"
                  >
                    Complete your profile
                  </Link>
                )}
              </div>
            )}
          </div>

          {latestCandidates.length > 0 && applications.length > 10 && (
            <div className="mt-6 text-center">
              <Link
                href="/employer/applications"
                className="inline-block text-sm text-[#14B8A6] underline hover:text-[#14B8A6]/80"
              >
                View all {applications.length} application{applications.length !== 1 ? 's' : ''}
              </Link>
            </div>
          )}
        </section>
      </div>
    );
  };

  const renderProfile = () => {
    if (dataLoading) {
      return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 text-sm text-slate-300 shadow-lg">
          Loading profile information...
        </div>
      );
    }

    const trcActions = [
      {
        id: "completeProfile",
        title: "Complete your employer profile",
        description:
          "Add organization details, logo, and public-facing information.",
        href: "/employer/profile",
        complete: trcPercent >= 80,
      },
      {
        id: "landAcknowledgement",
        title: "Add land acknowledgement",
        description:
          "Recognize the traditional territories where your organization operates.",
        href: "/employer/profile",
        complete: Boolean(profile?.description?.toLowerCase().includes("land")),
      },
      {
        id: "indigenousRecruitment",
        title: "Add Indigenous recruitment statement",
        description:
          "Publish your commitment to Indigenous hiring and career development.",
        href: "/employer/profile",
        complete: Boolean(profile?.description?.toLowerCase().includes("indigenous")),
      },
      {
        id: "postOpportunity",
        title: "Post at least one opportunity",
        description:
          "Share a job, scholarship, or event with the Indigenous community.",
        href: "/employer/jobs/new",
        complete: jobs.length + conferences.length > 0,
      },
    ];

    const completedActions = trcActions.filter((a) => a.complete).length;
    const totalActions = trcActions.length;

    return (
      <div className="space-y-6">
        {dataError && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
            {dataError}
          </div>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 shadow-lg">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#14B8A6]">
                Profile & TRC #92
              </p>
              <h2 className="text-2xl font-semibold text-slate-50">
                Your Employer Profile
              </h2>
            </div>
            <Link
              href="/employer/profile"
              className="rounded-full bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors"
            >
              Edit profile
            </Link>
          </div>

          {/* Progress Section */}
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-100">
                  TRC #92 Progress
                </p>
                <p className="text-xs text-slate-400">
                  {completedActions} of {totalActions} commitments completed
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-[#14B8A6]">
                  {trcPercent}%
                </p>
                <p className="text-xs text-slate-400">Profile complete</p>
              </div>
            </div>

            <div className="mt-4 h-3 rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#14B8A6] to-teal-400"
                style={{ width: `${trcPercent}%` }}
              />
            </div>

            <p className="mt-3 text-xs text-slate-400">
              The Truth and Reconciliation Commission's Call to Action #92 encourages employers to commit to meaningful consultation and employment opportunities with Indigenous peoples.
            </p>
          </div>

          {/* Action Checklist */}
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Profile Commitments
            </h3>

            {trcActions.map((action) => (
              <Link
                key={action.id}
                href={action.href}
                className={`block rounded-xl border p-4 transition ${
                  action.complete
                    ? "border-[#14B8A6]/40 bg-[#14B8A6]/10"
                    : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {action.complete ? (
                      <svg
                        className="h-5 w-5 text-[#14B8A6]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-slate-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`font-semibold ${
                        action.complete ? "text-[#14B8A6]" : "text-slate-100"
                      }`}
                    >
                      {action.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {action.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    );
  };

  const renderInterview = () => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState("");
    const [videoProvider, setVideoProvider] = useState<"youtube" | "vimeo">("youtube");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [duration, setDuration] = useState("");
    const [highlights, setHighlights] = useState<string[]>([""]);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const extractYouTubeId = (url: string): string | null => {
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      ];
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
      }
      return null;
    };

    const extractVimeoId = (url: string): string | null => {
      const patterns = [
        /vimeo\.com\/(\d+)/,
        /player\.vimeo\.com\/video\/(\d+)/,
      ];
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
      }
      return null;
    };

    const handleAddHighlight = () => {
      setHighlights([...highlights, ""]);
    };

    const handleRemoveHighlight = (index: number) => {
      setHighlights(highlights.filter((_, i) => i !== index));
    };

    const handleHighlightChange = (index: number, value: string) => {
      const newHighlights = [...highlights];
      newHighlights[index] = value;
      setHighlights(newHighlights);
    };

    const handleEdit = (interview: Interview) => {
      setEditingId(interview.id);
      setVideoUrl(interview.videoUrl);
      setVideoProvider(interview.videoProvider);
      setTitle(interview.title || "");
      setDescription(interview.description || "");
      setDuration(interview.duration || "");
      setHighlights(interview.highlights && interview.highlights.length > 0 ? interview.highlights : [""]);
    };

    const handleCancelEdit = () => {
      setEditingId(null);
      setVideoUrl("");
      setVideoProvider("youtube");
      setTitle("");
      setDescription("");
      setDuration("");
      setHighlights([""]);
      setSaveError(null);
    };

    const handleSave = async () => {
      if (!user) return;

      setSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      try {
        // Validate video URL
        const videoId = videoProvider === "youtube"
          ? extractYouTubeId(videoUrl)
          : extractVimeoId(videoUrl);

        if (!videoId) {
          setSaveError(`Please enter a valid ${videoProvider === "youtube" ? "YouTube" : "Vimeo"} URL`);
          setSaving(false);
          return;
        }

        const filteredHighlights = highlights.filter(h => h.trim().length > 0);

        if (editingId) {
          // Update existing interview
          await updateEmployerInterview(user.uid, editingId, {
            videoUrl,
            videoProvider,
            videoId,
            title: title || undefined,
            description: description || undefined,
            duration: duration || undefined,
            highlights: filteredHighlights.length > 0 ? filteredHighlights : undefined,
            active: true,
          });

          // Update local state
          setProfile(prev => {
            if (!prev) return null;
            const interviews = prev.interviews || [];
            return {
              ...prev,
              interviews: interviews.map(int =>
                int.id === editingId
                  ? { ...int, videoUrl, videoProvider, videoId, title, description, duration, highlights: filteredHighlights }
                  : int
              ),
            };
          });
        } else {
          // Add new interview
          const newId = await addEmployerInterview(user.uid, {
            videoUrl,
            videoProvider,
            videoId,
            title: title || undefined,
            description: description || undefined,
            duration: duration || undefined,
            highlights: filteredHighlights.length > 0 ? filteredHighlights : undefined,
            viewsCount: 0,
            active: true,
          });

          // Refresh profile to get the new interview
          const updatedProfile = await getEmployerProfile(user.uid);
          if (updatedProfile) {
            setProfile(updatedProfile);
          }
        }

        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        handleCancelEdit();
      } catch (err) {
        console.error("Failed to save interview", err);
        setSaveError("Failed to save interview. Please try again.");
      } finally {
        setSaving(false);
      }
    };

    const handleDelete = async (interviewId: string) => {
      if (!user || !confirm("Are you sure you want to delete this interview?")) return;

      try {
        await deleteEmployerInterview(user.uid, interviewId);
        setProfile(prev => {
          if (!prev) return null;
          return {
            ...prev,
            interviews: (prev.interviews || []).filter(int => int.id !== interviewId),
          };
        });
      } catch (err) {
        console.error("Failed to delete interview", err);
        setSaveError("Failed to delete interview. Please try again.");
      }
    };

    const handleToggleActive = async (interview: Interview) => {
      if (!user) return;

      try {
        await updateEmployerInterview(user.uid, interview.id, {
          active: !interview.active,
        });

        setProfile(prev => {
          if (!prev) return null;
          const interviews = prev.interviews || [];
          return {
            ...prev,
            interviews: interviews.map(int =>
              int.id === interview.id ? { ...int, active: !int.active } : int
            ),
          };
        });
      } catch (err) {
        console.error("Failed to toggle interview status", err);
      }
    };

    if (dataLoading) {
      return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 text-sm text-slate-300 shadow-lg">
          Loading interview settings...
        </div>
      );
    }

    const interviews = profile?.interviews || [];
    const totalViews = interviews.reduce((sum, int) => sum + (int.viewsCount || 0), 0);
    const videoId = videoUrl ? (videoProvider === "youtube" ? extractYouTubeId(videoUrl) : extractVimeoId(videoUrl)) : null;

    return (
      <div className="space-y-6">
        {saveError && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
            {saveError}
          </div>
        )}
        {saveSuccess && (
          <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-4 text-sm text-green-100">
            Interview {editingId ? "updated" : "added"} successfully!
          </div>
        )}

        {/* Analytics Summary */}
        {interviews.length > 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <svg className="h-5 w-5 text-[#14B8A6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Interview Analytics
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">Total Interviews</p>
                <p className="mt-2 text-2xl font-bold text-[#14B8A6]">{interviews.length}</p>
                <p className="mt-1 text-xs text-slate-400">Uploaded videos</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">Total Views</p>
                <p className="mt-2 text-2xl font-bold text-[#14B8A6]">{totalViews}</p>
                <p className="mt-1 text-xs text-slate-400">Across all videos</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">Active Videos</p>
                <p className="mt-2 text-2xl font-bold text-green-400">
                  {interviews.filter(int => int.active !== false).length}
                </p>
                <p className="mt-1 text-xs text-slate-400">Live on job postings</p>
              </div>
            </div>
          </div>
        )}

        {/* Existing Interviews List */}
        {interviews.length > 0 && !editingId && !videoUrl && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 shadow-lg">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-50">Your Interviews</h3>
              <p className="mt-1 text-sm text-slate-400">
                Manage your interview videos. Active videos appear on your job postings.
              </p>
            </div>

            <div className="space-y-3">
              {interviews.map((interview) => (
                <div
                  key={interview.id}
                  className="flex items-start gap-4 rounded-lg border border-slate-800 bg-slate-950/40 p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-medium text-slate-100">
                          {interview.title || "Untitled Interview"}
                        </h4>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <span className="capitalize">{interview.videoProvider}</span>
                          </span>
                          {interview.duration && <span>• {interview.duration}</span>}
                          {interview.viewsCount && interview.viewsCount > 0 && (
                            <span>• {interview.viewsCount} views</span>
                          )}
                        </div>
                        {interview.description && (
                          <p className="mt-2 text-sm text-slate-400 line-clamp-2">
                            {interview.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                          interview.active !== false
                            ? "bg-green-500/10 text-green-400"
                            : "bg-slate-700/50 text-slate-400"
                        }`}>
                          {interview.active !== false ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleEdit(interview)}
                      className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-[#14B8A6] hover:text-[#14B8A6]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(interview)}
                      className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-slate-600"
                    >
                      {interview.active !== false ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(interview.id)}
                      className="rounded-md border border-slate-700 px-3 py-1 text-xs text-red-400 hover:border-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Add/Edit Interview Form */}
        {(editingId || videoUrl || interviews.length === 0) && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 shadow-lg">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#14B8A6]">
                {editingId ? "Edit Interview" : "Add Interview"}
              </p>
              <h2 className="text-2xl font-semibold text-slate-50">
                Video Interview Settings
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Share recorded interview videos that will appear on your job postings.
              </p>
            </div>

            <div className="mt-6 space-y-6">
              {/* Video Provider Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Video Platform <span className="text-slate-500">(required)</span>
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setVideoProvider("youtube")}
                    className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                      videoProvider === "youtube"
                        ? "border-[#14B8A6] bg-[#14B8A6]/10 text-[#14B8A6]"
                        : "border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    YouTube
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoProvider("vimeo")}
                    className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                      videoProvider === "vimeo"
                        ? "border-[#14B8A6] bg-[#14B8A6]/10 text-[#14B8A6]"
                        : "border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    Vimeo
                  </button>
                </div>
              </div>

              {/* Video URL */}
              <div>
                <label className="block text-sm font-medium text-slate-200">
                  {videoProvider === "youtube" ? "YouTube" : "Vimeo"} Video URL <span className="text-slate-500">(required)</span>
                </label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder={
                    videoProvider === "youtube"
                      ? "https://www.youtube.com/watch?v=..."
                      : "https://vimeo.com/..."
                  }
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none"
                />
              </div>

              {/* Video Preview */}
              {videoId && (
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Preview
                  </label>
                  <div className="relative overflow-hidden rounded-lg bg-slate-950" style={{ paddingBottom: "56.25%" }}>
                    {videoProvider === "vimeo" ? (
                      <iframe
                        className="absolute left-0 top-0 h-full w-full"
                        src={`https://player.vimeo.com/video/${videoId}?color=14B8A6&title=0&byline=0&portrait=0`}
                        title="Interview preview"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <iframe
                        className="absolute left-0 top-0 h-full w-full"
                        src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&color=white`}
                        title="Interview preview"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Interview Title */}
              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Interview Title <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., 'Meet our team' or 'Our commitment to reconciliation'"
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Description <span className="text-slate-500">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of what this interview covers..."
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Duration <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g., '5 min' or '3:24'"
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none"
                />
              </div>

              {/* Highlights */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-200">
                    Key Highlights <span className="text-slate-500">(optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddHighlight}
                    className="text-xs text-[#14B8A6] hover:underline"
                  >
                    + Add highlight
                  </button>
                </div>
                <p className="mb-3 text-xs text-slate-500">
                  Bullet points that will appear below the video
                </p>
                <div className="space-y-2">
                  {highlights.map((highlight, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={highlight}
                        onChange={(e) => handleHighlightChange(index, e.target.value)}
                        placeholder={`Highlight ${index + 1}`}
                        className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none"
                      />
                      {highlights.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveHighlight(index)}
                          className="rounded-lg border border-slate-700 px-3 text-sm text-slate-400 hover:border-red-500 hover:text-red-400"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  onClick={handleSave}
                  disabled={saving || !videoUrl}
                  className="rounded-lg bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 transition-colors hover:bg-[#16cdb8] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingId ? "Update Interview" : "Add Interview"}
                </button>
                {editingId && (
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="rounded-lg border border-slate-700 px-6 py-3 font-semibold text-slate-200 transition-colors hover:border-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Add New Button (when not editing and has interviews) */}
        {interviews.length > 0 && !editingId && !videoUrl && (
          <button
            onClick={() => setVideoUrl(" ")}
            className="w-full rounded-lg border-2 border-dashed border-slate-700 bg-slate-950/40 px-6 py-4 text-slate-400 transition-colors hover:border-[#14B8A6] hover:text-[#14B8A6]"
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Another Interview
            </span>
          </button>
        )}

        {/* Info Card */}
        <div className="rounded-xl border border-[#14B8A6]/20 bg-[#14B8A6]/5 p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[#14B8A6]">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Why add interviews?
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-[#14B8A6]">•</span>
              <span>Help candidates understand your organization's culture and values</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#14B8A6]">•</span>
              <span>Showcase your commitment to Indigenous employment (TRC #92)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#14B8A6]">•</span>
              <span>Add multiple videos covering different topics (culture, benefits, team, etc.)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#14B8A6]">•</span>
              <span>Interviews appear on all your job postings automatically</span>
            </li>
          </ul>
        </div>
      </div>
    );
  };

  const renderOverview = () => {
    if (dataLoading) {
      return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 text-sm text-slate-300 shadow-lg">
          Loading your overview...
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {dataError && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
            {dataError}
          </div>
        )}

        {/* Hero Section */}
        <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6 sm:p-8 shadow-lg">
          <h2 className="text-2xl font-semibold text-slate-50">
            {profile?.organizationName
              ? `Welcome back, ${profile.organizationName}`
              : "Welcome to IOPPS"}
          </h2>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            IOPPS connects employers with skilled Indigenous professionals, students, and community members.
            Post opportunities, manage applications, and demonstrate your commitment to Truth and Reconciliation.
          </p>
        </section>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {kpiData.map((kpi) => (
            <div
              key={kpi.title}
              className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-[#0D0D0F] to-slate-900 p-6 shadow-lg transition hover:-translate-y-1 hover:border-[#14B8A6]/60"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                {kpi.title}
              </p>
              <p className="mt-3 text-2xl font-semibold text-slate-50">
                {kpi.value}
              </p>
              <p className="text-xs text-slate-500">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 shadow-lg">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Quick actions
            </p>
            <h2 className="text-xl font-semibold text-slate-50">
              What would you like to do?
            </h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {quickActions.map((action) => {
              // Disable creation actions for non-approved employers
              const isCreationAction =
                action.href.includes("/new") ||
                action.label === "Post a Job" ||
                action.label === "Add a Conference";
              const isDisabled = !isApproved && isCreationAction;
              const isFeatured = action.featured === true;

              if (isDisabled) {
                return (
                  <div
                    key={action.label}
                    className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4 text-left opacity-50 cursor-not-allowed"
                    title="Account must be approved to create opportunities"
                  >
                    <p className="font-semibold text-slate-50">{action.label}</p>
                    <p className="mt-1 text-xs text-slate-400">{action.description}</p>
                    <p className="mt-2 text-xs text-yellow-400">Requires approval</p>
                  </div>
                );
              }

              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className={`rounded-2xl border px-4 py-4 text-left transition hover:-translate-y-1 ${
                    isFeatured
                      ? "border-[#14B8A6]/40 bg-gradient-to-br from-[#14B8A6]/10 to-[#0D9488]/10 hover:border-[#14B8A6] hover:bg-gradient-to-br hover:from-[#14B8A6]/20 hover:to-[#0D9488]/20"
                      : "border-slate-800 bg-slate-950/60 hover:border-[#14B8A6] hover:bg-slate-900"
                  }`}
                >
                  <p className={`font-semibold ${isFeatured ? "text-[#14B8A6]" : "text-slate-50"}`}>
                    {action.label}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{action.description}</p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Upcoming Conferences & Events */}
        {eventsRows.length > 0 && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 shadow-lg">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Upcoming
                  </p>
                  {showingSampleEvents && (
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                      Sample data
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-semibold text-slate-50">
                  Conferences & Events
                </h2>
              </div>
              {isApproved ? (
                <Link
                  href="/employer/conferences/new"
                  className="rounded-full border border-[#14B8A6] px-4 py-2 text-sm font-semibold text-[#14B8A6] hover:bg-[#14B8A6] hover:text-slate-900 transition-colors"
                >
                  Add event
                </Link>
              ) : (
                <div
                  className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-400 cursor-not-allowed opacity-60"
                  title="Account must be approved to create events"
                >
                  Add event (requires approval)
                </div>
              )}
            </div>

            <div className="mt-6 space-y-3">
              {eventsRows.map((event, idx) => (
                <div
                  key={`${event.name}-${event.startMs}-${idx}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-slate-100">{event.name}</p>
                    <p className="text-xs text-slate-400">{event.date}</p>
                  </div>
                  <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200">
                    {event.type}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Next Steps */}
        {onboardingSteps.some(step => !step.complete) && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 shadow-lg">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Next steps
              </p>
              <h2 className="text-xl font-semibold text-slate-50">
                Get started with IOPPS
              </h2>
            </div>

            <div className="mt-6 space-y-2">
              {onboardingSteps.filter(step => !step.complete).map((step) => (
                <Link
                  key={step.id}
                  href={step.href}
                  className="block rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-700"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <div className="h-5 w-5 rounded-full border-2 border-slate-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-100">{step.title}</p>
                      <p className="mt-1 text-xs text-slate-400">{step.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Plan & Pricing */}
        <div className="rounded-xl border border-slate-800/50 bg-slate-900/40 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-slate-400">
              Current plan: <span className="text-slate-200">Single job posting</span>
            </span>
            <Link
              href="/pricing"
              className="text-[#14B8A6] underline hover:text-[#14B8A6]/80 transition-colors"
            >
              View pricing
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-slate-100">
      <div className="flex">
        <aside
          className={`fixed inset-y-0 z-30 w-64 transform border-r border-slate-900/60 bg-slate-950/95 p-4 sm:p-8 shadow-2xl transition md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#14B8A6]">
                IOPPS
              </p>
              <p className="text-sm text-slate-400">Employer Portal</p>
            </div>
            <button
              className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-400 md:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              Close
            </button>
          </div>
          <nav className="mt-6 space-y-4 text-sm font-medium">
            {groupedSections.map((group) => (
              <div key={group.title}>
                <p className="px-2 text-xs uppercase tracking-[0.3em] text-slate-500">
                  {group.title}
                </p>
                <div className="mt-2 space-y-1">
                  {group.sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => {
                        setActiveSection(section.id);
                        setSidebarOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${
                        activeSection === section.id
                          ? "bg-[#14B8A6]/20 text-[#14B8A6]"
                          : "text-slate-300 hover:bg-slate-900/70"
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-current" />
                      <span>{section.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <div className="flex-1 md:pl-64">
          <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-900 bg-slate-950/80 px-4 py-3 backdrop-blur md:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200"
            >
              Menu
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-200">
              <Link
                href="/contact"
                className="rounded-md border border-slate-700 px-3 py-1 hover:border-[#14B8A6] hover:text-[#14B8A6] transition-colors"
              >
                Help
              </Link>
            </div>
          </div>

          <main className="px-4 py-6 sm:px-6 lg:px-10">
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-900/70 bg-slate-950/70 p-4 sm:p-8 shadow-lg sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Employer dashboard
                </p>
                <h1 className="text-2xl font-semibold text-slate-50">
                  {profile?.organizationName
                    ? `Welcome back, ${profile.organizationName}`
                    : "Welcome to your employer dashboard"}
                </h1>
              </div>
              <div className="hidden items-center gap-3 md:flex">
                <Link
                  href="/contact"
                  className="rounded-md border border-slate-700 px-3 py-1 text-sm text-slate-200 hover:border-[#14B8A6] hover:text-[#14B8A6] transition-colors"
                >
                  Help
                </Link>
              </div>
            </div>

            {/* Approval Status Banner */}
            {isPending && (
              <div className="mt-6 rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-6">
                <div className="flex items-start gap-4">
                  <svg className="h-6 w-6 flex-shrink-0 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="font-semibold text-yellow-100">Account Pending Approval</h3>
                    <p className="mt-2 text-sm text-yellow-200">
                      Your employer account is currently under review by our admin team. You can complete your profile while you wait, but you won't be able to post jobs, conferences, or other opportunities until your account is approved.
                    </p>
                    <p className="mt-3 text-sm text-yellow-200">
                      We typically review new employer accounts within 1-2 business days. If you have questions, please [contact us]({'/contact'}).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isRejected && (
              <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-6">
                <div className="flex items-start gap-4">
                  <svg className="h-6 w-6 flex-shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-100">Account Not Approved</h3>
                    <p className="mt-2 text-sm text-red-200">
                      Unfortunately, your employer account application was not approved at this time.
                    </p>
                    {profile?.rejectionReason && (
                      <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/20 p-3">
                        <p className="text-xs font-semibold text-red-100">Reason:</p>
                        <p className="mt-1 text-sm text-red-200">{profile.rejectionReason}</p>
                      </div>
                    )}
                    <p className="mt-3 text-sm text-red-200">
                      If you believe this was an error or would like to discuss your application, please [contact us]({'/contact'}).
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6">
              {activeSection === "overview"
                ? renderOverview()
                : activeSection === "opportunities"
                ? renderOpportunities()
                : activeSection === "candidates"
                ? renderCandidates()
                : activeSection === "interview"
                ? renderInterview()
                : renderProfile()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

