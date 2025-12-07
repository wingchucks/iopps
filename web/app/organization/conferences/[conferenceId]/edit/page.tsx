"use client";

import { FormEvent, useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getConference, updateConference, deleteConference } from "@/lib/firestore";
import { uploadEventImage } from "@/lib/firebase/storage";
import type { Conference } from "@/lib/types";

export default function EditConferencePage() {
  const params = useParams<{ conferenceId: string }>();
  const conferenceId = params?.conferenceId;
  const router = useRouter();
  const { user, role, loading } = useAuth();
  const [conference, setConference] = useState<Conference | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [registrationLink, setRegistrationLink] = useState("");
  const [cost, setCost] = useState("");
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!conferenceId) return;
    (async () => {
      const data = await getConference(conferenceId);
      if (data) {
        setConference(data);
        setTitle(data.title);
        setDescription(data.description);
        setLocation(data.location);
        setStartDate(
          typeof data.startDate === "string"
            ? data.startDate
            : data.startDate?.toDate().toISOString().split("T")[0] ?? ""
        );
        setEndDate(
          typeof data.endDate === "string"
            ? data.endDate
            : data.endDate?.toDate().toISOString().split("T")[0] ?? ""
        );
        setRegistrationLink(data.registrationLink ?? "");
        setCost(data.cost ?? "");
        setBannerImageUrl(data.bannerImageUrl ?? "");
      }
    })();
  }, [conferenceId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conferenceId) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const result = await uploadEventImage(file, conferenceId, (progress) => {
        setUploadProgress(progress.progress);
      });
      setBannerImageUrl(result.url);
    } catch (err) {
      console.error("Error uploading image:", err);
      setError("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!conferenceId) return;
    setSaving(true);
    setError(null);
    try {
      await updateConference(conferenceId, {
        title,
        description,
        location,
        startDate,
        endDate,
        registrationLink,
        cost,
        bannerImageUrl: bannerImageUrl || undefined,
      });
      router.push("/organization/dashboard");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!conferenceId) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteConference(conferenceId);
      router.push("/organization/dashboard");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not delete conference.");
      setDeleting(false);
    }
  };

  if (loading || !conference) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-slate-300">Loading conference...</p>
      </div>
    );
  }

  if (!user || role !== "employer") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Employer access only
        </h1>
        <p className="text-sm text-slate-300">
          Sign in with an employer account to edit conferences.
        </p>
        <Link
          href="/login"
          className="rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors"
        >
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Edit conference</h1>
      <p className="mt-2 text-sm text-slate-300">
        Update dates, location, or registration info and save your changes.
      </p>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
          {error}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="text-sm font-semibold text-amber-100">
            Are you sure you want to delete this conference?
          </p>
          <p className="mt-1 text-xs text-amber-200">
            This action cannot be undone.
          </p>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-md bg-red-600 px-3 py-1 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {deleting ? "Deleting..." : "Delete conference"}
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
              className="rounded-md border border-slate-700 px-3 py-1 text-sm text-slate-200 hover:border-slate-600 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {/* Banner/Poster Image Upload */}
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Conference Banner / Poster
          </label>
          <div className="flex items-start gap-4">
            {bannerImageUrl ? (
              <div className="relative w-48 h-32 rounded-lg overflow-hidden border border-slate-700">
                <Image
                  src={bannerImageUrl}
                  alt="Conference banner"
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => setBannerImageUrl("")}
                  className="absolute top-2 right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="w-48 h-32 rounded-lg border-2 border-dashed border-slate-700 flex items-center justify-center">
                <svg className="h-10 w-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                {uploading ? `Uploading ${Math.round(uploadProgress)}%` : bannerImageUrl ? "Change Image" : "Upload Image"}
              </button>
              <p className="mt-2 text-xs text-slate-500">JPEG, PNG, WebP or GIF (max 10MB)</p>
              <p className="text-xs text-slate-600">Recommended: 1200x630px for best display</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200">
            Title
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Description
          </label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Location
          </label>
          <input
            type="text"
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-200">
              Start date
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-200">
              End date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Registration link
          </label>
          <input
            type="url"
            value={registrationLink}
            onChange={(e) => setRegistrationLink(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Cost
          </label>
          <input
            type="text"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-between pt-4">
          <button
            type="submit"
            disabled={saving || deleting}
            className="rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={saving || deleting}
            className="rounded-md border border-red-700 px-4 py-2 text-sm text-red-300 hover:border-red-600 hover:bg-red-900/20 transition-colors disabled:opacity-60"
          >
            Delete conference
          </button>
        </div>
      </form>
    </div>
  );
}
