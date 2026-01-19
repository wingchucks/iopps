"use client";

import { FormEvent, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { createConference, getEmployerProfile, updateConference } from "@/lib/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { toast } from "react-hot-toast";

export default function NewConferencePage() {
  const router = useRouter();
  const { user, role, loading } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [registrationLink, setRegistrationLink] = useState("");
  const [cost, setCost] = useState("");
  const [orgName, setOrgName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const manualFileInputRef = useRef<HTMLInputElement>(null);

  const handlePosterSelect = (file: File) => {
    setPosterFile(file);
    // Create preview URL
    const reader = new FileReader();
    reader.onload = () => {
      setPosterPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle manual file selection (when AI uploader is skipped)
  const handleManualFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setError("Please upload a valid image (JPEG, PNG, WebP, or GIF)");
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError("Image is too large. Maximum size is 10MB.");
      return;
    }

    setError(null);
    handlePosterSelect(file);
  };

  const clearPoster = () => {
    setPosterFile(null);
    setPosterPreview(null);
    if (manualFileInputRef.current) {
      manualFileInputRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-slate-300">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Please sign in
        </h1>
        <p className="text-sm text-slate-300">
          Employers must be signed in to create conferences.
        </p>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  const isSuperAdmin = user?.email === "nathan.arias@iopps.ca";

  if (role !== "employer" && !isSuperAdmin) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Employer Account Required
        </h1>
        <p className="text-sm text-slate-300">
          To post conferences and events on IOPPS, you need an employer account.
        </p>
        <div className="flex gap-3">
          <Link
            href="/organization/register"
            className="inline-block rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors"
          >
            Register as Employer
          </Link>
          <Link
            href="/conferences"
            className="inline-block rounded-md border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Browse Conferences
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      let organizerName = orgName;
      if (!organizerName) {
        const profile = await getEmployerProfile(user.uid);
        organizerName =
          profile?.organizationName ??
          user.displayName ??
          user.email ??
          "Employer";
        setOrgName(organizerName);
      }

      // 1. Create conference (free posting - active immediately)
      const newConferenceId = await createConference({
        employerId: user.uid,
        employerName: organizerName,
        title,
        description,
        location,
        startDate,
        endDate,
        registrationLink,
        cost,
        active: true, // Free posting - active immediately
      });

      // 2. Upload poster if exists
      if (posterFile && storage) {
        try {
          // Secure Path: conferences/{employerId}/{conferenceId}/images/{fileName}
          const storagePath = `conferences/${user.uid}/${newConferenceId}/images/${posterFile.name}`;
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, posterFile);
          const downloadURL = await getDownloadURL(storageRef);

          // Update conference with image URL
          await updateConference(newConferenceId, {
            bannerImageUrl: downloadURL,
            galleryImageUrls: [downloadURL]
          });
        } catch (uploadError) {
          console.error("Failed to upload poster:", uploadError);
          // Don't fail the creation, just log it. User can re-upload later if needed.
          // Or maybe show a warning.
        }
      }

      // Free posting - conference is active immediately
      toast.success("Conference created successfully!");
      router.push(`/organization/conferences/${newConferenceId}/edit`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not create conference.");
    } finally {
      setSaving(false);
    }
  };

  // Form step
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        Create a conference or gathering
      </h1>
      <p className="mt-2 text-sm text-slate-300">
        Share gatherings, summits, and community events with the IOPPS network.
      </p>

      {error && (
        <p className="mt-4 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
            placeholder="https://example.com/register"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Cost or ticket info
          </label>
          <input
            type="text"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="Free / $150 early bird"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
          />
        </div>

        {/* Manual Poster Upload (shown when AI uploader is skipped or as alternative) */}
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Event poster or banner image
          </label>
          <p className="mt-1 text-xs text-slate-400">
            Upload an image for your conference (optional)
          </p>

          {posterPreview ? (
            <div className="mt-2 relative">
              <div className="relative aspect-[16/9] max-w-md overflow-hidden rounded-lg border border-slate-700">
                <Image
                  src={posterPreview}
                  alt="Poster preview"
                  fill
                  className="object-cover"
                />
              </div>
              <button
                type="button"
                onClick={clearPoster}
                className="mt-2 text-sm text-red-400 hover:text-red-300"
              >
                Remove image
              </button>
            </div>
          ) : (
            <div
              onClick={() => manualFileInputRef.current?.click()}
              className="mt-2 cursor-pointer rounded-lg border-2 border-dashed border-slate-700 p-6 text-center transition-colors hover:border-emerald-500/50 hover:bg-slate-900/50"
            >
              <svg
                className="mx-auto h-10 w-10 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="mt-2 text-sm text-slate-400">
                Click to upload an image
              </p>
              <p className="mt-1 text-xs text-slate-500">
                JPEG, PNG, WebP, or GIF (max 10MB)
              </p>
            </div>
          )}

          <input
            ref={manualFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleManualFileSelect}
            className="hidden"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors disabled:opacity-60"
        >
          {saving ? "Creating..." : "Create Conference"}
        </button>
      </form>
    </div>
  );
}
