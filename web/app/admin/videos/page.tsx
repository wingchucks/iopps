"use client";

import { useEffect, useState, useMemo } from "react";
import {
  listEmployers,
  listEmployerJobs,
  getEmployerProfile,
  addEmployerInterview,
  updateEmployerInterview,
  deleteEmployerInterview,
  setEmployerCompanyIntro,
  removeEmployerCompanyIntro,
  setJobVideo,
  removeJobVideo,
} from "@/lib/firestore";
import { EmployerProfile, Interview, JobPosting, CompanyVideo, JobVideo } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import {
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  PlayCircleIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  BuildingOfficeIcon,
  VideoCameraIcon,
  BriefcaseIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

// Helper to detect video provider from URL
function detectVideoProvider(url: string): { provider: "youtube" | "vimeo" | "custom"; videoId?: string } {
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (youtubeMatch) {
    return { provider: "youtube", videoId: youtubeMatch[1] };
  }

  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
  if (vimeoMatch) {
    return { provider: "vimeo", videoId: vimeoMatch[1] };
  }

  return { provider: "custom" };
}

// Video Form Component
interface VideoFormData {
  videoUrl: string;
  title: string;
  description: string;
  isIOPPSInterview: boolean;
}

function VideoForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  showIOPPSToggle = true,
}: {
  initialData?: Partial<VideoFormData>;
  onSubmit: (data: VideoFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  showIOPPSToggle?: boolean;
}) {
  const [formData, setFormData] = useState<VideoFormData>({
    videoUrl: initialData?.videoUrl || "",
    title: initialData?.title || "",
    description: initialData?.description || "",
    isIOPPSInterview: initialData?.isIOPPSInterview ?? true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.videoUrl.trim()) {
      setError("Video URL is required");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.message || "Failed to save video");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
          Video URL <span className="text-red-400">*</span>
        </label>
        <input
          type="url"
          value={formData.videoUrl}
          onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
          placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
          className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground placeholder-slate-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        <p className="mt-1 text-xs text-foreground0">Supports YouTube, Vimeo, or custom video URLs</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Video title"
          className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground placeholder-slate-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of the video"
          rows={3}
          className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground placeholder-slate-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      {showIOPPSToggle && (
        <div className="flex items-center gap-3">
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={formData.isIOPPSInterview}
              onChange={(e) => setFormData({ ...formData, isIOPPSInterview: e.target.checked })}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-[var(--card-border)] after:bg-slate-400 after:transition-all after:content-[''] peer-checked:bg-accent peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:after:bg-white peer-focus:outline-none"></div>
          </label>
          <span className="text-sm text-[var(--text-secondary)]">
            {formData.isIOPPSInterview ? "IOPPS Interview" : "Employer Promotional Video"}
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-900/30 border border-red-700/50 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-surface"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-slate-900 hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default function AdminVideosPage() {
  const { user, role } = useAuth();
  const [employers, setEmployers] = useState<EmployerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Selected employer state
  const [selectedEmployer, setSelectedEmployer] = useState<EmployerProfile | null>(null);
  const [employerJobs, setEmployerJobs] = useState<JobPosting[]>([]);
  const [loadingEmployerData, setLoadingEmployerData] = useState(false);

  // Modal states
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
  const [showJobVideoModal, setShowJobVideoModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const fetchEmployers = async () => {
      setLoading(true);
      try {
        const data = await listEmployers("approved");
        setEmployers(data);
      } catch (error) {
        console.error("Failed to fetch employers:", error);
        showToast("error", "Failed to load employers");
      } finally {
        setLoading(false);
      }
    };
    fetchEmployers();
  }, []);

  const filteredEmployers = useMemo(() => {
    if (!searchQuery.trim()) return employers;
    const query = searchQuery.toLowerCase();
    return employers.filter(
      (emp) =>
        emp.organizationName?.toLowerCase().includes(query) ||
        emp.location?.toLowerCase().includes(query)
    );
  }, [employers, searchQuery]);

  const handleSelectEmployer = async (employer: EmployerProfile) => {
    setSelectedEmployer(employer);
    setLoadingEmployerData(true);
    try {
      const [freshProfile, jobs] = await Promise.all([
        getEmployerProfile(employer.id),
        listEmployerJobs(employer.id),
      ]);
      if (freshProfile) {
        setSelectedEmployer(freshProfile);
      }
      setEmployerJobs(jobs);
    } catch (error) {
      console.error("Failed to load employer data:", error);
      showToast("error", "Failed to load employer data");
    } finally {
      setLoadingEmployerData(false);
    }
  };

  const refreshEmployerData = async () => {
    if (!selectedEmployer) return;
    try {
      const [freshProfile, jobs] = await Promise.all([
        getEmployerProfile(selectedEmployer.id),
        listEmployerJobs(selectedEmployer.id),
      ]);
      if (freshProfile) {
        setSelectedEmployer(freshProfile);
      }
      setEmployerJobs(jobs);
    } catch (error) {
      console.error("Failed to refresh:", error);
    }
  };

  // Company Intro Video handlers
  const handleSaveCompanyIntro = async (data: VideoFormData) => {
    if (!selectedEmployer) return;
    const { provider, videoId } = detectVideoProvider(data.videoUrl);
    const videoData: CompanyVideo = {
      videoUrl: data.videoUrl,
      videoProvider: provider,
      videoId,
      title: data.title || undefined,
      description: data.description || undefined,
    };
    await setEmployerCompanyIntro(selectedEmployer.id, videoData);
    await refreshEmployerData();
    setShowIntroModal(false);
    showToast("success", "Company intro video saved");
  };

  const handleRemoveCompanyIntro = async () => {
    if (!selectedEmployer) return;
    if (!confirm("Remove company intro video?")) return;
    try {
      await removeEmployerCompanyIntro(selectedEmployer.id);
      await refreshEmployerData();
      showToast("success", "Company intro video removed");
    } catch (error) {
      showToast("error", "Failed to remove video");
    }
  };

  // Interview handlers
  const handleSaveInterview = async (data: VideoFormData) => {
    if (!selectedEmployer || !user) return;
    const { provider, videoId } = detectVideoProvider(data.videoUrl);

    if (editingInterview) {
      // Update existing
      await updateEmployerInterview(selectedEmployer.id, editingInterview.id, {
        videoUrl: data.videoUrl,
        videoProvider: provider,
        videoId,
        title: data.title || undefined,
        description: data.description || undefined,
        isIOPPSInterview: data.isIOPPSInterview,
      });
      showToast("success", "Video updated");
    } else {
      // Add new
      await addEmployerInterview(selectedEmployer.id, {
        videoUrl: data.videoUrl,
        videoProvider: provider,
        videoId,
        title: data.title || undefined,
        description: data.description || undefined,
        isIOPPSInterview: data.isIOPPSInterview,
        addedBy: user.uid,
        active: true,
      });
      showToast("success", "Video added");
    }

    await refreshEmployerData();
    setShowInterviewModal(false);
    setEditingInterview(null);
  };

  const handleDeleteInterview = async (interview: Interview) => {
    if (!selectedEmployer) return;
    if (!confirm(`Delete "${interview.title || "this video"}"?`)) return;
    try {
      await deleteEmployerInterview(selectedEmployer.id, interview.id);
      await refreshEmployerData();
      showToast("success", "Video deleted");
    } catch (error) {
      showToast("error", "Failed to delete video");
    }
  };

  // Job Video handlers
  const handleSaveJobVideo = async (data: VideoFormData) => {
    if (!selectedJob) return;
    const { provider, videoId } = detectVideoProvider(data.videoUrl);
    const videoData: JobVideo = {
      videoUrl: data.videoUrl,
      videoProvider: provider,
      videoId,
      title: data.title || undefined,
      description: data.description || undefined,
      isIOPPSInterview: data.isIOPPSInterview,
    };
    await setJobVideo(selectedJob.id, videoData);
    await refreshEmployerData();
    setShowJobVideoModal(false);
    setSelectedJob(null);
    showToast("success", "Job video saved");
  };

  const handleRemoveJobVideo = async (job: JobPosting) => {
    if (!confirm(`Remove video from "${job.title}"?`)) return;
    try {
      await removeJobVideo(job.id);
      await refreshEmployerData();
      showToast("success", "Job video removed");
    } catch (error) {
      showToast("error", "Failed to remove video");
    }
  };

  // Check admin access (after all hooks)
  if (!loading && role !== "admin" && role !== "moderator") {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950/20 p-8 text-center">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
        <h2 className="mt-4 text-xl font-bold text-red-400">Unauthorized Access</h2>
        <p className="mt-2 text-[var(--text-muted)]">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Video Management</h1>
        <p className="mt-1 text-[var(--text-muted)]">
          Manage employer videos including company intros, IOPPS interviews, and job-specific videos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Employer List */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-[var(--card-border)] bg-surface p-4">
            <h2 className="text-lg font-semibold text-foreground mb-4">Select Employer</h2>

            {/* Search */}
            <div className="relative mb-4">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground0" />
              <input
                type="text"
                placeholder="Search employers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-[var(--card-border)] bg-surface py-2 pl-10 pr-4 text-sm text-foreground placeholder-slate-500 focus:border-accent focus:outline-none"
              />
            </div>

            {/* Employer List */}
            <div className="max-h-[calc(100vh-320px)] overflow-y-auto space-y-2">
              {loading ? (
                <div className="py-8 text-center">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[var(--card-border)] border-t-teal-500"></div>
                </div>
              ) : filteredEmployers.length === 0 ? (
                <p className="py-4 text-center text-sm text-foreground0">No employers found</p>
              ) : (
                filteredEmployers.map((employer) => (
                  <button
                    key={employer.id}
                    onClick={() => handleSelectEmployer(employer)}
                    className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                      selectedEmployer?.id === employer.id
                        ? "border-accent bg-accent/10"
                        : "border-[var(--card-border)] hover:border-[var(--card-border)] hover:bg-surface"
                    }`}
                  >
                    {employer.logoUrl ? (
                      <img
                        src={employer.logoUrl}
                        alt={`${employer.organizationName} logo`}
                        className="h-10 w-10 rounded-lg border border-[var(--card-border)] bg-white object-contain p-1"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--card-border)] bg-surface">
                        <BuildingOfficeIcon className="h-5 w-5 text-foreground0" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {employer.organizationName}
                      </p>
                      {employer.location && (
                        <p className="truncate text-xs text-foreground0">{employer.location}</p>
                      )}
                    </div>
                    {(employer.interviews?.length || employer.companyIntroVideo) && (
                      <VideoCameraIcon className="h-4 w-4 text-accent flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Video Management Panel */}
        <div className="lg:col-span-2">
          {!selectedEmployer ? (
            <div className="rounded-lg border border-[var(--card-border)] bg-surface p-12 text-center">
              <VideoCameraIcon className="mx-auto h-12 w-12 text-slate-600" />
              <h3 className="mt-4 text-lg font-medium text-[var(--text-secondary)]">Select an Employer</h3>
              <p className="mt-2 text-sm text-foreground0">
                Choose an employer from the list to manage their videos
              </p>
            </div>
          ) : loadingEmployerData ? (
            <div className="rounded-lg border border-[var(--card-border)] bg-surface p-12 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--card-border)] border-t-teal-500"></div>
              <p className="mt-4 text-[var(--text-muted)]">Loading employer data...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Employer Header */}
              <div className="rounded-lg border border-[var(--card-border)] bg-surface p-4">
                <div className="flex items-center gap-4">
                  {selectedEmployer.logoUrl ? (
                    <img
                      src={selectedEmployer.logoUrl}
                      alt={`${selectedEmployer.organizationName} logo`}
                      className="h-14 w-14 rounded-lg border border-[var(--card-border)] bg-white object-contain p-1"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-[var(--card-border)] bg-surface">
                      <BuildingOfficeIcon className="h-7 w-7 text-foreground0" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      {selectedEmployer.organizationName}
                    </h2>
                    <p className="text-sm text-[var(--text-muted)]">{selectedEmployer.location}</p>
                  </div>
                </div>
              </div>

              {/* Company Intro Video */}
              <div className="rounded-lg border border-[var(--card-border)] bg-surface p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Company Intro Video</h3>
                  {!selectedEmployer.companyIntroVideo && (
                    <button
                      onClick={() => setShowIntroModal(true)}
                      className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/20"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Add Video
                    </button>
                  )}
                </div>

                {selectedEmployer.companyIntroVideo ? (
                  <div className="flex items-start gap-4 rounded-lg border border-[var(--card-border)] bg-surface p-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10">
                      <PlayCircleIcon className="h-6 w-6 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">
                        {selectedEmployer.companyIntroVideo.title || "Company Intro"}
                      </p>
                      {selectedEmployer.companyIntroVideo.description && (
                        <p className="mt-1 text-sm text-[var(--text-muted)] line-clamp-2">
                          {selectedEmployer.companyIntroVideo.description}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-foreground0 truncate">
                        {selectedEmployer.companyIntroVideo.videoUrl}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowIntroModal(true)}
                        className="rounded-md p-2 text-[var(--text-muted)] hover:bg-slate-700 hover:text-foreground"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleRemoveCompanyIntro}
                        className="rounded-md p-2 text-red-400 hover:bg-red-900/30 hover:text-red-300"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-foreground0">No company intro video added yet.</p>
                )}
              </div>

              {/* Interviews / Promotional Videos */}
              <div className="rounded-lg border border-[var(--card-border)] bg-surface p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    Interviews & Promotional Videos
                  </h3>
                  <button
                    onClick={() => {
                      setEditingInterview(null);
                      setShowInterviewModal(true);
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/20"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add Video
                  </button>
                </div>

                {selectedEmployer.interviews && selectedEmployer.interviews.length > 0 ? (
                  <div className="space-y-3">
                    {selectedEmployer.interviews.map((interview) => (
                      <div
                        key={interview.id}
                        className="flex items-start gap-4 rounded-lg border border-[var(--card-border)] bg-surface p-4"
                      >
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                          <PlayCircleIcon className="h-6 w-6 text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">
                              {interview.title || "Untitled Video"}
                            </p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                interview.isIOPPSInterview
                                  ? "bg-accent/10 text-accent"
                                  : "bg-purple-500/10 text-purple-400"
                              }`}
                            >
                              {interview.isIOPPSInterview ? "IOPPS Interview" : "Promo Video"}
                            </span>
                          </div>
                          {interview.description && (
                            <p className="mt-1 text-sm text-[var(--text-muted)] line-clamp-2">
                              {interview.description}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-foreground0 truncate">
                            {interview.videoUrl}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingInterview(interview);
                              setShowInterviewModal(true);
                            }}
                            className="rounded-md p-2 text-[var(--text-muted)] hover:bg-slate-700 hover:text-foreground"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteInterview(interview)}
                            className="rounded-md p-2 text-red-400 hover:bg-red-900/30 hover:text-red-300"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-foreground0">No interview or promotional videos added yet.</p>
                )}
              </div>

              {/* Job-Specific Videos */}
              <div className="rounded-lg border border-[var(--card-border)] bg-surface p-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">Job-Specific Videos</h3>

                {employerJobs.length > 0 ? (
                  <div className="space-y-3">
                    {employerJobs.map((job) => (
                      <div
                        key={job.id}
                        className="flex items-start gap-4 rounded-lg border border-[var(--card-border)] bg-surface p-4"
                      >
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                          <BriefcaseIcon className="h-6 w-6 text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{job.title}</p>
                          <p className="text-sm text-[var(--text-muted)]">{job.location}</p>
                          {job.jobVideo ? (
                            <div className="mt-2 flex items-center gap-2 text-sm">
                              <PlayCircleIcon className="h-4 w-4 text-green-400" />
                              <span className="text-green-400">
                                {job.jobVideo.title || "Video attached"}
                              </span>
                              {job.jobVideo.isIOPPSInterview && (
                                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
                                  IOPPS
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-foreground0">No video attached</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedJob(job);
                              setShowJobVideoModal(true);
                            }}
                            className="rounded-md p-2 text-[var(--text-muted)] hover:bg-slate-700 hover:text-foreground"
                            title={job.jobVideo ? "Edit video" : "Add video"}
                          >
                            {job.jobVideo ? (
                              <PencilIcon className="h-4 w-4" />
                            ) : (
                              <PlusIcon className="h-4 w-4" />
                            )}
                          </button>
                          {job.jobVideo && (
                            <button
                              onClick={() => handleRemoveJobVideo(job)}
                              className="rounded-md p-2 text-red-400 hover:bg-red-900/30 hover:text-red-300"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-foreground0">This employer has no job postings yet.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Company Intro Video Modal */}
      {showIntroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-lg border border-[var(--card-border)] bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-foreground">
                {selectedEmployer?.companyIntroVideo ? "Edit" : "Add"} Company Intro Video
              </h3>
              <button
                onClick={() => setShowIntroModal(false)}
                className="rounded-md p-1 text-[var(--text-muted)] hover:bg-surface hover:text-foreground"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <VideoForm
              initialData={
                selectedEmployer?.companyIntroVideo
                  ? {
                      videoUrl: selectedEmployer.companyIntroVideo.videoUrl,
                      title: selectedEmployer.companyIntroVideo.title || "",
                      description: selectedEmployer.companyIntroVideo.description || "",
                    }
                  : undefined
              }
              onSubmit={handleSaveCompanyIntro}
              onCancel={() => setShowIntroModal(false)}
              showIOPPSToggle={false}
            />
          </div>
        </div>
      )}

      {/* Interview Modal */}
      {showInterviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-lg border border-[var(--card-border)] bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-foreground">
                {editingInterview ? "Edit" : "Add"} Video
              </h3>
              <button
                onClick={() => {
                  setShowInterviewModal(false);
                  setEditingInterview(null);
                }}
                className="rounded-md p-1 text-[var(--text-muted)] hover:bg-surface hover:text-foreground"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <VideoForm
              initialData={
                editingInterview
                  ? {
                      videoUrl: editingInterview.videoUrl,
                      title: editingInterview.title || "",
                      description: editingInterview.description || "",
                      isIOPPSInterview: editingInterview.isIOPPSInterview ?? true,
                    }
                  : undefined
              }
              onSubmit={handleSaveInterview}
              onCancel={() => {
                setShowInterviewModal(false);
                setEditingInterview(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Job Video Modal */}
      {showJobVideoModal && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-lg border border-[var(--card-border)] bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-foreground">
                  {selectedJob.jobVideo ? "Edit" : "Add"} Job Video
                </h3>
                <p className="text-sm text-[var(--text-muted)]">{selectedJob.title}</p>
              </div>
              <button
                onClick={() => {
                  setShowJobVideoModal(false);
                  setSelectedJob(null);
                }}
                className="rounded-md p-1 text-[var(--text-muted)] hover:bg-surface hover:text-foreground"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <VideoForm
              initialData={
                selectedJob.jobVideo
                  ? {
                      videoUrl: selectedJob.jobVideo.videoUrl,
                      title: selectedJob.jobVideo.title || "",
                      description: selectedJob.jobVideo.description || "",
                      isIOPPSInterview: selectedJob.jobVideo.isIOPPSInterview ?? false,
                    }
                  : undefined
              }
              onSubmit={handleSaveJobVideo}
              onCancel={() => {
                setShowJobVideoModal(false);
                setSelectedJob(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
          <div
            className={`rounded-lg border px-6 py-4 shadow-lg ${
              toast.type === "success"
                ? "border-green-500/50 bg-green-950/90 text-green-400"
                : "border-red-500/50 bg-red-950/90 text-red-400"
            }`}
          >
            <div className="flex items-center gap-3">
              {toast.type === "success" ? (
                <CheckCircleIcon className="h-5 w-5" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5" />
              )}
              <p className="font-medium">{toast.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
