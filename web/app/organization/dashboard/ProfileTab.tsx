"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  getEmployerProfile,
  upsertEmployerProfile,
  updateEmployerLogo,
  addEmployerInterview,
  updateEmployerInterview,
  deleteEmployerInterview,
} from "@/lib/firestore";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { EmployerProfile, Interview } from "@/lib/types";

export default function ProfileTab() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Interview modal state
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
  const [interviewTitle, setInterviewTitle] = useState("");
  const [interviewVideoUrl, setInterviewVideoUrl] = useState("");
  const [interviewDescription, setInterviewDescription] = useState("");
  const [interviewProvider, setInterviewProvider] = useState<"youtube" | "vimeo" | "custom">("youtube");

  const logoInputRef = useRef<HTMLInputElement>(null);

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
        setOrganizationName(data.organizationName || "");
        setDescription(data.description || "");
        setWebsite(data.website || "");
        setLocation(data.location || "");
        setLogoUrl(data.logoUrl || "");
        setInterviews(data.interviews || []);
      }
    } catch (err) {
      console.error("Error loading profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    // Validate required fields
    if (!organizationName.trim()) {
      alert("Organization name is required.");
      return;
    }

    setSaving(true);
    try {
      await upsertEmployerProfile(user.uid, {
        organizationName: organizationName.trim(),
        description: description.trim(),
        website: website.trim(),
        location: location.trim(),
        logoUrl,
      });
      alert("Profile updated successfully!");
      await loadProfile();
    } catch (err: any) {
      console.error("Error saving profile:", err);
      let errorMessage = "Failed to save profile";
      if (err?.message) {
        errorMessage += `: ${err.message}`;
      }
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert(`Invalid file type: ${file.type}\n\nPlease upload a PNG, JPG, GIF, or WebP image.`);
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB\n\nPlease upload an image smaller than 5MB.`);
      return;
    }

    // Check if storage is initialized
    if (!storage) {
      alert("Storage service is not available. Please try again later or contact support.");
      console.error("Firebase Storage not initialized");
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'png';
      const storageRef = ref(storage, `employers/${user.uid}/logo/logo_${Date.now()}.${fileExtension}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setLogoUrl(url);
      await updateEmployerLogo(user.uid, url);
      alert("Logo uploaded successfully!");
    } catch (err: any) {
      console.error("Error uploading logo:", err);
      // Provide more helpful error message
      let errorMessage = "Failed to upload logo";
      if (err?.code === 'storage/unauthorized') {
        errorMessage = "You don't have permission to upload files. Please contact support.";
      } else if (err?.code === 'storage/canceled') {
        errorMessage = "Upload was canceled.";
      } else if (err?.code === 'storage/unknown') {
        errorMessage = "An unknown error occurred. Please try again.";
      } else if (err?.message) {
        errorMessage = `Upload failed: ${err.message}`;
      }
      alert(errorMessage);
    } finally {
      setUploadingLogo(false);
    }
  };

  const openInterviewModal = (interview?: Interview) => {
    if (interview) {
      setEditingInterview(interview);
      setInterviewTitle(interview.title || "");
      setInterviewVideoUrl(interview.videoUrl || "");
      setInterviewDescription(interview.description || "");
      setInterviewProvider(interview.videoProvider || "youtube");
    } else {
      setEditingInterview(null);
      setInterviewTitle("");
      setInterviewVideoUrl("");
      setInterviewDescription("");
      setInterviewProvider("youtube");
    }
    setShowInterviewModal(true);
  };

  const closeInterviewModal = () => {
    setShowInterviewModal(false);
    setEditingInterview(null);
    setInterviewTitle("");
    setInterviewVideoUrl("");
    setInterviewDescription("");
    setInterviewProvider("youtube");
  };

  const handleSaveInterview = async () => {
    if (!user) return;
    try {
      if (editingInterview) {
        // Update existing
        await updateEmployerInterview(user.uid, editingInterview.id, {
          title: interviewTitle,
          videoUrl: interviewVideoUrl,
          description: interviewDescription,
          videoProvider: interviewProvider,
        });
      } else {
        // Add new
        await addEmployerInterview(user.uid, {
          title: interviewTitle,
          videoUrl: interviewVideoUrl,
          description: interviewDescription,
          videoProvider: interviewProvider,
        });
      }
      await loadProfile();
      closeInterviewModal();
    } catch (err) {
      console.error("Error saving interview:", err);
      alert("Failed to save interview");
    }
  };

  const handleDeleteInterview = async (interviewId: string) => {
    if (!user || !confirm("Are you sure you want to delete this interview?")) return;
    try {
      await deleteEmployerInterview(user.uid, interviewId);
      await loadProfile();
    } catch (err) {
      console.error("Error deleting interview:", err);
      alert("Failed to delete interview");
    }
  };

  if (loading) {
    return (
      <div className="text-center text-slate-400">Loading profile...</div>
    );
  }

  const getStatusColor = (status?: string) => {
    if (status === "approved") return "bg-green-500/20 text-green-300 border-green-500/40";
    if (status === "rejected") return "bg-red-500/20 text-red-300 border-red-500/40";
    return "bg-amber-500/20 text-amber-300 border-amber-500/40";
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
        <h2 className="text-2xl font-bold text-white">Profile & Settings</h2>
        <p className="mt-2 text-slate-400">
          Manage your organization profile, TRC #92 compliance, and interview videos
        </p>
      </div>

      {/* Employer ID (always visible) */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-8 shadow-xl">
        <p className="text-sm text-slate-400">
          <span className="font-semibold text-slate-300">Employer ID:</span> {user?.uid}
        </p>
      </div>

      {/* Profile Approval Status */}
      {profile?.status && (
        <div className={`rounded-3xl border p-8 shadow-xl ${profile.status === "approved"
          ? "border-green-500/30 bg-green-500/10 shadow-green-900/20"
          : profile.status === "rejected"
            ? "border-red-500/30 bg-red-500/10 shadow-red-900/20"
            : "border-amber-500/30 bg-amber-500/10 shadow-amber-900/20"
          }`}>
          <div className="flex items-start gap-4">
            <div className="text-3xl">
              {profile.status === "approved" ? "✅" : profile.status === "rejected" ? "❌" : "⏳"}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">
                Profile Status:{" "}
                <span className={`rounded-full border px-3 py-1 text-sm ${getStatusColor(profile.status)}`}>
                  {profile.status === "approved" ? "Live" : profile.status === "pending" ? "Under Review" : "Rejected"}
                </span>
              </h3>

              {profile.status === "approved" && (
                <div className="mt-3">
                  <p className="text-sm text-slate-300">
                    Your organization profile is live and visible to the public.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <a
                      href={`/employers/${user?.uid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Public Profile
                    </a>
                    <a
                      href="/organizations"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700/50 transition-colors"
                    >
                      View Organization Directory
                    </a>
                  </div>
                  {profile.approvedAt && (
                    <p className="mt-3 text-xs text-slate-400">
                      Approved on {new Date(profile.approvedAt.seconds * 1000).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              {profile.status === "pending" && (
                <div className="mt-3 space-y-3">
                  <p className="text-sm text-slate-300">
                    Your profile is being reviewed by our team. This typically takes 1-2 business days.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <a
                      href={`/employers/${user?.uid}?preview=true`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-500/30 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Preview Public Profile
                    </a>
                  </div>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                    <p className="text-sm font-medium text-amber-200">What happens next?</p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-300">
                      <li className="flex items-start gap-2">
                        <span className="text-amber-400">•</span>
                        We&apos;ll review your organization details
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-400">•</span>
                        Once approved, your profile will appear in the <a href="/organizations" target="_blank" className="text-[#14B8A6] hover:underline">Organization Directory</a>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-400">•</span>
                        You&apos;ll be able to post jobs and your company info will show on all listings
                      </li>
                    </ul>
                  </div>
                  <p className="text-xs text-slate-400">
                    Questions? Contact us at{" "}
                    <a href="mailto:support@iopps.ca" className="text-[#14B8A6] hover:underline">support@iopps.ca</a>
                  </p>
                </div>
              )}

              {profile.status === "rejected" && (
                <div className="mt-3 space-y-3">
                  <p className="text-sm text-red-300">
                    {profile.rejectionReason || "Your application was not approved. Please contact support for more information."}
                  </p>
                  <p className="text-sm text-slate-300">
                    If you believe this was a mistake or have additional information to provide, please contact us.
                  </p>
                  <a
                    href="mailto:support@iopps.ca"
                    className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-500/20 transition-colors"
                  >
                    Contact Support
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Organization Profile */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-8 shadow-xl">
        <h3 className="mb-6 text-xl font-semibold text-white">Organization Profile</h3>

        <div className="space-y-6">
          {/* Logo */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Organization Logo
            </label>
            <div className="flex items-center gap-4">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Organization logo"
                  className="h-20 w-20 rounded-xl border border-emerald-500/30 object-cover"
                />
              )}
              <div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="rounded-xl bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-300 transition-all hover:bg-emerald-500/30 disabled:opacity-50"
                >
                  {uploadingLogo ? "Uploading..." : logoUrl ? "Change logo" : "Upload logo"}
                </button>
              </div>
            </div>
          </div>

          {/* Organization Name */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Organization Name *
            </label>
            <input
              type="text"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="Enter organization name"
              className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us about your organization..."
              rows={5}
              className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Website */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Website
            </label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              onBlur={(e) => {
                const val = e.target.value.trim();
                if (val && !val.startsWith('http://') && !val.startsWith('https://')) {
                  setWebsite('https://' + val);
                }
              }}
              placeholder="example.com"
              className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Location */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, Province/State, Country"
              className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={saving || !organizationName}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/50 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>

      {/* Interview Videos */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-8 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">Interview Videos</h3>
            <p className="mt-1 text-sm text-slate-400">
              Showcase your organization culture with video interviews
            </p>
          </div>
          <button
            onClick={() => openInterviewModal()}
            className="rounded-xl bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-300 transition-all hover:bg-emerald-500/30"
          >
            + Add Interview
          </button>
        </div>

        {interviews.length === 0 ? (
          <div className="rounded-xl bg-slate-900/50 p-8 text-center">
            <p className="text-slate-400">
              No interview videos yet. Add videos to showcase your organization.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {interviews.map((interview) => (
              <div
                key={interview.id}
                className="rounded-xl border border-emerald-500/20 bg-slate-900/50 p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-white">
                      {interview.title || "Untitled Interview"}
                    </h4>
                    <p className="mt-1 text-sm text-slate-400">
                      {interview.videoProvider} • {interview.viewsCount || 0} views
                    </p>
                    {interview.description && (
                      <p className="mt-2 text-sm text-slate-300">
                        {interview.description}
                      </p>
                    )}
                    <a
                      href={interview.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex text-sm text-emerald-400 hover:text-emerald-300"
                    >
                      Watch video →
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openInterviewModal(interview)}
                      className="rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-300 transition-all hover:bg-emerald-500/30"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteInterview(interview.id)}
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

      {/* Interview Modal */}
      {showInterviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-2xl rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 p-8 shadow-2xl">
            <h3 className="mb-6 text-2xl font-bold text-white">
              {editingInterview ? "Edit Interview" : "Add Interview"}
            </h3>

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Interview Title *
                </label>
                <input
                  type="text"
                  value={interviewTitle}
                  onChange={(e) => setInterviewTitle(e.target.value)}
                  placeholder="e.g., CEO Introduction"
                  className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Video Provider *
                </label>
                <select
                  value={interviewProvider}
                  onChange={(e) => setInterviewProvider(e.target.value as "youtube" | "vimeo" | "custom")}
                  className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="youtube">YouTube</option>
                  <option value="vimeo">Vimeo</option>
                  <option value="custom">Custom URL</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Video URL *
                </label>
                <input
                  type="url"
                  value={interviewVideoUrl}
                  onChange={(e) => setInterviewVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Description
                </label>
                <textarea
                  value={interviewDescription}
                  onChange={(e) => setInterviewDescription(e.target.value)}
                  placeholder="Brief description of the interview..."
                  rows={4}
                  className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveInterview}
                  disabled={!interviewTitle || !interviewVideoUrl}
                  className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/50 disabled:opacity-50"
                >
                  {editingInterview ? "Update Interview" : "Add Interview"}
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
