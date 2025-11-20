"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  getEmployerProfile,
  upsertEmployerProfile,
} from "@/lib/firestore";
import { storage } from "@/lib/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

export default function EmployerProfilePage() {
  const { user, role, loading } = useAuth();
  const [organizationName, setOrganizationName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoFileName, setLogoFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || role !== "employer") return;
    (async () => {
      try {
        const profile = await getEmployerProfile(user.uid);
        if (profile) {
          setOrganizationName(profile.organizationName ?? "");
          setDescription(profile.description ?? "");
          setWebsite(profile.website ?? "");
          setLocation(profile.location ?? "");
          setLogoUrl(profile.logoUrl ?? "");
        }
      } catch (err) {
        console.error(err);
        setError("Unable to load your employer profile right now.");
      }
    })();
  }, [role, user]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      setUploadingLogo(true);
      setError(null);
      const logoRef = ref(
        storage,
        `logos/${user.uid}/${Date.now()}-${file.name}`
      );
      await uploadBytes(logoRef, file);
      const url = await getDownloadURL(logoRef);
      setLogoUrl(url);
      setLogoFileName(file.name);
      setStatusMessage("Logo uploaded successfully.");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to upload logo."
      );
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || role !== "employer") return;
    setSaving(true);
    setStatusMessage(null);
    setError(null);
    try {
      await upsertEmployerProfile(user.uid, {
        organizationName,
        description,
        website,
        location,
        logoUrl,
      });
      setStatusMessage("Profile updated!");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Could not update profile."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-slate-300">Loading your profile...</p>
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
          Sign in with your employer account to edit your profile.
        </p>
      </div>
    );
  }

  if (role !== "employer") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Employer access only
        </h1>
        <p className="text-sm text-slate-300">
          Switch to your employer account to update profile details.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:py-16 space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-[#14B8A6]">
          Employer profile
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Edit public profile
        </h1>
        <p className="mt-3 text-sm text-slate-400 sm:text-base">
          Update organization details, description, and website so community
          members know who you are.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-slate-800/80 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30"
      >
        {error && (
          <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}
        {statusMessage && (
          <p className="rounded-md border border-[#14B8A6]/40 bg-[#14B8A6]/10 px-3 py-2 text-sm text-[#14B8A6]">
            {statusMessage}
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-200">
            Organization name
          </label>
          <input
            type="text"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200">
            Description / land acknowledgement
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            placeholder="Share your mission, values, and land acknowledgement."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-200">
              Website
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-200">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, Province / Territory"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200">
            Organization logo
          </label>
          <div className="mt-2 flex flex-col gap-3">
            <label className="flex cursor-pointer flex-col text-xs text-slate-200">
              <span className="mb-2 rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-center text-sm hover:border-teal-500 transition-colors">
                {uploadingLogo ? "Uploading..." : "Choose logo file"}
              </span>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.svg"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
                className="hidden"
              />
            </label>
            {uploadingLogo && (
              <p className="text-xs text-slate-400">Uploading logo...</p>
            )}
            {logoFileName && (
              <p className="text-xs text-teal-300">
                Uploaded: {logoFileName}
              </p>
            )}
            {logoUrl && (
              <div className="flex items-center gap-3">
                <img
                  src={logoUrl}
                  alt="Organization logo"
                  className="h-20 w-auto rounded-md border border-slate-700 object-contain bg-slate-800/50 p-2"
                />
                <a
                  href={logoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-teal-300 underline hover:text-teal-200"
                >
                  View full size
                </a>
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Upload a PNG, JPG, or SVG file. Recommended size: 200x200px or larger.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
      </form>
    </div>
  );
}
