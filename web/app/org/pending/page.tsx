/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { getOrganizationByOwner, updateOrganization } from "@/lib/firestore/v2-organizations";
import type { V2Organization } from "@/lib/firestore/v2-types";

function PendingPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [org, setOrg] = useState<V2Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [about, setAbout] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const found = await getOrganizationByOwner(user.uid);
      if (!found) {
        router.replace("/organization/dashboard");
        return;
      }
      if (found.status === "active") {
        router.replace("/org/dashboard");
        return;
      }
      if (found.status === "rejected") {
        router.replace("/org/rejected");
        return;
      }
      setOrg(found);
      setAbout(found.about || "");
      setWebsite(found.website || "");
      if (found.logoPath) {
        try {
          const url = await getDownloadURL(ref(storage!, found.logoPath));
          setLogoUrl(url);
        } catch { /* no logo yet */ }
      }
      if (found.coverPath) {
        try {
          const url = await getDownloadURL(ref(storage!, found.coverPath));
          setCoverUrl(url);
        } catch { /* no cover yet */ }
      }
      setLoading(false);
    })();
  }, [user, router]);

  const handleUpload = useCallback(
    async (file: File, type: "logo" | "cover") => {
      if (!org?.id || !storage) return;
      const setter = type === "logo" ? setUploadingLogo : setUploadingCover;
      setter(true);
      try {
        const storagePath = `organizations/${org.id}/${type}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        if (type === "logo") {
          setLogoUrl(url);
          await updateOrganization(org.id, { logoPath: storagePath });
          setOrg((prev) => prev ? { ...prev, logoPath: storagePath } : prev);
        } else {
          setCoverUrl(url);
          await updateOrganization(org.id, { coverPath: storagePath });
          setOrg((prev) => prev ? { ...prev, coverPath: storagePath } : prev);
        }
      } catch (err) {
        console.error(`Failed to upload ${type}:`, err);
      } finally {
        setter(false);
      }
    },
    [org]
  );

  const handleSave = async () => {
    if (!org?.id) return;
    setSaving(true);
    try {
      await updateOrganization(org.id, { about, website });
      setOrg((prev) => prev ? { ...prev, about, website } : prev);
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  };

  const completeness = [
    !!org?.logoPath,
    !!org?.coverPath,
    !!about.trim(),
    !!website.trim(),
  ];
  const completedCount = completeness.filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!org) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Pending Banner */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 mb-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
            <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-amber-700 dark:text-amber-300">Your organization is under review</h2>
            <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
              We&apos;ll notify you once your application is approved. In the meantime, complete your profile.
            </p>
          </div>
        </div>
      </div>

      {/* Profile Completeness */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-[var(--border)]">
          <div
            className="h-2 rounded-full bg-accent transition-all"
            style={{ width: `${(completedCount / 4) * 100}%` }}
          />
        </div>
        <span className="text-xs font-medium text-[var(--text-secondary)]">{completedCount}/4 complete</span>
      </div>

      {/* Organization Setup Form */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 sm:p-8 space-y-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Organization Profile</h3>

        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Logo</label>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              aria-label="Upload logo"
              className="relative h-[120px] w-[120px] rounded-full border-2 border-dashed border-[var(--border)] hover:border-accent transition overflow-hidden flex items-center justify-center bg-[var(--surface)]"
            >
              {uploadingLogo ? (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              ) : logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <svg className="h-8 w-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                </svg>
              )}
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file, "logo");
              }}
            />
            <div className="text-xs text-[var(--text-muted)]">
              <p>Click to upload logo</p>
              <p>Recommended: 400x400px</p>
            </div>
          </div>
        </div>

        {/* Cover Upload */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Cover Image</label>
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            aria-label="Upload cover image"
            className="relative w-full rounded-xl border-2 border-dashed border-[var(--border)] hover:border-accent transition overflow-hidden flex items-center justify-center bg-[var(--surface)]"
            style={{ aspectRatio: "3/1" }}
          >
            {uploadingCover ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            ) : coverUrl ? (
              <img src={coverUrl} alt="Cover" className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <svg className="h-8 w-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                </svg>
                <span className="text-xs text-[var(--text-muted)]">Click to upload cover image</span>
              </div>
            )}
          </button>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file, "cover");
            }}
          />
        </div>

        {/* Org Name (read-only) */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Organization Name</label>
          <input
            type="text"
            value={org.name}
            readOnly
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text-secondary)] cursor-not-allowed"
          />
        </div>

        {/* About */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">About</label>
          <textarea
            value={about}
            onChange={(e) => {
              if (e.target.value.length <= 500) setAbout(e.target.value);
            }}
            rows={4}
            placeholder="Tell us about your organization..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
          />
          <p className="mt-1 text-xs text-[var(--text-muted)] text-right">{about.length}/500</p>
        </div>

        {/* Website */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Website</label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://yourwebsite.com"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>

        {/* Completeness Checklist */}
        <div className="border-t border-[var(--border)] pt-4 space-y-2">
          <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Profile Checklist</p>
          {[
            { label: "Logo uploaded", done: !!org.logoPath },
            { label: "Cover image uploaded", done: !!org.coverPath },
            { label: "About section filled", done: !!about.trim() },
            { label: "Website added", done: !!website.trim() },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm">
              {item.done ? (
                <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              ) : (
                <div className="h-4 w-4 rounded-full border border-[var(--border)]" />
              )}
              <span className={item.done ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function OrgPendingPage() {
  return (
    <ProtectedRoute allowedRoles={["employer"]}>
      <PendingPageContent />
    </ProtectedRoute>
  );
}
