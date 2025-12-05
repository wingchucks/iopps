"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  getEmployerProfile,
  addEmployerInterview,
  updateEmployerInterview,
  deleteEmployerInterview,
  setEmployerCompanyIntro,
  removeEmployerCompanyIntro,
} from "@/lib/firestore";
import type { EmployerProfile, Interview, CompanyVideo } from "@/lib/types";

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
    } else {
      setIntroVideoUrl("");
      setIntroTitle("");
      setIntroDescription("");
    }
    setShowIntroModal(true);
  };

  const closeIntroModal = () => {
    setShowIntroModal(false);
    setIntroVideoUrl("");
    setIntroTitle("");
    setIntroDescription("");
  };

  const handleSaveIntro = async () => {
    if (!user || !introVideoUrl) return;
    setSaving(true);
    try {
      const { provider, videoId } = detectVideoProvider(introVideoUrl);
      const videoData: CompanyVideo = {
        videoUrl: introVideoUrl,
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
      alert("Failed to save company intro video");
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
      alert("Failed to remove company intro video");
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
      alert("Failed to save video");
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
      alert("Failed to delete video");
    }
  };

  if (loading) {
    return (
      <div className="text-center text-slate-400">Loading videos...</div>
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
        <p className="mt-2 text-slate-400">
          Manage your company intro video, IOPPS interviews, and promotional videos
        </p>
      </div>

      {/* Company Intro Video */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-8 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">Company Intro Video</h3>
            <p className="mt-1 text-sm text-slate-400">
              A video introducing your organization to potential candidates
            </p>
          </div>
          {!profile?.companyIntroVideo && (
            <button
              onClick={openIntroModal}
              className="rounded-xl bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-300 transition-all hover:bg-emerald-500/30"
            >
              + Add Intro Video
            </button>
          )}
        </div>

        {profile?.companyIntroVideo ? (
          <div className="rounded-xl border border-emerald-500/20 bg-slate-900/50 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
                  <svg className="h-7 w-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white">
                    {profile.companyIntroVideo.title || "Company Introduction"}
                  </h4>
                  <span className="mt-1 inline-block rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                    {profile.companyIntroVideo.videoProvider || "video"}
                  </span>
                  {profile.companyIntroVideo.description && (
                    <p className="mt-2 text-sm text-slate-300 line-clamp-2">
                      {profile.companyIntroVideo.description}
                    </p>
                  )}
                  <a
                    href={profile.companyIntroVideo.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex text-sm text-emerald-400 hover:text-emerald-300"
                  >
                    Watch video
                  </a>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={openIntroModal}
                  className="rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-300 transition-all hover:bg-emerald-500/30"
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
          <div className="rounded-xl bg-slate-900/50 p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
              <svg className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="mt-4 text-slate-400">
              Add a video to introduce your organization to potential candidates
            </p>
            <button
              onClick={openIntroModal}
              className="mt-4 rounded-xl bg-emerald-500/20 px-6 py-2 text-sm font-semibold text-emerald-300 transition-all hover:bg-emerald-500/30"
            >
              Add Intro Video
            </button>
          </div>
        )}
      </div>

      {/* IOPPS Interviews */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-8 shadow-xl">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white">IOPPS Interviews</h3>
          <p className="mt-1 text-sm text-slate-400">
            Videos from interviews conducted by IOPPS (added by IOPPS admin)
          </p>
        </div>

        {ioppsInterviews.length === 0 ? (
          <div className="rounded-xl bg-slate-900/50 p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-500/10">
              <svg className="h-8 w-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="mt-4 text-slate-400">
              No IOPPS interviews yet. Contact IOPPS to schedule an interview!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {ioppsInterviews.map((interview) => (
              <div
                key={interview.id}
                className="rounded-xl border border-teal-500/20 bg-slate-900/50 p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-teal-500/20">
                      <svg className="h-6 w-6 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-white">
                          {interview.title || "IOPPS Interview"}
                        </h4>
                        <span className="rounded-full bg-teal-500/10 px-2 py-0.5 text-xs text-teal-400">
                          IOPPS
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-400">
                        {interview.videoProvider} {interview.viewsCount ? `| ${interview.viewsCount} views` : ""}
                      </p>
                      {interview.description && (
                        <p className="mt-2 text-sm text-slate-300 line-clamp-2">
                          {interview.description}
                        </p>
                      )}
                      <a
                        href={interview.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex text-sm text-teal-400 hover:text-teal-300"
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

      {/* Promotional Videos */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-8 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">Promotional Videos</h3>
            <p className="mt-1 text-sm text-slate-400">
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
          <div className="rounded-xl bg-slate-900/50 p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/10">
              <svg className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="mt-4 text-slate-400">
              Add videos to showcase your organization culture and team
            </p>
            <button
              onClick={() => openInterviewModal()}
              className="mt-4 rounded-xl bg-purple-500/20 px-6 py-2 text-sm font-semibold text-purple-300 transition-all hover:bg-purple-500/30"
            >
              Add Your First Video
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {promoVideos.map((video) => (
              <div
                key={video.id}
                className="rounded-xl border border-purple-500/20 bg-slate-900/50 p-6"
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
                      <p className="mt-1 text-sm text-slate-400">
                        {video.videoProvider} {video.viewsCount ? `| ${video.viewsCount} views` : ""}
                      </p>
                      {video.description && (
                        <p className="mt-2 text-sm text-slate-300 line-clamp-2">
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

      {/* Company Intro Modal */}
      {showIntroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-2xl rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 p-8 shadow-2xl">
            <h3 className="mb-6 text-2xl font-bold text-white">
              {profile?.companyIntroVideo ? "Edit Company Intro Video" : "Add Company Intro Video"}
            </h3>

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Video URL *
                </label>
                <input
                  type="url"
                  value={introVideoUrl}
                  onChange={(e) => setIntroVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                  className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <p className="mt-1 text-xs text-slate-500">Supports YouTube, Vimeo, or custom video URLs</p>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Title
                </label>
                <input
                  type="text"
                  value={introTitle}
                  onChange={(e) => setIntroTitle(e.target.value)}
                  placeholder="e.g., Welcome to Our Company"
                  className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Description
                </label>
                <textarea
                  value={introDescription}
                  onChange={(e) => setIntroDescription(e.target.value)}
                  placeholder="Brief description of the video..."
                  rows={3}
                  className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveIntro}
                  disabled={!introVideoUrl || saving}
                  className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/50 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Video"}
                </button>
                <button
                  onClick={closeIntroModal}
                  className="rounded-xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-300 transition-all hover:border-slate-600 hover:text-white"
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
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Video URL *
                </label>
                <input
                  type="url"
                  value={interviewVideoUrl}
                  onChange={(e) => setInterviewVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                  className="w-full rounded-xl border border-purple-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
                <p className="mt-1 text-xs text-slate-500">Supports YouTube, Vimeo, or custom video URLs</p>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Title *
                </label>
                <input
                  type="text"
                  value={interviewTitle}
                  onChange={(e) => setInterviewTitle(e.target.value)}
                  placeholder="e.g., Day in the Life at Our Company"
                  className="w-full rounded-xl border border-purple-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Description
                </label>
                <textarea
                  value={interviewDescription}
                  onChange={(e) => setInterviewDescription(e.target.value)}
                  placeholder="Brief description of the video..."
                  rows={4}
                  className="w-full rounded-xl border border-purple-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
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
                  className="rounded-xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-300 transition-all hover:border-slate-600 hover:text-white"
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
