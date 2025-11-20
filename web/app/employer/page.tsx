"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  getEmployerProfile,
  listEmployerJobs,
  listEmployerConferences,
  listEmployerApplications,
} from "@/lib/firestore";
import type {
  EmployerProfile,
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
  { id: "trc", label: "TRC #92 & Indigenous Engagement", group: "Manage" },
  { id: "analytics", label: "Analytics & Reports", group: "Manage" },
  { id: "profile", label: "Employer Profile", group: "Organization" },
  { id: "billing", label: "Billing & Plan", group: "Organization" },
  { id: "messages", label: "Messages & Notifications", group: "Organization" },
  { id: "team", label: "Team & Settings", group: "Organization" },
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
    label: "Scholarship or Grant",
    href: "/employer/conferences/new",
    description: "Fund Indigenous learners and leaders.",
  },
  {
    label: "Pow Wow or Cultural Event",
    href: "/employer/conferences/new",
    description: "Spotlight cultural programming.",
  },
  {
    label: "Shop Indigenous Listing",
    href: "/employer/conferences/new",
    description: "Highlight Indigenous-owned businesses.",
  },
  {
    label: "Request Live Stream",
    href: "/contact",
    description: "Partner with IOPPS Live for coverage.",
  },
];

const sampleOpportunities = [
  {
    title: "Community Nurse",
    pillar: "Job",
    status: "Published",
    views: 734,
    applications: 46,
    posted: "Oct 15",
  },
  {
    title: "Youth Leadership Conference",
    pillar: "Conference",
    status: "Draft",
    views: 98,
    applications: 0,
    posted: "Draft",
  },
  {
    title: "STEM Bursary 2025",
    pillar: "Scholarship",
    status: "Published",
    views: 512,
    applications: 120,
    posted: "Oct 05",
  },
  {
    title: "Cultural Pow Wow",
    pillar: "Pow Wow",
    status: "Published",
    views: 1_240,
    applications: 0,
    posted: "Sep 28",
  },
];

const sampleCandidates = [
  {
    name: "Autumn Cardinal",
    role: "Community Nurse",
    date: "Oct 24",
    status: "In Review",
  },
  {
    name: "Mason Bear",
    role: "Youth Leadership Coordinator",
    date: "Oct 23",
    status: "New",
  },
  {
    name: "Skylar Fox",
    role: "STEM Bursary",
    date: "Oct 21",
    status: "Shortlisted",
  },
  {
    name: "Jade Sinclair",
    role: "Cultural Program Host",
    date: "Oct 20",
    status: "Hired",
  },
  {
    name: "Noah Runningwolf",
    role: "Community Nurse",
    date: "Oct 18",
    status: "Not Selected",
  },
];

const sampleEvents = [
  {
    name: "Treaty 6 Winter Pow Wow",
    date: "Nov 12 at 6:00 PM MT",
    type: "Pow Wow",
  },
  {
    name: "Indigenous Tech Summit",
    date: "Nov 18 at 9:00 AM MT",
    type: "Conference",
  },
  {
    name: "Northern Lights Hockey Classic",
    date: "Nov 25 at 4:00 PM MT",
    type: "Tournament",
  },
];


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

  const kpiData = useMemo(() => {
    const activeJobs = jobs.filter((job) => job.active !== false).length;
    const activeConfs = conferences.filter(
      (conf) => conf.active !== false
    ).length;
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
        title: "Open Opportunities",
        value: (activeJobs + activeConfs).toString(),
        sub: "Jobs + other pillars",
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
      {
        title: "TRC #92 Progress",
        value: `${trcPercent}%`,
        sub: "Profile completeness",
        progress: trcPercent,
      },
    ];
  }, [applications, conferences, jobs, trcPercent]);

  const opportunityRows = useMemo<OpportunityRow[]>(() => {
    const jobRows: OpportunityRow[] = jobs.map((job) => {
      const created = toDateValue(job.createdAt);
      return {
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
    if (rows.length) return rows;
    return sampleOpportunities.map((opp, idx) => ({
      title: opp.title,
      pillar: opp.pillar,
      status: opp.status,
      views:
        typeof opp.views === "number"
          ? formatNumber(opp.views)
          : String(opp.views),
      applications:
        typeof opp.applications === "number"
          ? formatNumber(opp.applications)
          : String(opp.applications),
      posted: opp.posted,
      createdAtMs: Date.now() - idx * 86_400_000,
    }));
  }, [conferences, jobs]);

  const candidateRows = useMemo<CandidateRow[]>(() => {
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
    if (rows.length) return rows;
    return sampleCandidates.map((candidate, idx) => ({
      name: candidate.name,
      role: candidate.role,
      status: candidate.status,
      date: candidate.date,
      createdAtMs: Date.now() - idx * 86_400_000,
    }));
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

  const eventsRows = useMemo<EventRow[]>(() => {
    const now = Date.now();
    const rows = conferences
      .map((conf) => {
        const start =
          toDateValue(conf.startDate) ?? toDateValue(conf.createdAt) ?? null;
        return {
          name: conf.title,
          type: "Conference",
          date: formatDateValue(conf.startDate, true) ??
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
    if (rows.length) return rows;
    return sampleEvents.map((event, idx) => ({
      name: event.name,
      type: event.type,
      date: event.date,
      startMs: Date.now() + idx * 86_400_000,
    }));
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
            className="rounded-md bg-teal-500 px-4 py-2 text-sm font-semibold text-[#0D0D0F] hover:bg-teal-400"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-teal-400 hover:text-teal-200"
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

  const renderPlaceholder = (sectionId: string) => {
    const copy: Record<string, string> = {
      opportunities:
        "Here we will manage jobs, conferences, scholarships, pow wows, Shop Indigenous listings, and live stream sponsorships.",
      candidates:
        "Here we will list applicants, candidate profiles, and talent search filters.",
      trc:
        "Here we will show TRC #92 progress, checklists, and recommended actions for employers.",
      analytics:
        "Here we will show detailed stats on views, applications, hires, and pillar engagement.",
      profile:
        "Here we will edit logo, banner, description, land acknowledgement, and public profile info.",
      billing:
        "Here we will show current plan, usage, invoices, and upgrade options.",
      messages:
        "Here we will show conversations with candidates and system notifications.",
      team:
        "Here we will manage team members, roles, and account-wide settings.",
    };
    const bulletPoints: Record<string, string[]> = {
      opportunities: [
        "Create, duplicate, and schedule postings across all pillars.",
        "Track publishing status and boost high-performing roles.",
      ],
      candidates: [
        "Review applicant pipelines and stage candidates.",
        "Export resumes, notes, and collaboration threads.",
      ],
      trc: [
        "Surface TRC #92 recommendations tailored to your organization.",
        "Track commitments, sponsorships, and reconciliation plans.",
      ],
      analytics: [
        "Deep dive into traffic, applications, and conversion trends.",
        "Download CSV or presentation-ready summaries.",
      ],
      profile: [
        "Edit organization story, land acknowledgement, and media.",
        "Control what community members and partners see.",
      ],
      billing: [
        "Review invoices, plan usage, and upgrade options.",
        "Manage PO numbers and procurement contacts.",
      ],
      messages: [
        "Respond to community members and receive system updates.",
        "Set up notifications for critical events.",
      ],
      team: [
        "Invite recruiters or hiring managers with custom permissions.",
        "Enable MFA and security alerts for your organization.",
      ],
    };
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-slate-50">
          {sections.find((s) => s.id === sectionId)?.label}
        </h2>
        <p className="mt-3 text-sm text-slate-300">{copy[sectionId]}</p>
        <ul className="mt-4 list-disc space-y-1 pl-4 text-xs text-slate-400">
          {bulletPoints[sectionId]?.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <Link
          href="/contact"
          className="mt-4 inline-flex text-xs font-semibold text-teal-300 underline"
        >
          Tell us what you need next
        </Link>
      </section>
    );
  };

  const renderOverview = () => {
    if (dataLoading) {
      return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300 shadow-lg">
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

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpiData.map((kpi) => (
            <div
              key={kpi.title}
              className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-[#0D0D0F] to-slate-900 p-5 shadow-lg shadow-black/40 transition hover:-translate-y-1 hover:border-teal-400/60"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                {kpi.title}
              </p>
              <p className="mt-3 text-2xl font-semibold text-slate-50">
                {kpi.value}
              </p>
              <p className="text-xs text-slate-500">{kpi.sub}</p>
              {"progress" in kpi && (
                <div className="mt-4 h-2 rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-teal-500"
                    style={{ width: `${(kpi as { progress: number }).progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Quick actions
              </p>
              <h2 className="text-xl font-semibold text-slate-50">
                Launch new opportunities
              </h2>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-left text-sm text-slate-100 transition hover:-translate-y-1 hover:border-teal-400 hover:text-teal-200"
              >
                <p className="font-semibold text-slate-50">{action.label}</p>
                <p className="text-xs text-slate-400">{action.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Onboarding
              </p>
              <h2 className="text-xl font-semibold text-slate-50">
                Next steps to activate your employer profile
              </h2>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {onboardingSteps.map((step) => (
              <Link
                key={step.id}
                href={step.href}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-200 transition hover:-translate-y-1 hover:border-teal-400"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-50">{step.title}</p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      step.complete
                        ? "bg-teal-500/20 text-teal-200"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {step.complete ? "Complete" : "Start"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-400">{step.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Active opportunities
              </p>
              <h2 className="text-xl font-semibold text-slate-50">
                Cross-pillar snapshot
              </h2>
            </div>
            <button className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-teal-400 hover:text-teal-200">
              View all
            </button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm text-slate-300">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Title</th>
                  <th className="px-3 py-2 text-left">Pillar</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Views</th>
                  <th className="px-3 py-2 text-left">Applications</th>
                  <th className="px-3 py-2 text-left">Posted</th>
                </tr>
              </thead>
              <tbody>
                {opportunityRows.map((opp) => (
                  <tr
                    key={`${opp.title}-${opp.createdAtMs}`}
                    className="border-t border-slate-800/60 text-xs text-slate-200"
                  >
                    <td className="px-3 py-3">{opp.title}</td>
                    <td className="px-3 py-3">{opp.pillar}</td>
                    <td className="px-3 py-3">{opp.status}</td>
                    <td className="px-3 py-3">{opp.views}</td>
                    <td className="px-3 py-3">{opp.applications}</td>
                    <td className="px-3 py-3">{opp.posted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Recent candidates
              </p>
              <h2 className="text-xl font-semibold text-slate-50">
                Latest applications
              </h2>
            </div>
            <button className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-teal-400 hover:text-teal-200">
              View all candidates
            </button>
          </div>
          <div className="mt-4 divide-y divide-slate-800 text-sm text-slate-300">
            {candidateRows.map((candidate) => (
              <div
                key={`${candidate.name}-${candidate.createdAtMs}`}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
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
                  <span className="rounded-full border border-slate-700 px-3 py-1 text-xs">
                    {candidate.status}
                  </span>
                  <button className="text-xs text-teal-300 underline">
                    View profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Upcoming events & live streams
              </p>
              <h2 className="text-xl font-semibold text-slate-50">
                Community engagement pipeline
              </h2>
            </div>
            <button className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-teal-400 hover:text-teal-200">
              Manage events
            </button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {eventsRows.map((event) => (
              <div
                key={`${event.name}-${event.startMs}`}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-teal-300">
                  {event.type}
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-50">
                  {event.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">{event.date}</p>
                <button className="mt-4 text-xs text-teal-300 underline">
                  View listing
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-slate-100">
      <div className="flex">
        <aside
          className={`fixed inset-y-0 z-30 w-64 transform border-r border-slate-900/60 bg-slate-950/95 p-4 shadow-2xl transition md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-teal-300">
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
                          ? "bg-teal-500/20 text-teal-200"
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
              <button className="rounded-md border border-slate-700 px-3 py-1">
                Alerts
              </button>
              <button className="rounded-md border border-slate-700 px-3 py-1">
                Help
              </button>
            </div>
          </div>

          <main className="px-4 py-6 sm:px-6 lg:px-10">
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-900/70 bg-slate-950/70 p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Employer dashboard
                </p>
                <h1 className="text-2xl font-semibold text-slate-50">
                  Cree Nation Health Services
                </h1>
              </div>
              <div className="hidden items-center gap-3 md:flex">
                <button className="rounded-md border border-slate-700 px-3 py-1 text-sm text-slate-200">
                  Alerts
                </button>
                <button className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-teal-400 hover:text-teal-200">
                  Help
                </button>
                <div className="flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-100">
                  <span className="h-6 w-6 rounded-full bg-gradient-to-br from-teal-500 to-slate-600" />
                  <span>NA</span>
                  <span>v</span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              {activeSection === "overview"
                ? renderOverview()
                : renderPlaceholder(activeSection)}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

