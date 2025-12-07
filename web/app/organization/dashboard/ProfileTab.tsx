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
    setSaving(true);
    try {
      await upsertEmployerProfile(user.uid, {
        organizationName,
        description,
        website,
        location,
        logoUrl,
      });
      alert("Profile updated successfully!");
      await loadProfile();
    } catch (err) {
      console.error("Error saving profile:", err);
      alert("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingLogo(true);
    try {
      const storageRef = ref(storage!, `employers/${user.uid}/logo/logo_${Date.now()}.${file.name.split('.').pop()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setLogoUrl(url);
      await updateEmployerLogo(user.uid, url);
      alert("Logo uploaded successfully!");
    } catch (err) {
      console.error("Error uploading logo:", err);
      alert("Failed to upload logo");
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

      {/* TRC #92 Status */}
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
                TRC #92 Compliance Status:{" "}
                <span className={`rounded-full border px-3 py-1 text-sm ${getStatusColor(profile.status)}`}>
                  {profile.status}
                </span>
              </h3>
              <p className="mt-2 text-sm text-slate-300">
                {profile.status === "approved" && "Your organization has been verified for TRC #92 compliance."}
                {profile.status === "pending" && "Your application is under review. We'll notify you once approved."}
                {profile.status === "rejected" && `Application rejected: ${profile.rejectionReason || "Please contact support for more information."}`}
              </p>
              {profile.approvedAt && (
                <p className="mt-2 text-xs text-slate-400">
                  Approved on: {new Date(profile.approvedAt.seconds * 1000).toLocaleDateString()}
                </p>
              )}

              <div className="mt-4 border-t border-slate-700 pt-4">
                {profile.status === "approved" && (
                  <p className="mt-1 text-sm">
                    <span className="font-semibold text-slate-300">Public Profile:</span>{" "}
                    <a
                      href={`/employers/${user?.uid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#14B8A6] hover:underline"
                    >
                      View Public Profile
                    </a>
                  </p>
                )}
              </div>
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
