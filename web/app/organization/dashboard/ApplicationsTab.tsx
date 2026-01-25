"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  listEmployerApplications,
  listEmployerJobs,
  updateApplicationStatus,
  addApplicantNote,
  deleteApplicantNote,
} from "@/lib/firestore";
import type { JobPosting, JobApplication, ApplicationStatus, ApplicantNote } from "@/lib/types";
import { ArrowDownTrayIcon, ChatBubbleLeftIcon, PlusIcon, TrashIcon, EnvelopeIcon, PhoneIcon, BriefcaseIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useConfirmDialog, deleteConfirmOptions } from "@/hooks/useConfirmDialog";

const APPLICATION_STATUSES: { value: ApplicationStatus; label: string; color: string }[] = [
  { value: "submitted", label: "New", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { value: "reviewed", label: "Reviewed", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  { value: "shortlisted", label: "Shortlisted", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { value: "interviewing", label: "Interviewing", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { value: "offered", label: "Offered", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  { value: "hired", label: "Hired", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { value: "rejected", label: "Rejected", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  { value: "withdrawn", label: "Withdrawn", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
];

export default function ApplicationsTab() {
  const { user } = useAuth();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [keyword, setKeyword] = useState("");

  // Notes state
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [newNoteText, setNewNoteText] = useState<Record<string, string>>({});
  const [addingNote, setAddingNote] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [appsData, jobsData] = await Promise.all([
        listEmployerApplications(user.uid),
        listEmployerJobs(user.uid),
      ]);
      setApplications(appsData);
      setJobs(jobsData);
    } catch (err) {
      console.error("Error loading applications:", err);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  // Create a map of job IDs to jobs for lookups
  const jobsMap = useMemo(() => {
    const map = new Map<string, JobPosting>();
    jobs.forEach((job) => {
      map.set(job.id, job);
    });
    return map;
  }, [jobs]);

  // Filter applications
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // Job filter
      if (jobFilter !== "all" && app.jobId !== jobFilter) return false;
      // Status filter
      if (statusFilter !== "all" && app.status !== statusFilter) return false;
      // Keyword search
      if (keyword) {
        const job = jobsMap.get(app.jobId);
        const searchText = `${app.memberDisplayName || ""} ${app.memberEmail || ""} ${job?.title || ""}`.toLowerCase();
        if (!searchText.includes(keyword.toLowerCase())) return false;
      }
      return true;
    });
  }, [applications, jobFilter, statusFilter, keyword, jobsMap]);

  // Handle status change
  const handleStatusChange = async (applicationId: string, newStatus: ApplicationStatus) => {
    try {
      await updateApplicationStatus(applicationId, newStatus);
      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId ? { ...app, status: newStatus } : app
        )
      );
      toast.success("Status updated");
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("Failed to update status");
    }
  };

  // Notes handlers
  const toggleNotes = (applicationId: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(applicationId)) {
        next.delete(applicationId);
      } else {
        next.add(applicationId);
      }
      return next;
    });
  };

  const handleAddNote = async (applicationId: string) => {
    const text = newNoteText[applicationId]?.trim();
    if (!text || !user) return;

    setAddingNote(applicationId);
    try {
      const note = await addApplicantNote(applicationId, { content: text, createdBy: user.uid });
      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId
            ? { ...app, employerNotes: [...(app.employerNotes || []), note] }
            : app
        )
      );
      setNewNoteText((prev) => ({ ...prev, [applicationId]: "" }));
      toast.success("Note added");
    } catch (err) {
      console.error("Error adding note:", err);
      toast.error("Failed to add note");
    } finally {
      setAddingNote(null);
    }
  };

  const handleDeleteNote = async (applicationId: string, noteId: string) => {
    const confirmed = await confirm(deleteConfirmOptions("note"));
    if (!confirmed) return;

    try {
      await deleteApplicantNote(applicationId, noteId);
      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId
            ? { ...app, employerNotes: (app.employerNotes || []).filter((n: ApplicantNote) => n.id !== noteId) }
            : app
        )
      );
      toast.success("Note deleted");
    } catch (err) {
      console.error("Error deleting note:", err);
      toast.error("Failed to delete note");
    }
  };

  const getStatusConfig = (status: ApplicationStatus) => {
    return APPLICATION_STATUSES.find((s) => s.value === status) || APPLICATION_STATUSES[0];
  };

  const formatDate = (timestamp: unknown): string => {
    if (!timestamp) return "";
    const date = typeof (timestamp as { toDate?: () => Date }).toDate === "function"
      ? (timestamp as { toDate: () => Date }).toDate()
      : new Date(timestamp as string | number);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Stats
  const stats = useMemo(() => {
    const newCount = applications.filter((a) => a.status === "submitted").length;
    const reviewedCount = applications.filter((a) => a.status === "reviewed").length;
    const shortlistedCount = applications.filter((a) => a.status === "shortlisted").length;
    return { newCount, reviewedCount, shortlistedCount, total: applications.length };
  }, [applications]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-xl bg-slate-800/50" />
        <div className="h-64 animate-pulse rounded-xl bg-slate-800/50" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog />

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-sm text-slate-400">Total Applications</div>
        </div>
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
          <div className="text-2xl font-bold text-blue-400">{stats.newCount}</div>
          <div className="text-sm text-blue-400/70">New</div>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="text-2xl font-bold text-amber-400">{stats.reviewedCount}</div>
          <div className="text-sm text-amber-400/70">Reviewed</div>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="text-2xl font-bold text-emerald-400">{stats.shortlistedCount}</div>
          <div className="text-sm text-emerald-400/70">Shortlisted</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Search applicants..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
        />
        <select
          value={jobFilter}
          onChange={(e) => setJobFilter(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
        >
          <option value="all">All Jobs</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
        >
          <option value="all">All Statuses</option>
          {APPLICATION_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center">
          <BriefcaseIcon className="mx-auto h-12 w-12 text-slate-600" />
          <h3 className="mt-4 text-lg font-semibold text-white">No applications found</h3>
          <p className="mt-2 text-slate-400">
            {applications.length === 0
              ? "You haven't received any applications yet."
              : "Try adjusting your filters."}
          </p>
          {applications.length === 0 && (
            <Link
              href="/organization/jobs/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              <PlusIcon className="h-4 w-4" />
              Post a Job
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((app) => {
            const statusConfig = getStatusConfig(app.status);
            const isNotesExpanded = expandedNotes.has(app.id);
            const notes = app.employerNotes || [];
            const job = jobsMap.get(app.jobId);

            return (
              <div
                key={app.id}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  {/* Applicant Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                        {(app.memberDisplayName || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{app.memberDisplayName || "Anonymous"}</h3>
                        <p className="text-sm text-slate-400">{job?.title || "Unknown Job"}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-400">
                      {app.memberEmail && (
                        <a
                          href={`mailto:${app.memberEmail}`}
                          className="flex items-center gap-1 hover:text-emerald-400"
                        >
                          <EnvelopeIcon className="h-4 w-4" />
                          {app.memberEmail}
                        </a>
                      )}
                      <span>Applied {formatDate(app.createdAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <select
                      value={app.status}
                      onChange={(e) => handleStatusChange(app.id, e.target.value as ApplicationStatus)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium focus:outline-none ${statusConfig.color}`}
                    >
                      {APPLICATION_STATUSES.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>

                    {app.resumeUrl && (
                      <a
                        href={app.resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        Resume
                      </a>
                    )}

                    <button
                      onClick={() => toggleNotes(app.id)}
                      className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm ${
                        isNotesExpanded
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      <ChatBubbleLeftIcon className="h-4 w-4" />
                      {notes.length > 0 && <span>{notes.length}</span>}
                    </button>
                  </div>
                </div>

                {/* Cover Letter */}
                {app.coverLetter && (
                  <div className="mt-4 rounded-lg bg-slate-800/50 p-4">
                    <h4 className="mb-2 text-sm font-semibold text-slate-300">Cover Letter</h4>
                    <p className="text-sm text-slate-400 whitespace-pre-wrap">{app.coverLetter}</p>
                  </div>
                )}

                {/* Notes Section */}
                {isNotesExpanded && (
                  <div className="mt-4 border-t border-slate-800 pt-4">
                    <h4 className="mb-3 text-sm font-semibold text-slate-300">Notes</h4>

                    {notes.length > 0 && (
                      <div className="mb-4 space-y-2">
                        {notes.map((note: ApplicantNote) => (
                          <div
                            key={note.id}
                            className="flex items-start justify-between rounded-lg bg-slate-800/50 p-3"
                          >
                            <div className="flex-1">
                              <p className="text-sm text-slate-300">{note.content}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {formatDate(note.createdAt)}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteNote(app.id, note.id)}
                              className="ml-2 text-slate-500 hover:text-red-400"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Note Form */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add a note..."
                        value={newNoteText[app.id] || ""}
                        onChange={(e) =>
                          setNewNoteText((prev) => ({ ...prev, [app.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleAddNote(app.id);
                          }
                        }}
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                      />
                      <button
                        onClick={() => handleAddNote(app.id)}
                        disabled={addingNote === app.id || !newNoteText[app.id]?.trim()}
                        className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                      >
                        {addingNote === app.id ? "..." : "Add"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
