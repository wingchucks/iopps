"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  getEmployerProfile,
  addEmployerInterview,
  updateEmployerInterview,
  deleteEmployerInterview,
  setEmployerCompanyIntro,
  removeEmployerCompanyIntro,
} from "@/lib/firestore";
import { uploadCompanyVideo, validateVideo, formatFileSize, type UploadProgress } from "@/lib/firebase/storage";
import type { EmployerProfile, Interview, CompanyVideo } from "@/lib/types";
import toast from "react-hot-toast";

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

export default function VideosTab() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Company intro video state
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [introVideoUrl, setIntroVideoUrl] = useState("");
  const [introTitle, setIntroTitle] = useState("");
  const [introDescription, setIntroDescription] = useState("");

  // Video upload state
  const [introInputMode, setIntroInputMode] = useState<"upload" | "url">("upload");
  const [introVideoFile, setIntroVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Interview modal state
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
  const [interviewTitle, setInterviewTitle] = useState("");
  const [interviewVideoUrl, setInterviewVideoUrl] = useState("");
  const [interviewDescription, setInterviewDescription] = useState("");
  const [isIOPPSInterview, setIsIOPPSInterview] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getEmployerProfile(user.uid);
      if (data) {
        setProfile(data);
      }
    } catch (err) {
      console.error("Error loading profile:", err);
    } finally {
      setLoading(false);
    }
  };

  // Company Intro Video handlers
  const openIntroModal = () => {
    if (profile?.companyIntroVideo) {
      setIntroVideoUrl(profile.companyIntroVideo.videoUrl || "");
      setIntroTitle(profile.companyIntroVideo.title || "");
      setIntroDescription(profile.companyIntroVideo.description || "");
      setIntroInputMode("url"); // If editing existing, default to URL mode
    } else {
      setIntroVideoUrl("");
      setIntroTitle("");
      setIntroDescription("");
      setIntroInputMode("upload"); // For new videos, default to upload mode
    }
    setIntroVideoFile(null);
    setUploadProgress(0);
    setUploadError(null);
    setShowIntroModal(true);
  };

  const closeIntroModal = () => {
    setShowIntroModal(false);
    setIntroVideoUrl("");
    setIntroTitle("");
    setIntroDescription("");
    setIntroVideoFile(null);
    setUploadProgress(0);
    setUploadError(null);
    setIntroInputMode("upload");
  };

  // File handling for video upload
  const handleFileSelect = useCallback((file: File) => {
    const validation = validateVideo(file);
    if (!validation.valid) {
      setUploadError(validation.error || "Invalid file");
      return;
    }
    setIntroVideoFile(file);
    setUploadError(null);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleSaveIntro = async () => {
    if (!user) return;

    // Check if we have either a file or URL
    if (introInputMode === "upload" && !introVideoFile) {
      setUploadError("Please select a video file to upload");
      return;
    }
    if (introInputMode === "url" && !introVideoUrl) {
      setUploadError("Please enter a video URL");
      return;
    }

    setSaving(true);
    setUploadError(null);

    try {
      let finalVideoUrl = introVideoUrl;
      let provider: "youtube" | "vimeo" | "custom" = "custom";
      let videoId: string | undefined;

      // If uploading a file, upload it first
      if (introInputMode === "upload" && introVideoFile) {
        setIsUploading(true);
        setUploadProgress(0);

        const result = await uploadCompanyVideo(
          introVideoFile,
          user.uid,
          (progress: UploadProgress) => {
            setUploadProgress(progress.progress);
          }
        );

        finalVideoUrl = result.url;
        provider = "custom";
        setIsUploading(false);
      } else {
        // Parse URL for provider detection
        const detected = detectVideoProvider(introVideoUrl);
        provider = detected.provider;
        videoId = detected.videoId;
      }

      const videoData: CompanyVideo = {
        videoUrl: finalVideoUrl,
        videoProvider: provider,
        videoId,
        title: introTitle || undefined,
        description: introDescription || undefined,
      };

      await setEmployerCompanyIntro(user.uid, videoData);
      await loadProfile();
      closeIntroModal();
    } catch (err) {
      console.error("Error saving company intro:", err);
      setUploadError(err instanceof Error ? err.message : "Failed to save company intro video");
      setIsUploading(false);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveIntro = async () => {
    if (!user || !confirm("Remove your company intro video?")) return;
    setSaving(true);
    try {
      await removeEmployerCompanyIntro(user.uid);
      await loadProfile();
    } catch (err) {
      console.error("Error removing intro:", err);
      toast.error("Failed to remove company intro video");
    } finally {
      setSaving(false);
    }
  };

  // Interview/Promo Video handlers
  const openInterviewModal = (interview?: Interview) => {
    if (interview) {
      setEditingInterview(interview);
      setInterviewTitle(interview.title || "");
      setInterviewVideoUrl(interview.videoUrl || "");
      setInterviewDescription(interview.description || "");
      setIsIOPPSInterview(interview.isIOPPSInterview ?? false);
    } else {
      setEditingInterview(null);
      setInterviewTitle("");
      setInterviewVideoUrl("");
      setInterviewDescription("");
      setIsIOPPSInterview(false);
    }
    setShowInterviewModal(true);
  };

  const closeInterviewModal = () => {
    setShowInterviewModal(false);
    setEditingInterview(null);
    setInterviewTitle("");
    setInterviewVideoUrl("");
    setInterviewDescription("");
    setIsIOPPSInterview(false);
  };

  const handleSaveInterview = async () => {
    if (!user || !interviewVideoUrl) return;
    setSaving(true);
    try {
      const { provider, videoId } = detectVideoProvider(interviewVideoUrl);

      if (editingInterview) {
        await updateEmployerInterview(user.uid, editingInterview.id, {
          title: interviewTitle,
          videoUrl: interviewVideoUrl,
          description: interviewDescription,
          videoProvider: provider,
          videoId,
          isIOPPSInterview,
        });
      } else {
        await addEmployerInterview(user.uid, {
          title: interviewTitle,
          videoUrl: interviewVideoUrl,
          description: interviewDescription,
          videoProvider: provider,
          videoId,
          isIOPPSInterview,
          addedBy: user.uid,
          active: true,
        });
      }
      await loadProfile();
      closeInterviewModal();
    } catch (err) {
      console.error("Error saving video:", err);
      toast.error("Failed to save video");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInterview = async (interviewId: string) => {
    if (!user || !confirm("Are you sure you want to delete this video?")) return;
    try {
      await deleteEmployerInterview(user.uid, interviewId);
      await loadProfile();
    } catch (err) {
      console.error("Error deleting video:", err);
      toast.error("Failed to delete video");
    }
  };

  if (loading) {
    return (
      <div className="text-center text-[var(--text-muted)]">Loading videos...</div>
    );
  }

  const interviews = profile?.interviews || [];
  const ioppsInterviews = interviews.filter(i => i.isIOPPSInterview);
  const promoVideos = interviews.filter(i => !i.isIOPPSInterview);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-red-500/10 p-8 shadow-xl shadow-purple-900/20">
        <h2 className="text-2xl font-bold text-white">Video Management</h2>
        <p className="mt-2 text-[var(--text-muted)]">
          Manage your company intro video, IOPPS interviews, and promotional videos
        </p>

        {/* Video Types Explanation */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-900/30 p-4 border border-accent/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20">
                <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h4 className="font-semibold text-emerald-300 text-sm">Company Intro</h4>
            </div>
            <p className="text-xs text-[var(--text-muted)]">Your featured video that appears prominently on your profile. First impression for candidates.</p>
          </div>

          <div className="rounded-xl bg-slate-900/30 p-4 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20">
                <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h4 className="font-semibold text-purple-300 text-sm">Promotional Videos</h4>
            </div>
            <p className="text-xs text-[var(--text-muted)]">Additional videos showcasing team culture, office tours, employee testimonials, and more.</p>
          </div>

          <div className="rounded-xl bg-slate-900/30 p-4 border border-accent/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20">
                <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h4 className="font-semibold text-teal-300 text-sm">IOPPS Interviews</h4>
            </div>
            <p className="text-xs text-[var(--text-muted)]">Professional interviews conducted by IOPPS. Contact us to schedule yours!</p>
          </div>
        </div>
      </div>

      {/* Company Intro Video */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-8 shadow-xl">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white">Company Intro Video</h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            A video introducing your organization to potential candidates
          </p>
        </div>

        {profile?.companyIntroVideo ? (
          <div className="rounded-xl border border-accent/20 bg-surface p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-accent/20">
                  <svg className="h-7 w-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white">
                    {profile.companyIntroVideo.title || "Company Introduction"}
                  </h4>
                  <span className="mt-1 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
                    {profile.companyIntroVideo.videoProvider || "video"}
                  </span>
                  {profile.companyIntroVideo.description && (
                    <p className="mt-2 text-sm text-[var(--text-secondary)] line-clamp-2">
                      {profile.companyIntroVideo.description}
                    </p>
                  )}
                  <a
                    href={profile.companyIntroVideo.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex text-sm text-accent hover:text-emerald-300"
                  >
                    Watch video
                  </a>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={openIntroModal}
                  className="rounded-lg bg-accent/20 px-3 py-2 text-sm font-semibold text-emerald-300 transition-all hover:bg-accent/30"
                >
                  Edit
                </button>
                <button
                  onClick={handleRemoveIntro}
                  className="rounded-lg bg-red-500/20 px-3 py-2 text-sm font-semibold text-red-300 transition-all hover:bg-red-500/30"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-surface p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface">
              <svg className="h-8 w-8 text-foreground0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="mt-4 text-[var(--text-muted)]">
              Add a video to introduce your organization to potential candidates
            </p>
            <button
              onClick={openIntroModal}
              className="mt-4 rounded-xl bg-accent/20 px-6 py-2 text-sm font-semibold text-emerald-300 transition-all hover:bg-accent/30"
            >
              Add Intro Video
            </button>
          </div>
        )}
      </div>

      {/* Promotional Videos */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-8 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">Promotional Videos</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Your own videos showcasing your organization, culture, and team
            </p>
          </div>
          <button
            onClick={() => openInterviewModal()}
            className="rounded-xl bg-purple-500/20 px-4 py-2 text-sm font-semibold text-purple-300 transition-all hover:bg-purple-500/30"
          >
            + Add Video
          </button>
        </div>

        {promoVideos.length === 0 ? (
          <div className="rounded-xl bg-surface p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/10">
              <svg className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="mt-4 text-[var(--text-muted)]">
              Add videos to showcase your organization culture and team
            </p>
            <p className="mt-2 text-xs text-foreground0">
              Use the &quot;+ Add Video&quot; button above to get started
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {promoVideos.map((video) => (
              <div
                key={video.id}
                className="rounded-xl border border-purple-500/20 bg-surface p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-purple-500/20">
                      <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white">
                        {video.title || "Untitled Video"}
                      </h4>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {video.videoProvider} {video.viewsCount ? `| ${video.viewsCount} views` : ""}
                      </p>
                      {video.description && (
                        <p className="mt-2 text-sm text-[var(--text-secondary)] line-clamp-2">
                          {video.description}
                        </p>
                      )}
                      <a
                        href={video.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex text-sm text-purple-400 hover:text-purple-300"
                      >
                        Watch video
                      </a>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openInterviewModal(video)}
                      className="rounded-lg bg-purple-500/20 px-3 py-2 text-sm font-semibold text-purple-300 transition-all hover:bg-purple-500/30"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteInterview(video.id)}
                      className="rounded-lg bg-red-500/20 px-3 py-2 text-sm font-semibold text-red-300 transition-all hover:bg-red-500/30"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* IOPPS Interviews */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-8 shadow-xl">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white">IOPPS Interviews</h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Videos from interviews conducted by IOPPS (added by IOPPS admin)
          </p>
        </div>

        {ioppsInterviews.length === 0 ? (
          <div className="rounded-xl bg-surface p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
              <svg className="h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="mt-4 text-[var(--text-muted)]">
              No IOPPS interviews yet. Contact IOPPS to schedule an interview!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {ioppsInterviews.map((interview) => (
              <div
                key={interview.id}
                className="rounded-xl border border-accent/20 bg-surface p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-accent/20">
                      <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-white">
                          {interview.title || "IOPPS Interview"}
                        </h4>
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
                          IOPPS
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {interview.videoProvider} {interview.viewsCount ? `| ${interview.viewsCount} views` : ""}
                      </p>
                      {interview.description && (
                        <p className="mt-2 text-sm text-[var(--text-secondary)] line-clamp-2">
                          {interview.description}
                        </p>
                      )}
                      <a
                        href={interview.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex text-sm text-accent hover:text-teal-300"
                      >
                        Watch video
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Company Intro Modal */}
      {showIntroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 p-8 shadow-2xl">
            <h3 className="mb-6 text-2xl font-bold text-white">
              {profile?.companyIntroVideo ? "Edit Company Intro Video" : "Add Company Intro Video"}
            </h3>

            <div className="space-y-6">
              {/* Input Mode Tabs */}
              <div className="flex rounded-xl bg-surface p-1">
                <button
                  onClick={() => setIntroInputMode("upload")}
                  className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                    introInputMode === "upload"
                      ? "bg-accent/20 text-emerald-300"
                      : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  <svg className="inline-block h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload Video
                </button>
                <button
                  onClick={() => setIntroInputMode("url")}
                  className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                    introInputMode === "url"
                      ? "bg-accent/20 text-emerald-300"
                      : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  <svg className="inline-block h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Paste URL
                </button>
              </div>

              {/* Upload Mode */}
              {introInputMode === "upload" && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,video/mpeg"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  {/* Drag & Drop Zone */}
                  {!introVideoFile ? (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                        isDragging
                          ? "border-accent bg-accent/10"
                          : "border-[var(--card-border)] hover:border-accent/50 hover:bg-surface"
                      }`}
                    >
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 mb-4">
                        <svg className="h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-[var(--text-secondary)] font-medium mb-1">
                        {isDragging ? "Drop your video here" : "Drag & drop your video here"}
                      </p>
                      <p className="text-foreground0 text-sm mb-4">or click to browse files</p>
                      <p className="text-xs text-slate-600">
                        MP4, WebM, MOV, AVI, MPEG • Max 100MB
                      </p>
                    </div>
                  ) : (
                    /* Selected File Preview */
                    <div className="rounded-xl border border-accent/30 bg-surface p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20">
                            <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white truncate max-w-[300px]">
                              {introVideoFile.name}
                            </p>
                            <p className="text-xs text-foreground0">
                              {formatFileSize(introVideoFile.size)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setIntroVideoFile(null);
                            setUploadProgress(0);
                          }}
                          className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-surface hover:text-white transition-colors"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      {/* Upload Progress */}
                      {isUploading && (
                        <div className="mt-4">
                          <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                            <span>Uploading...</span>
                            <span>{Math.round(uploadProgress)}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-surface overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* URL Mode */}
              {introInputMode === "url" && (
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-foreground0">
                    Video URL *
                  </label>
                  <input
                    type="url"
                    value={introVideoUrl}
                    onChange={(e) => setIntroVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                    className="w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground placeholder-slate-500 transition-all focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                  <p className="mt-1 text-xs text-foreground0">Supports YouTube, Vimeo, or custom video URLs</p>
                </div>
              )}

              {/* Error Message */}
              {uploadError && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3">
                  <p className="text-sm text-red-400">{uploadError}</p>
                </div>
              )}

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-foreground0">
                  Title
                </label>
                <input
                  type="text"
                  value={introTitle}
                  onChange={(e) => setIntroTitle(e.target.value)}
                  placeholder="e.g., Welcome to Our Company"
                  className="w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground placeholder-slate-500 transition-all focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-foreground0">
                  Description
                </label>
                <textarea
                  value={introDescription}
                  onChange={(e) => setIntroDescription(e.target.value)}
                  placeholder="Brief description of the video..."
                  rows={3}
                  className="w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground placeholder-slate-500 transition-all focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveIntro}
                  disabled={(introInputMode === "upload" && !introVideoFile) || (introInputMode === "url" && !introVideoUrl) || saving || isUploading}
                  className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/50 disabled:opacity-50"
                >
                  {isUploading ? `Uploading ${Math.round(uploadProgress)}%...` : saving ? "Saving..." : "Save Video"}
                </button>
                <button
                  onClick={closeIntroModal}
                  disabled={isUploading}
                  className="rounded-xl border border-[var(--card-border)] px-6 py-3 text-sm font-semibold text-[var(--text-secondary)] transition-all hover:border-[var(--card-border)] hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interview/Promo Video Modal */}
      {showInterviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-2xl rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 p-8 shadow-2xl">
            <h3 className="mb-6 text-2xl font-bold text-white">
              {editingInterview ? "Edit Video" : "Add Promotional Video"}
            </h3>

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-foreground0">
                  Video URL *
                </label>
                <input
                  type="url"
                  value={interviewVideoUrl}
                  onChange={(e) => setInterviewVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                  className="w-full rounded-xl border border-purple-500/20 bg-surface px-4 py-3 text-foreground placeholder-slate-500 transition-all focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
                <p className="mt-1 text-xs text-foreground0">Supports YouTube, Vimeo, or custom video URLs</p>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-foreground0">
                  Title *
                </label>
                <input
                  type="text"
                  value={interviewTitle}
                  onChange={(e) => setInterviewTitle(e.target.value)}
                  placeholder="e.g., Day in the Life at Our Company"
                  className="w-full rounded-xl border border-purple-500/20 bg-surface px-4 py-3 text-foreground placeholder-slate-500 transition-all focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-foreground0">
                  Description
                </label>
                <textarea
                  value={interviewDescription}
                  onChange={(e) => setInterviewDescription(e.target.value)}
                  placeholder="Brief description of the video..."
                  rows={4}
                  className="w-full rounded-xl border border-purple-500/20 bg-surface px-4 py-3 text-foreground placeholder-slate-500 transition-all focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveInterview}
                  disabled={!interviewVideoUrl || saving}
                  className="flex-1 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition-all hover:shadow-xl hover:shadow-purple-500/50 disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingInterview ? "Update Video" : "Add Video"}
                </button>
                <button
                  onClick={closeInterviewModal}
                  className="rounded-xl border border-[var(--card-border)] px-6 py-3 text-sm font-semibold text-[var(--text-secondary)] transition-all hover:border-[var(--card-border)] hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
