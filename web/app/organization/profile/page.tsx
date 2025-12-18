"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  getEmployerProfile,
  upsertEmployerProfile,
  isProfileComplete,
} from "@/lib/firestore";
import { storage } from "@/lib/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import type { IndustryType, CompanySize, SocialLinks, EmployerProfile } from "@/lib/types";

const INDUSTRY_OPTIONS: { value: IndustryType; label: string }[] = [
  { value: "government", label: "Government / First Nations Administration" },
  { value: "healthcare", label: "Healthcare / Social Services" },
  { value: "education", label: "Education / Training" },
  { value: "construction", label: "Construction / Trades" },
  { value: "natural-resources", label: "Natural Resources / Mining" },
  { value: "environmental", label: "Environmental / Conservation" },
  { value: "technology", label: "Technology / IT" },
  { value: "arts-culture", label: "Arts / Culture / Tourism" },
  { value: "finance", label: "Finance / Banking" },
  { value: "legal", label: "Legal / Consulting" },
  { value: "nonprofit", label: "Non-Profit / Community Services" },
  { value: "retail", label: "Retail / Hospitality" },
  { value: "transportation", label: "Transportation / Logistics" },
  { value: "other", label: "Other" },
];

const COMPANY_SIZE_OPTIONS: { value: CompanySize; label: string }[] = [
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201-500", label: "201-500 employees" },
  { value: "500+", label: "500+ employees" },
];

export default function EmployerProfilePage() {
  const { user, role, loading } = useAuth();

  // Basic fields
  const [organizationName, setOrganizationName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  // Enhanced fields
  const [bannerUrl, setBannerUrl] = useState("");
  const [industry, setIndustry] = useState<IndustryType | "">("");
  const [companySize, setCompanySize] = useState<CompanySize | "">("");
  const [foundedYear, setFoundedYear] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Social links
  const [linkedin, setLinkedin] = useState("");
  const [twitter, setTwitter] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");

  // UI state
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [logoFileName, setLogoFileName] = useState("");
  const [bannerFileName, setBannerFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Track if profile was already complete (for notification trigger)
  const [wasProfileComplete, setWasProfileComplete] = useState(false);
  const [profileStatus, setProfileStatus] = useState<string | undefined>(undefined);

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
          setBannerUrl(profile.bannerUrl ?? "");
          setIndustry(profile.industry ?? "");
          setCompanySize(profile.companySize ?? "");
          setFoundedYear(profile.foundedYear?.toString() ?? "");
          setContactEmail(profile.contactEmail ?? "");
          setContactPhone(profile.contactPhone ?? "");
          setLinkedin(profile.socialLinks?.linkedin ?? "");
          setTwitter(profile.socialLinks?.twitter ?? "");
          setFacebook(profile.socialLinks?.facebook ?? "");
          setInstagram(profile.socialLinks?.instagram ?? "");
          // Track if profile was already complete
          setWasProfileComplete(isProfileComplete(profile));
          setProfileStatus(profile.status);
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
        storage!,
        `employers/${user.uid}/logo/${Date.now()}-${file.name}`
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

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      setUploadingBanner(true);
      setError(null);
      const bannerRef = ref(
        storage!,
        `employers/${user.uid}/banner/${Date.now()}-${file.name}`
      );
      await uploadBytes(bannerRef, file);
      const url = await getDownloadURL(bannerRef);
      setBannerUrl(url);
      setBannerFileName(file.name);
      setStatusMessage("Banner uploaded successfully.");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to upload banner."
      );
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || role !== "employer") return;
    setSaving(true);
    setStatusMessage(null);
    setError(null);

    try {
      const socialLinks: SocialLinks = {};
      if (linkedin) socialLinks.linkedin = linkedin;
      if (twitter) socialLinks.twitter = twitter;
      if (facebook) socialLinks.facebook = facebook;
      if (instagram) socialLinks.instagram = instagram;

      await upsertEmployerProfile(user.uid, {
        organizationName,
        description,
        website,
        location,
        logoUrl,
        bannerUrl: bannerUrl || undefined,
        socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
        industry: industry || undefined,
        companySize: companySize || undefined,
        foundedYear: foundedYear ? parseInt(foundedYear) : undefined,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
      });

      // Check if profile just became complete (wasn't complete before, is complete now)
      const newProfileData: Partial<EmployerProfile> = {
        organizationName,
        description,
        location,
        logoUrl,
      };
      const isNowComplete = isProfileComplete(newProfileData as EmployerProfile);

      // Send admin notification if profile just became complete and not yet approved
      if (!wasProfileComplete && isNowComplete && profileStatus !== "approved") {
        // Fire and forget - don't block the save
        fetch("/api/admin/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "employer_ready",
            organizationName,
            employerEmail: user.email || "",
          }),
        }).catch(() => {
          // Silently fail - notification shouldn't affect user experience
        });

        // Update local state so we don't send notification again
        setWasProfileComplete(true);
        setStatusMessage("Profile updated! Your profile is now under review and you'll be notified once approved.");
      } else {
        setStatusMessage("Profile updated!");
      }
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
        className="space-y-8 rounded-2xl border border-slate-800/80 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30"
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

        {/* Basic Information Section */}
        <div className="space-y-5">
          <h2 className="text-lg font-semibold text-slate-100 border-b border-slate-800 pb-2">
            Basic Information
          </h2>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Organization name <span className="text-red-400">*</span>
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
        </div>

        {/* Company Details Section */}
        <div className="space-y-5">
          <h2 className="text-lg font-semibold text-slate-100 border-b border-slate-800 pb-2">
            Company Details
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Industry / Sector
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value as IndustryType)}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
              >
                <option value="">Select industry...</option>
                {INDUSTRY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Company Size
              </label>
              <select
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value as CompanySize)}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
              >
                <option value="">Select size...</option>
                {COMPANY_SIZE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Founded Year
              </label>
              <input
                type="number"
                value={foundedYear}
                onChange={(e) => setFoundedYear(e.target.value)}
                placeholder="e.g., 2015"
                min="1800"
                max={new Date().getFullYear()}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@company.com"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Contact Phone
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Social Links Section */}
        <div className="space-y-5">
          <h2 className="text-lg font-semibold text-slate-100 border-b border-slate-800 pb-2">
            Social Media Links
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-200">
                LinkedIn
              </label>
              <input
                type="url"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/company/..."
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Twitter / X
              </label>
              <input
                type="url"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                placeholder="https://twitter.com/..."
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Facebook
              </label>
              <input
                type="url"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="https://facebook.com/..."
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Instagram
              </label>
              <input
                type="url"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="https://instagram.com/..."
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Images Section */}
        <div className="space-y-5">
          <h2 className="text-lg font-semibold text-slate-100 border-b border-slate-800 pb-2">
            Images
          </h2>

          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-200">
              Organization Logo
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

          {/* Banner Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-200">
              Profile Banner
            </label>
            <div className="mt-2 flex flex-col gap-3">
              <label className="flex cursor-pointer flex-col text-xs text-slate-200">
                <span className="mb-2 rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-center text-sm hover:border-teal-500 transition-colors">
                  {uploadingBanner ? "Uploading..." : "Choose banner image"}
                </span>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  onChange={handleBannerUpload}
                  disabled={uploadingBanner}
                  className="hidden"
                />
              </label>
              {uploadingBanner && (
                <p className="text-xs text-slate-400">Uploading banner...</p>
              )}
              {bannerFileName && (
                <p className="text-xs text-teal-300">
                  Uploaded: {bannerFileName}
                </p>
              )}
              {bannerUrl && (
                <div className="flex flex-col gap-2">
                  <img
                    src={bannerUrl}
                    alt="Profile banner"
                    className="h-32 w-full rounded-md border border-slate-700 object-cover"
                  />
                  <a
                    href={bannerUrl}
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
              Upload a PNG or JPG file. Recommended size: 1200x300px or wider.
            </p>
          </div>
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
