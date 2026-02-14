/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { EmployerProfile, IndustryType, CompanySize } from "@/lib/types";
import {
  ArrowLeftIcon,
  PhotoIcon,
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

const INDUSTRY_OPTIONS: { value: IndustryType; label: string }[] = [
  { value: "government", label: "Government" },
  { value: "healthcare", label: "Healthcare" },
  { value: "education", label: "Education" },
  { value: "construction", label: "Construction" },
  { value: "natural-resources", label: "Natural Resources" },
  { value: "environmental", label: "Environmental" },
  { value: "technology", label: "Technology" },
  { value: "arts-culture", label: "Arts & Culture" },
  { value: "finance", label: "Finance" },
  { value: "legal", label: "Legal" },
  { value: "nonprofit", label: "Non-profit" },
  { value: "retail", label: "Retail" },
  { value: "transportation", label: "Transportation" },
  { value: "other", label: "Other" },
];

const COMPANY_SIZE_OPTIONS: { value: CompanySize; label: string }[] = [
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201-500", label: "201-500 employees" },
  { value: "500+", label: "500+ employees" },
];

export default function EditEmployerPage() {
  const { id: employerId } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form state
  const [organizationName, setOrganizationName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [industry, setIndustry] = useState<IndustryType | "">("");
  const [companySize, setCompanySize] = useState<CompanySize | "">("");
  const [foundedYear, setFoundedYear] = useState<number | "">("");
  const [socialLinkedin, setSocialLinkedin] = useState("");
  const [socialTwitter, setSocialTwitter] = useState("");
  const [socialFacebook, setSocialFacebook] = useState("");
  const [socialInstagram, setSocialInstagram] = useState("");
  const [featuredOnCarousel, setFeaturedOnCarousel] = useState(false);

  useEffect(() => {
    if (!user || (role !== "admin" && role !== "moderator")) {
      router.push("/admin");
      return;
    }
    loadEmployer();
  }, [user, role, employerId]);

  async function loadEmployer() {
    try {
      setLoading(true);
      const employerDoc = await getDoc(doc(db!, "employers", employerId));

      if (!employerDoc.exists()) {
        router.push("/admin/employers");
        return;
      }

      const data = employerDoc.data() as EmployerProfile;
      setOrganizationName(data.organizationName || "");
      setDescription(data.description || "");
      setWebsite(data.website || "");
      setLocation(data.location || "");
      setLogoUrl(data.logoUrl || "");
      setContactEmail(data.contactEmail || "");
      setContactPhone(data.contactPhone || "");
      setIndustry(data.industry || "");
      setCompanySize(data.companySize || "");
      setFoundedYear(data.foundedYear || "");
      setSocialLinkedin(data.socialLinks?.linkedin || "");
      setSocialTwitter(data.socialLinks?.twitter || "");
      setSocialFacebook(data.socialLinks?.facebook || "");
      setSocialInstagram(data.socialLinks?.instagram || "");
      setFeaturedOnCarousel((data as any).featuredOnCarousel || false);
    } catch (error) {
      console.error("Error loading employer:", error);
      showToast("error", "Failed to load employer");
    } finally {
      setLoading(false);
    }
  }

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !storage) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      showToast("error", "Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("error", "Image must be less than 5MB");
      return;
    }

    try {
      setUploadingLogo(true);

      // Delete old logo if exists
      if (logoUrl) {
        try {
          const oldLogoRef = storageRef(storage, `employers/${employerId}/logo`);
          await deleteObject(oldLogoRef);
        } catch (e) {
          // Ignore if old logo doesn't exist
        }
      }

      // Upload new logo
      const logoRef = storageRef(storage, `employers/${employerId}/logo`);
      await uploadBytes(logoRef, file);
      const newLogoUrl = await getDownloadURL(logoRef);

      // Update Firestore
      await updateDoc(doc(db!, "employers", employerId), {
        logoUrl: newLogoUrl,
        updatedAt: serverTimestamp(),
      });

      setLogoUrl(newLogoUrl);
      showToast("success", "Logo updated successfully");
    } catch (error) {
      console.error("Error uploading logo:", error);
      showToast("error", "Failed to upload logo");
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleRemoveLogo() {
    if (!storage || !logoUrl) return;
    if (!confirm("Are you sure you want to remove the logo?")) return;

    try {
      setUploadingLogo(true);

      // Delete from storage
      try {
        const logoRef = storageRef(storage, `employers/${employerId}/logo`);
        await deleteObject(logoRef);
      } catch (e) {
        // Ignore if doesn't exist
      }

      // Update Firestore
      await updateDoc(doc(db!, "employers", employerId), {
        logoUrl: "",
        updatedAt: serverTimestamp(),
      });

      setLogoUrl("");
      showToast("success", "Logo removed");
    } catch (error) {
      console.error("Error removing logo:", error);
      showToast("error", "Failed to remove logo");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSave() {
    if (!organizationName.trim()) {
      showToast("error", "Organization name is required");
      return;
    }

    try {
      setSaving(true);

      const updateData: Partial<EmployerProfile> = {
        organizationName: organizationName.trim(),
        description: description.trim(),
        website: website.trim(),
        location: location.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        industry: industry || null,
        companySize: companySize || null,
        foundedYear: foundedYear || null,
        socialLinks: {
          linkedin: socialLinkedin.trim(),
          twitter: socialTwitter.trim(),
          facebook: socialFacebook.trim(),
          instagram: socialInstagram.trim(),
        },
        featuredOnCarousel,
        updatedAt: serverTimestamp() as any,
      } as any;

      await updateDoc(doc(db!, "employers", employerId), updateData);
      showToast("success", "Employer profile updated successfully");
    } catch (error) {
      console.error("Error saving employer:", error);
      showToast("error", "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[var(--card-border)] border-t-teal-500"></div>
          <p className="mt-3 text-[var(--text-muted)]">Loading employer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <div className="border-b border-[var(--card-border)] bg-surface">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <Link
            href="/admin/employers"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-accent"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Employers
          </Link>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Edit Employer</h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{organizationName || "Loading..."}</p>
            </div>
            <Link
              href={`/admin/employers/${employerId}/products`}
              className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:border-accent hover:text-accent"
            >
              Manage Products
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="space-y-8">
          {/* Logo Section */}
          <div className="rounded-xl border border-[var(--card-border)] bg-surface p-6">
            <h2 className="text-lg font-semibold text-foreground">Logo</h2>
            <div className="mt-4 flex items-center gap-6">
              {logoUrl ? (
                <div className="relative">
                  <img
                    src={logoUrl}
                    alt="Company logo"
                    className="h-24 w-24 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] object-contain p-2"
                  />
                  <button
                    onClick={handleRemoveLogo}
                    disabled={uploadingLogo}
                    className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600 disabled:opacity-50"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-[var(--card-border)] bg-surface">
                  <PhotoIcon className="h-8 w-8 text-foreground0" />
                </div>
              )}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  {uploadingLogo ? "Uploading..." : logoUrl ? "Change Logo" : "Upload Logo"}
                </button>
                <p className="mt-2 text-xs text-foreground0">PNG, JPG up to 5MB</p>
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="rounded-xl border border-[var(--card-border)] bg-surface p-6">
            <h2 className="text-lg font-semibold text-foreground">Basic Information</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                  Organization Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground placeholder-slate-500 focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground placeholder-slate-500 focus:border-accent focus:outline-none"
                  placeholder="About the organization..."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Website</label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground placeholder-slate-500 focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, Province"
                    className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground placeholder-slate-500 focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Industry</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value as IndustryType)}
                    className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground focus:border-accent focus:outline-none"
                  >
                    <option value="">Select industry</option>
                    {INDUSTRY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Company Size</label>
                  <select
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value as CompanySize)}
                    className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground focus:border-accent focus:outline-none"
                  >
                    <option value="">Select size</option>
                    {COMPANY_SIZE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Founded Year</label>
                <input
                  type="number"
                  value={foundedYear}
                  onChange={(e) => setFoundedYear(e.target.value ? parseInt(e.target.value) : "")}
                  placeholder="2020"
                  min={1800}
                  max={new Date().getFullYear()}
                  className="w-full max-w-[200px] rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground placeholder-slate-500 focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="rounded-xl border border-[var(--card-border)] bg-surface p-6">
            <h2 className="text-lg font-semibold text-foreground">Contact Information</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Contact Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contact@example.com"
                  className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground placeholder-slate-500 focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Contact Phone</label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground placeholder-slate-500 focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="rounded-xl border border-[var(--card-border)] bg-surface p-6">
            <h2 className="text-lg font-semibold text-foreground">Social Links</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">LinkedIn</label>
                <input
                  type="url"
                  value={socialLinkedin}
                  onChange={(e) => setSocialLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/company/..."
                  className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground placeholder-slate-500 focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Twitter / X</label>
                <input
                  type="url"
                  value={socialTwitter}
                  onChange={(e) => setSocialTwitter(e.target.value)}
                  placeholder="https://twitter.com/..."
                  className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground placeholder-slate-500 focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Facebook</label>
                <input
                  type="url"
                  value={socialFacebook}
                  onChange={(e) => setSocialFacebook(e.target.value)}
                  placeholder="https://facebook.com/..."
                  className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground placeholder-slate-500 focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Instagram</label>
                <input
                  type="url"
                  value={socialInstagram}
                  onChange={(e) => setSocialInstagram(e.target.value)}
                  placeholder="https://instagram.com/..."
                  className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground placeholder-slate-500 focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Homepage Visibility */}
          <div className="rounded-xl border border-[var(--card-border)] bg-surface p-6">
            <h2 className="text-lg font-semibold text-foreground">Homepage Visibility</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Control whether this organization appears on the homepage partner carousel.
            </p>
            <div className="mt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={featuredOnCarousel}
                    onChange={(e) => setFeaturedOnCarousel(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-slate-700 peer-checked:bg-accent transition-colors"></div>
                  <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-[var(--card-bg)] transition-transform peer-checked:translate-x-5"></div>
                </div>
                <div>
                  <span className="font-medium text-foreground">Featured on Partner Carousel</span>
                  <p className="text-xs text-foreground0">
                    Show this organization&apos;s logo in the homepage &quot;Trusted Partners&quot; section
                  </p>
                </div>
              </label>
              <div className="mt-3 rounded-lg bg-surface border border-[var(--card-border)] px-4 py-3">
                <p className="text-xs text-[var(--text-muted)]">
                  <span className="font-semibold text-accent">Note:</span> Organizations with Tier 1 or Tier 2 subscriptions are automatically featured on the carousel.
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <Link
              href="/admin/employers"
              className="rounded-lg border border-[var(--card-border)] px-6 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-surface"
            >
              Cancel
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-accent px-6 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-teal-400 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
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
                <XCircleIcon className="h-5 w-5" />
              )}
              <p className="font-medium">{toast.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
