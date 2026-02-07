"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  listEmployerJobs,
  listOrganizationTrainingPrograms,
  listEmployerApplications,
  updateJobStatus,
  deleteJobPosting,
  deleteTrainingProgram,
  updateApplicationStatus,
  addApplicantNote,
  deleteApplicantNote,
} from "@/lib/firestore";
import type { JobPosting, TrainingProgram, JobApplication, ApplicationStatus, ApplicantNote } from "@/lib/types";
import { AcademicCapIcon, BriefcaseIcon, UserGroupIcon, ArrowDownTrayIcon, ChatBubbleLeftIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useConfirmDialog, deleteConfirmOptions } from "@/hooks/useConfirmDialog";
import { useKeyboardShortcuts, type KeyboardShortcut } from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutsHelp } from "@/components/ui/KeyboardShortcutsHelp";

type CareerType = "jobs" | "training" | "applications";
type StatusFilter = "all" | "active" | "paused" | "scheduled";

interface CareersTabProps {
  initialView?: CareerType;
}

export default function CareersTab({ initialView = "jobs" }: CareersTabProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [careerType, setCareerType] = useState<CareerType>(initialView);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [trainingPrograms, setTrainingPrograms] = useState<TrainingProgram[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);

  // Application-specific filters
  const [appJobFilter, setAppJobFilter] = useState<string>("all");
  const [appStatusFilter, setAppStatusFilter] = useState<string>("all");

  // Notes state
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [newNoteText, setNewNoteText] = useState<Record<string, string>>({});
  const [addingNote, setAddingNote] = useState<string | null>(null);

  // Search ref for keyboard shortcut
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  const handleNewItem = useCallback(() => {
    if (careerType === "jobs") {
      router.push("/organization/jobs/new");
    } else if (careerType === "training") {
      router.push("/organization/training/new");
    }
  }, [careerType, router]);

  const shortcuts: KeyboardShortcut[] = useMemo(() => [
    {
      key: "n",
      action: handleNewItem,
      description: careerType === "jobs" ? "New job posting" : "New training program",
    },
    {
      key: "/",
      action: () => searchInputRef.current?.focus(),
      description: "Focus search",
    },
  ], [careerType, handleNewItem]);

  useKeyboardShortcuts(shortcuts);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [jobsData, trainingData, appsData] = await Promise.all([
        listEmployerJobs(user.uid),
        listOrganizationTrainingPrograms(user.uid),
        listEmployerApplications(user.uid),
      ]);
      setJobs(jobsData);
      setTrainingPrograms(trainingData);
      setApplications(appsData);
    } catch (err) {
      console.error("Error loading careers data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to check if a job is scheduled
  const isScheduledJob = (job: JobPosting) => {
    return job.scheduledPublishAt && job.active === false;
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Handle status filters
      if (statusFilter === "active" && job.active === false) return false;
      if (statusFilter === "paused" && (job.active !== false || isScheduledJob(job))) return false;
      if (statusFilter === "scheduled" && !isScheduledJob(job)) return false;

      if (
        keyword &&
        !`${job.title} ${job.description}`
          .toLowerCase()
          .includes(keyword.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [jobs, keyword, statusFilter]);

  const filteredTrainingPrograms = useMemo(() => {
    return trainingPrograms.filter((program) => {
      if (statusFilter === "active" && program.active === false) return false;
      if (statusFilter === "paused" && program.active !== false) return false;
      if (
        keyword &&
        !`${program.title} ${program.description} ${program.providerName}`
          .toLowerCase()
          .includes(keyword.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [trainingPrograms, keyword, statusFilter]);

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      if (appJobFilter !== "all" && app.jobId !== appJobFilter) return false;
      if (appStatusFilter !== "all" && app.status !== appStatusFilter) return false;
      if (
        keyword &&
        !`${app.memberDisplayName} ${app.memberEmail}`
          .toLowerCase()
          .includes(keyword.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [applications, appJobFilter, keyword, appStatusFilter]);

  const applicationCounts = useMemo(() => {
    return {
      total: applications.length,
      submitted: applications.filter((a) => a.status === "submitted").length,
      inReview: applications.filter((a) => a.status === "reviewed").length,
      shortlisted: applications.filter((a) => a.status === "shortlisted").length,
      hired: applications.filter((a) => a.status === "hired").length,
      rejected: applications.filter((a) => a.status === "rejected").length,
    };
  }, [applications]);

  const handleToggleJobStatus = async (jobId: string, currentStatus: boolean) => {
    try {
      await updateJobStatus(jobId, !currentStatus);
      await loadData();
    } catch (err) {
      console.error("Error toggling job status:", err);
      toast.error("Failed to update job status");
    }
  };

  const handleDeleteJob = async (jobId: string, title: string) => {
    const confirmed = await confirm(deleteConfirmOptions(title, "Job"));
    if (!confirmed) return;

    try {
      await deleteJobPosting(jobId);
      await loadData();
      toast.success("Job deleted successfully");
    } catch (err) {
      console.error("Error deleting job:", err);
      toast.error("Failed to delete job");
    }
  };

  const handleDuplicateJob = (job: JobPosting) => {
    const duplicateData = {
      title: `${job.title} (Copy)`,
      location: job.location,
      employmentType: job.employmentType,
      remoteFlag: job.remoteFlag,
      indigenousPreference: job.indigenousPreference,
      description: job.description,
      responsibilities: job.responsibilities,
      qualifications: job.qualifications,
      salaryRange: job.salaryRange,
      applicationLink: job.applicationLink,
      applicationEmail: job.applicationEmail,
      cpicRequired: job.cpicRequired,
      willTrain: job.willTrain,
      quickApplyEnabled: job.quickApplyEnabled,
    };
    sessionStorage.setItem("duplicateJobData", JSON.stringify(duplicateData));
    router.push("/organization/jobs/new?duplicate=true");
  };

  const handleDeleteTrainingProgram = async (programId: string, title: string) => {
    const confirmed = await confirm(deleteConfirmOptions(title, "Training Program"));
    if (!confirmed) return;

    try {
      await deleteTrainingProgram(programId);
      await loadData();
      toast.success("Training program deleted successfully");
    } catch (err) {
      console.error("Error deleting training program:", err);
      toast.error("Failed to delete training program");
    }
  };

  const handleApplicationStatusChange = async (
    applicationId: string,
    newStatus: ApplicationStatus
  ) => {
    try {
      await updateApplicationStatus(applicationId, newStatus);
      await loadData();
    } catch (err) {
      console.error("Error updating application status:", err);
      toast.error("Failed to update application status");
    }
  };

  // Toggle notes section visibility
  const toggleNotes = (applicationId: string) => {
    setExpandedNotes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(applicationId)) {
        newSet.delete(applicationId);
      } else {
        newSet.add(applicationId);
      }
      return newSet;
    });
  };

  // Add a new note to an application
  const handleAddNote = async (applicationId: string) => {
    const noteText = newNoteText[applicationId]?.trim();
    if (!noteText || !user) return;

    setAddingNote(applicationId);
    try {
      await addApplicantNote(applicationId, {
        content: noteText,
        createdBy: user.uid,
        createdByName: user.displayName || user.email || "Employer",
      });
      setNewNoteText((prev) => ({ ...prev, [applicationId]: "" }));
      await loadData();
    } catch (err) {
      console.error("Error adding note:", err);
      toast.error("Failed to add note");
    } finally {
      setAddingNote(null);
    }
  };

  // Delete a note from an application
  const handleDeleteNote = async (applicationId: string, noteId: string) => {
    const confirmed = await confirm({
      title: "Delete Note",
      message: "Are you sure you want to delete this note?",
      confirmText: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await deleteApplicantNote(applicationId, noteId);
      await loadData();
      toast.success("Note deleted");
    } catch (err) {
      console.error("Error deleting note:", err);
      toast.error("Failed to delete note");
    }
  };

  // Format note timestamp
  const formatNoteDate = (timestamp: any) => {
    if (!timestamp) return "";
    try {
      const date = timestamp.toDate?.() || new Date(timestamp);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === "hired")
      return "bg-green-500/20 text-green-300 border-green-500/40";
    if (s === "shortlisted")
      return "bg-yellow-500/20 text-yellow-300 border-yellow-500/40";
    if (s === "reviewed" || s === "reviewing")
      return "bg-blue-500/20 text-blue-300 border-blue-500/40";
    if (s === "rejected")
      return "bg-slate-500/20 text-[var(--text-muted)] border-slate-500/40";
    if (s === "withdrawn")
      return "bg-orange-500/20 text-orange-300 border-orange-500/40";
    return "bg-accent/20 text-emerald-300 border-accent/40";
  };

  // Export applications to CSV
  const exportApplicationsToCSV = () => {
    if (filteredApplications.length === 0) {
      toast.error("No applications to export");
      return;
    }

    // CSV headers
    const headers = [
      "Applicant Name",
      "Email",
      "Job Title",
      "Status",
      "Applied Date",
      "Cover Letter",
      "Resume URL",
      "Notes",
    ];

    // Format date helper
    const formatDate = (timestamp: any) => {
      if (!timestamp) return "";
      try {
        const date = timestamp.toDate?.() || new Date(timestamp);
        return date.toLocaleDateString("en-CA"); // YYYY-MM-DD format
      } catch {
        return "";
      }
    };

    // Escape CSV field (handle commas, quotes, newlines)
    const escapeCSV = (field: string | undefined | null) => {
      if (!field) return "";
      const str = String(field);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Build CSV rows
    const rows = filteredApplications.map((app) => {
      const job = jobs.find((j) => j.id === app.jobId);
      // Combine all notes into a single cell
      const notesText = app.employerNotes
        ?.map((n) => `[${n.createdByName || "Employer"}]: ${n.content}`)
        .join(" | ") || "";
      return [
        escapeCSV(app.memberDisplayName || "Anonymous"),
        escapeCSV(app.memberEmail),
        escapeCSV(job?.title || "Unknown"),
        escapeCSV(app.status || "submitted"),
        formatDate(app.createdAt),
        escapeCSV(app.coverLetter?.slice(0, 500)), // Truncate long cover letters
        escapeCSV(app.resumeUrl),
        escapeCSV(notesText),
      ].join(",");
    });

    // Combine headers and rows
    const csvContent = [headers.join(","), ...rows].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `applications-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getNewButtonConfig = () => {
    switch (careerType) {
      case "jobs":
        return { href: "/organization/jobs/new", label: "Job" };
      case "training":
        return { href: "/organization/training/new", label: "Training Program" };
      case "applications":
        return null; // No "new" button for applications
    }
  };

  const newButtonConfig = getNewButtonConfig();

  // Count pending applications (submitted status)
  const pendingApplicationsCount = applicationCounts.submitted;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10 p-8 shadow-xl shadow-blue-900/20">
        <div className="flex items-center gap-3">
          <BriefcaseIcon className="h-8 w-8 text-blue-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">Careers</h2>
            <p className="mt-1 text-[var(--text-muted)]">
              Manage job postings, training programs, and applications
            </p>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-[var(--card-border)] pb-px overflow-x-auto">
        <button
          onClick={() => setCareerType("jobs")}
          className={`flex items-center gap-2 rounded-t-lg px-4 py-3 text-sm font-medium transition-all whitespace-nowrap ${careerType === "jobs"
              ? "border-b-2 border-blue-500 bg-blue-500/10 text-blue-400"
              : "border-b-2 border-transparent text-[var(--text-muted)] hover:border-[var(--card-border)] hover:text-[var(--text-secondary)]"
            }`}
        >
          <BriefcaseIcon className="h-4 w-4" />
          Jobs ({jobs.length})
        </button>
        <button
          onClick={() => setCareerType("training")}
          className={`flex items-center gap-2 rounded-t-lg px-4 py-3 text-sm font-medium transition-all whitespace-nowrap ${careerType === "training"
              ? "border-b-2 border-purple-500 bg-purple-500/10 text-purple-400"
              : "border-b-2 border-transparent text-[var(--text-muted)] hover:border-[var(--card-border)] hover:text-[var(--text-secondary)]"
            }`}
        >
          <AcademicCapIcon className="h-4 w-4" />
          Training ({trainingPrograms.length})
        </button>
        <button
          onClick={() => setCareerType("applications")}
          className={`flex items-center gap-2 rounded-t-lg px-4 py-3 text-sm font-medium transition-all whitespace-nowrap ${careerType === "applications"
              ? "border-b-2 border-accent bg-accent/10 text-accent"
              : "border-b-2 border-transparent text-[var(--text-muted)] hover:border-[var(--card-border)] hover:text-[var(--text-secondary)]"
            }`}
        >
          <UserGroupIcon className="h-4 w-4" />
          Applications ({applications.length})
          {pendingApplicationsCount > 0 && (
            <span className="ml-1 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white">
              {pendingApplicationsCount}
            </span>
          )}
        </button>
      </div>

      {/* Filters for Jobs/Training */}
      {(careerType === "jobs" || careerType === "training") && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-foreground0">
              Search
            </label>
            <input
              ref={searchInputRef}
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={`Search ${careerType}... (Press / to focus)`}
              className="w-full rounded-xl border border-blue-500/20 bg-surface px-4 py-3 text-foreground placeholder-slate-500 transition-all focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-foreground0">
              Filter by status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-xl border border-blue-500/20 bg-surface px-4 py-3 text-foreground transition-all focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All</option>
              <option value="active">Active only</option>
              <option value="paused">Paused only</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>
          {newButtonConfig && (
            <div>
              <Link
                href={newButtonConfig.href}
                className="inline-flex rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/50"
              >
                + New {newButtonConfig.label}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Filters for Applications */}
      {careerType === "applications" && (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-foreground0">
              Search candidates
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground placeholder-slate-500 transition-all focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-foreground0">
              Filter by job
            </label>
            <select
              value={appJobFilter}
              onChange={(e) => setAppJobFilter(e.target.value)}
              className="rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground transition-all focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="all">All jobs</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-foreground0">
              Filter by status
            </label>
            <select
              value={appStatusFilter}
              onChange={(e) => setAppStatusFilter(e.target.value)}
              className="rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground transition-all focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="all">All statuses</option>
              <option value="submitted">Submitted</option>
              <option value="reviewed">In review</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="hired">Hired</option>
              <option value="rejected">Not selected</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-foreground0">
              &nbsp;
            </label>
            <button
              onClick={exportApplicationsToCSV}
              disabled={filteredApplications.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      )}

      {/* Jobs List */}
      {careerType === "jobs" && (
        <div className="rounded-3xl bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10 p-8 shadow-xl shadow-blue-900/20">
          {loading ? (
            <p className="text-center text-[var(--text-muted)]">Loading jobs...</p>
          ) : filteredJobs.length === 0 ? (
            <div className="rounded-xl bg-surface p-8 text-center">
              <BriefcaseIcon className="mx-auto h-12 w-12 text-slate-600" />
              <p className="mt-4 text-[var(--text-secondary)]">
                {jobs.length === 0
                  ? "No jobs posted yet. Create your first job posting to get started."
                  : "No jobs match your filters."}
              </p>
              {jobs.length === 0 && (
                <Link
                  href="/organization/jobs/new"
                  className="mt-4 inline-block rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/50"
                >
                  Post your first job
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredJobs.map((job) => (
                <article
                  key={job.id}
                  className="rounded-xl border border-blue-500/20 bg-surface p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white">
                            {job.title}
                          </h3>
                          <p className="mt-1 text-sm text-blue-400">
                            {job.employerName}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
                            {job.employmentType}
                          </span>
                          {isScheduledJob(job) ? (
                            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
                              ⏰ Scheduled
                            </span>
                          ) : job.active === false ? (
                            <span className="rounded-full border border-[var(--card-border)] bg-slate-700/30 px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
                              Paused
                            </span>
                          ) : (
                            <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-300">
                              Active
                            </span>
                          )}
                        </div>
                      </div>

                      {job.description && (
                        <p className="mt-3 text-sm text-[var(--text-secondary)]">
                          {job.description.slice(0, 150)}
                          {job.description.length > 150 ? "..." : ""}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-4 text-xs text-[var(--text-muted)]">
                        <span>Location: {job.location || "Remote"}</span>
                        <span>Views: {job.viewsCount || 0}</span>
                        <span>Applications: {job.applicationsCount || 0}</span>
                        {isScheduledJob(job) && job.scheduledPublishAt && (
                          <span className="text-amber-400">
                            Publishes: {new Date(
                              typeof job.scheduledPublishAt === 'object' && 'toDate' in job.scheduledPublishAt
                                ? job.scheduledPublishAt.toDate()
                                : job.scheduledPublishAt
                            ).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/organization/jobs/${job.id}/edit`}
                      className="rounded-lg bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-300 transition-all hover:bg-blue-500/30"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => {
                        setAppJobFilter(job.id);
                        setCareerType("applications");
                      }}
                      className="rounded-lg bg-indigo-500/20 px-4 py-2 text-sm font-semibold text-indigo-300 transition-all hover:bg-indigo-500/30"
                    >
                      View applications
                    </button>
                    <button
                      onClick={() => handleDuplicateJob(job)}
                      className="rounded-lg bg-purple-500/20 px-4 py-2 text-sm font-semibold text-purple-300 transition-all hover:bg-purple-500/30"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => handleToggleJobStatus(job.id, job.active !== false)}
                      className="rounded-lg bg-slate-700/50 px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-all hover:bg-slate-700"
                    >
                      {job.active !== false ? "Pause" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDeleteJob(job.id, job.title)}
                      className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-300 transition-all hover:bg-red-500/30"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Training Programs List */}
      {careerType === "training" && (
        <div className="rounded-3xl bg-gradient-to-br from-purple-500/10 via-indigo-500/10 to-violet-500/10 p-8 shadow-xl shadow-purple-900/20">
          {loading ? (
            <p className="text-center text-[var(--text-muted)]">Loading training programs...</p>
          ) : filteredTrainingPrograms.length === 0 ? (
            <div className="rounded-xl bg-surface p-8 text-center">
              <AcademicCapIcon className="mx-auto h-12 w-12 text-slate-600" />
              <p className="mt-4 text-[var(--text-secondary)]">
                {trainingPrograms.length === 0
                  ? "No training programs posted yet. Share your training opportunities with Indigenous learners."
                  : "No training programs match your filters."}
              </p>
              {trainingPrograms.length === 0 && (
                <Link
                  href="/organization/training/new"
                  className="mt-4 inline-block rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition-all hover:shadow-xl hover:shadow-purple-500/50"
                >
                  Post your first training program
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTrainingPrograms.map((program) => (
                <article
                  key={program.id}
                  className="rounded-xl border border-purple-500/20 bg-surface p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-semibold text-white">
                              {program.title}
                            </h3>
                            {program.featured && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-xs font-bold text-white">
                                Featured
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-purple-400">
                            by {program.providerName}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {program.active === false ? (
                            <span className="rounded-full border border-[var(--card-border)] bg-slate-700/30 px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
                              Inactive
                            </span>
                          ) : program.status === "pending" ? (
                            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
                              Pending Review
                            </span>
                          ) : program.status === "rejected" ? (
                            <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300">
                              Rejected
                            </span>
                          ) : (
                            <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-300">
                              Approved
                            </span>
                          )}
                        </div>
                      </div>

                      {program.shortDescription && (
                        <p className="mt-3 text-sm text-[var(--text-secondary)]">
                          {program.shortDescription.slice(0, 150)}
                          {program.shortDescription.length > 150 ? "..." : ""}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
                        <span className="rounded-full bg-slate-700/50 px-2 py-1">
                          {program.format === "online" ? "Online" : program.format === "in-person" ? "In-Person" : "Hybrid"}
                        </span>
                        {program.category && (
                          <span className="rounded-full bg-purple-500/20 px-2 py-1 text-purple-300">
                            {program.category}
                          </span>
                        )}
                        {program.duration && (
                          <span className="rounded-full bg-slate-700/50 px-2 py-1">
                            {program.duration}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-4 text-xs text-foreground0">
                        <span>Views: {program.viewCount || 0}</span>
                        <span>Clicks: {program.clickCount || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/organization/training/${program.id}/edit`}
                      className="rounded-lg bg-purple-500/20 px-4 py-2 text-sm font-semibold text-purple-300 transition-all hover:bg-purple-500/30"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/careers/programs/${program.id}`}
                      className="rounded-lg bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-300 transition-all hover:bg-blue-500/30"
                    >
                      View public page
                    </Link>
                    <button
                      onClick={() => handleDeleteTrainingProgram(program.id, program.title)}
                      className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-300 transition-all hover:bg-red-500/30"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Applications List */}
      {careerType === "applications" && (
        <>
          {/* Application Stats */}
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-2xl bg-surface p-4 text-center">
              <p className="text-xs uppercase tracking-wider text-foreground0">Total</p>
              <p className="mt-1 text-2xl font-bold text-white">{applicationCounts.total}</p>
            </div>
            <div className="rounded-2xl bg-accent/10 p-4 text-center">
              <p className="text-xs uppercase tracking-wider text-foreground0">New</p>
              <p className="mt-1 text-2xl font-bold text-accent">{applicationCounts.submitted}</p>
            </div>
            <div className="rounded-2xl bg-blue-500/10 p-4 text-center">
              <p className="text-xs uppercase tracking-wider text-foreground0">In Review</p>
              <p className="mt-1 text-2xl font-bold text-blue-400">{applicationCounts.inReview}</p>
            </div>
            <div className="rounded-2xl bg-yellow-500/10 p-4 text-center">
              <p className="text-xs uppercase tracking-wider text-foreground0">Shortlisted</p>
              <p className="mt-1 text-2xl font-bold text-yellow-400">{applicationCounts.shortlisted}</p>
            </div>
            <div className="rounded-2xl bg-green-500/10 p-4 text-center">
              <p className="text-xs uppercase tracking-wider text-foreground0">Hired</p>
              <p className="mt-1 text-2xl font-bold text-green-400">{applicationCounts.hired}</p>
            </div>
            <div className="rounded-2xl bg-slate-700/50 p-4 text-center">
              <p className="text-xs uppercase tracking-wider text-foreground0">Rejected</p>
              <p className="mt-1 text-2xl font-bold text-[var(--text-muted)]">{applicationCounts.rejected}</p>
            </div>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
            {loading ? (
              <p className="text-center text-[var(--text-muted)]">Loading applications...</p>
            ) : filteredApplications.length === 0 ? (
              <div className="rounded-xl bg-surface p-8 text-center">
                <UserGroupIcon className="mx-auto h-12 w-12 text-slate-600" />
                <p className="mt-4 text-[var(--text-secondary)]">
                  {applications.length === 0
                    ? "No applications received yet. Applications will appear here as candidates apply to your jobs."
                    : "No applications match your filters."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredApplications.map((app) => {
                  const job = jobs.find((j) => j.id === app.jobId);
                  return (
                    <article
                      key={app.id}
                      className="rounded-xl border border-accent/20 bg-surface p-6"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-lg font-semibold text-white">
                                {app.memberDisplayName || "Anonymous"}
                              </h3>
                              <p className="mt-1 text-sm text-[var(--text-muted)]">
                                {app.memberEmail}
                              </p>
                              <p className="mt-2 text-sm text-accent">
                                Applied to: {job?.title || "Unknown job"}
                              </p>
                            </div>
                          </div>

                          {app.coverLetter && (
                            <div className="mt-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground0">
                                Cover Letter
                              </p>
                              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                                {app.coverLetter.slice(0, 200)}
                                {app.coverLetter.length > 200 ? "..." : ""}
                              </p>
                            </div>
                          )}

                          <div className="mt-4 flex flex-wrap gap-3">
                            {app.resumeUrl && (
                              <Link
                                href={app.resumeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg bg-accent/20 px-4 py-2 text-sm font-semibold text-emerald-300 transition-all hover:bg-accent/30"
                              >
                                View resume
                              </Link>
                            )}
                            <a
                              href={`mailto:${app.memberEmail}`}
                              className="inline-flex items-center gap-2 rounded-lg bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-300 transition-all hover:bg-blue-500/30"
                            >
                              Email candidate
                            </a>
                            <button
                              onClick={() => toggleNotes(app.id)}
                              className="inline-flex items-center gap-2 rounded-lg bg-purple-500/20 px-4 py-2 text-sm font-semibold text-purple-300 transition-all hover:bg-purple-500/30"
                            >
                              <ChatBubbleLeftIcon className="h-4 w-4" />
                              Notes {app.employerNotes?.length ? `(${app.employerNotes.length})` : ""}
                            </button>
                          </div>

                          {/* Notes Section */}
                          {expandedNotes.has(app.id) && (
                            <div className="mt-4 rounded-lg border border-purple-500/30 bg-purple-500/5 p-4">
                              <h4 className="text-sm font-semibold text-purple-300 mb-3">
                                Private Notes
                              </h4>

                              {/* Existing Notes */}
                              {app.employerNotes && app.employerNotes.length > 0 ? (
                                <div className="space-y-3 mb-4">
                                  {app.employerNotes.map((note) => (
                                    <div
                                      key={note.id}
                                      className="rounded-lg bg-surface p-3 group"
                                    >
                                      <div className="flex justify-between items-start gap-2">
                                        <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap flex-1">
                                          {note.content}
                                        </p>
                                        <button
                                          onClick={() => handleDeleteNote(app.id, note.id)}
                                          className="opacity-0 group-hover:opacity-100 text-foreground0 hover:text-red-400 transition-all p-1"
                                          title="Delete note"
                                        >
                                          <TrashIcon className="h-4 w-4" />
                                        </button>
                                      </div>
                                      <p className="text-xs text-foreground0 mt-2">
                                        {note.createdByName || "You"} • {formatNoteDate(note.createdAt)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-foreground0 mb-4">
                                  No notes yet. Add a note to track this candidate.
                                </p>
                              )}

                              {/* Add New Note */}
                              <div className="flex gap-2">
                                <textarea
                                  value={newNoteText[app.id] || ""}
                                  onChange={(e) =>
                                    setNewNoteText((prev) => ({
                                      ...prev,
                                      [app.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="Add a note about this candidate..."
                                  rows={2}
                                  className="flex-1 rounded-lg border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                />
                                <button
                                  onClick={() => handleAddNote(app.id)}
                                  disabled={!newNoteText[app.id]?.trim() || addingNote === app.id}
                                  className="self-end rounded-lg bg-purple-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {addingNote === app.id ? (
                                    "..."
                                  ) : (
                                    <PlusIcon className="h-5 w-5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-3">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusColor(
                              app.status || "submitted"
                            )}`}
                          >
                            {app.status || "submitted"}
                          </span>
                          <select
                            value={app.status || "submitted"}
                            onChange={(e) =>
                              handleApplicationStatusChange(
                                app.id,
                                e.target.value as ApplicationStatus
                              )
                            }
                            className="rounded-lg border border-[var(--card-border)] bg-surface px-3 py-2 text-xs text-foreground transition-all hover:border-accent/50 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                          >
                            <option value="submitted">Submitted</option>
                            <option value="reviewed">In review</option>
                            <option value="shortlisted">Shortlisted</option>
                            <option value="hired">Hired</option>
                            <option value="rejected">Not selected</option>
                          </select>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog />
      <KeyboardShortcutsHelp shortcuts={shortcuts} />
    </div>
  );
}
