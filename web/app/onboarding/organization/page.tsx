/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  BriefcaseIcon,
  BuildingStorefrontIcon,
  AcademicCapIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  PhotoIcon,
  CheckIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/components/AuthProvider";
import { uploadImage } from "@/lib/firebase/storage";
import {
  createOrganizationProfile,
  updateOrganizationProfile,
  getOrganizationProfile,
} from "@/lib/firestore/organizations";
import { TerritorySelect } from "@/components/shared/TerritorySelect";
import type { OrgType, OrganizationModule, OrganizationProfile } from "@/lib/types";
import { ORG_TYPES, NORTH_AMERICAN_REGIONS } from "@/lib/types";

const CANADIAN_PROVINCES = NORTH_AMERICAN_REGIONS.slice(0, 13);

const ORG_TYPE_OPTIONS: { value: OrgType; label: string }[] = [
  { value: "EMPLOYER", label: "Employer" },
  { value: "INDIGENOUS_BUSINESS", label: "Indigenous Business" },
  { value: "SCHOOL", label: "School / College" },
  { value: "NONPROFIT", label: "Non-Profit" },
  { value: "GOVERNMENT", label: "Government" },
  { value: "OTHER", label: "Other" },
];

const SIZE_OPTIONS = ["1-10", "11-50", "51-200", "201-500", "500+"];

const SECTOR_OPTIONS = [
  "Government",
  "Education",
  "Healthcare",
  "Technology",
  "Construction",
  "Mining & Resources",
  "Social Services",
  "Arts & Culture",
  "Retail",
  "Professional Services",
  "Other",
];

const MODULE_CONFIGS: Record<
  OrganizationModule,
  {
    icon: typeof BriefcaseIcon;
    label: string;
    description: string;
    pricing: string;
    isFree: boolean;
  }
> = {
  hire: {
    icon: BriefcaseIcon,
    label: "Hire talent",
    description: "Post jobs and find Indigenous talent",
    pricing: "from $125/post",
    isFree: false,
  },
  sell: {
    icon: BuildingStorefrontIcon,
    label: "Sell products/services",
    description: "List in the Shop Indigenous directory",
    pricing: "$50/mo",
    isFree: false,
  },
  host: {
    icon: CalendarIcon,
    label: "Host events",
    description: "Promote conferences, pow wows, and gatherings",
    pricing: "FREE",
    isFree: true,
  },
  educate: {
    icon: AcademicCapIcon,
    label: "Offer training/education",
    description: "Share programs, courses, and scholarships",
    pricing: "FREE",
    isFree: true,
  },
  funding: {
    icon: CurrencyDollarIcon,
    label: "Provide funding/scholarships",
    description: "Share grants and funding opportunities",
    pricing: "FREE",
    isFree: true,
  },
};

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS = ["Identity", "About", "Capabilities", "Branding"];

interface FormData {
  orgType: OrgType;
  nation: string;
  territory: string;
  city: string;
  province: string;
  website: string;
  size: string;
  yearEstablished: string;
  description: string;
  sector: string;
  enabledModules: OrganizationModule[];
  logoUrl: string;
  coverImageUrl: string;
  contactEmail: string;
  contactPhone: string;
}

const inputClass =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-accent transition-colors";
const selectClass =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-accent transition-colors";
const labelClass = "block text-sm font-medium text-[var(--text-secondary)] mb-1.5";

export default function OrganizationOnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading, role } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState("");
  const [existingProfile, setExistingProfile] = useState<OrganizationProfile | null>(null);

  const [formData, setFormData] = useState<FormData>({
    orgType: "EMPLOYER",
    nation: "",
    territory: "",
    city: "",
    province: "",
    website: "",
    size: "",
    yearEstablished: "",
    description: "",
    sector: "",
    enabledModules: ["educate", "host", "funding"],
    logoUrl: "",
    coverImageUrl: "",
    contactEmail: "",
    contactPhone: "",
  });

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // Load existing profile
  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      const profile = await getOrganizationProfile(user.uid);
      if (profile) {
        setExistingProfile(profile);
        setFormData({
          orgType: profile.orgType || "EMPLOYER",
          nation: profile.nation || "",
          territory: profile.territory || "",
          city: profile.city || "",
          province: profile.province || "",
          website: profile.links?.website || profile.website || "",
          size: profile.size || "",
          yearEstablished: profile.yearEstablished ? String(profile.yearEstablished) : "",
          description: profile.description || "",
          sector: profile.sector || "",
          enabledModules: profile.enabledModules || ["educate", "host", "funding"],
          logoUrl: profile.logoUrl || "",
          coverImageUrl: (profile as any).bannerUrl || "",
          contactEmail: profile.contactEmail || "",
          contactPhone: profile.contactPhone || "",
        });
      }
    }
    loadProfile();
  }, [user]);

  // Redirect if not employer
  useEffect(() => {
    if (!authLoading && (!user || (role !== "employer" && role !== "admin"))) {
      router.push(user ? "/login" : "/login");
    }
  }, [user, role, authLoading, router]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    setError("");
    try {
      const result = await uploadImage(file, user.uid, "profile");
      updateField("logoUrl", result.url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload logo.");
    } finally {
      setUploading(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingCover(true);
    setError("");
    try {
      const result = await uploadImage(file, user.uid, "cover");
      updateField("coverImageUrl", result.url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload cover image.");
    } finally {
      setUploadingCover(false);
    }
  };

  const toggleModule = (module: OrganizationModule) => {
    setFormData((prev) => ({
      ...prev,
      enabledModules: prev.enabledModules.includes(module)
        ? prev.enabledModules.filter((m) => m !== module)
        : [...prev.enabledModules, module],
    }));
  };

  const handleNext = () => {
    setError("");
    if (step < 4) setStep((s) => (s + 1) as Step);
  };

  const handleBack = () => {
    setError("");
    if (step > 1) setStep((s) => (s - 1) as Step);
  };

  const handleSkip = () => {
    if (step < 4) setStep((s) => (s + 1) as Step);
  };

  const handleComplete = async () => {
    if (!user) return;
    setLoading(true);
    setError("");

    const year = formData.yearEstablished ? parseInt(formData.yearEstablished, 10) : undefined;

    try {
      if (existingProfile) {
        await updateOrganizationProfile(user.uid, {
          orgType: formData.orgType,
          nation: formData.nation || "",
          territory: formData.territory || "",
          city: formData.city || "",
          province: formData.province || "",
          links: { website: formData.website || "" },
          size: formData.size || "",
          yearEstablished: year,
          description: formData.description || "",
          sector: formData.sector || "",
          enabledModules: formData.enabledModules,
          logoUrl: formData.logoUrl || "",
          bannerUrl: formData.coverImageUrl || "",
          contactEmail: formData.contactEmail || "",
          contactPhone: formData.contactPhone || "",
          onboardingComplete: true,
        });
      } else {
        await createOrganizationProfile(user.uid, {
          organizationName: user.displayName || "My Organization",
          orgType: formData.orgType,
          nation: formData.nation || "",
          territory: formData.territory || "",
          city: formData.city || "",
          province: formData.province || "",
          website: formData.website || "",
          size: formData.size || "",
          yearEstablished: year,
          description: formData.description || "",
          sector: formData.sector || "",
          enabledModules: formData.enabledModules,
          logoUrl: formData.logoUrl || "",
          bannerUrl: formData.coverImageUrl || "",
          contactEmail: formData.contactEmail || "",
          contactPhone: formData.contactPhone || "",
          onboardingComplete: true,
        });
      }

      router.push("/discover");
    } catch (err: unknown) {
      console.error("Onboarding save error:", err);
      setError(err instanceof Error ? err.message : "Failed to save. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      {/* Minimal header */}
      <header className="border-b border-[var(--border)] bg-[var(--card-bg)]">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-xl font-black tracking-tight text-accent"
          >
            IOPPS
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-2xl">
          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center flex-1 last:flex-none">
                  <button
                    type="button"
                    onClick={() => s <= step && setStep(s as Step)}
                    disabled={s > step}
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                      s < step
                        ? "bg-accent text-white"
                        : s === step
                        ? "bg-accent text-white ring-4 ring-teal-100"
                        : "bg-surface text-[var(--text-muted)]"
                    }`}
                  >
                    {s < step ? (
                      <CheckIcon className="h-4 w-4" />
                    ) : (
                      s
                    )}
                  </button>
                  {s < 4 && (
                    <div
                      className={`mx-2 h-0.5 flex-1 rounded-full ${
                        s < step ? "bg-accent" : "bg-surface"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-foreground0">
              {STEP_LABELS.map((label, i) => (
                <span
                  key={label}
                  className={i + 1 === step ? "font-semibold text-accent" : ""}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Step content card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-sm sm:p-8">
            {/* Step 1: Identity */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="text-center mb-6">
                  <h1 className="text-xl font-bold text-[var(--text-primary)] sm:text-2xl">
                    Organization Identity
                  </h1>
                  <p className="mt-1 text-sm text-foreground0">
                    Tell us about your organization
                  </p>
                </div>

                <div>
                  <label className={labelClass}>Organization Type</label>
                  <select
                    value={formData.orgType}
                    onChange={(e) => updateField("orgType", e.target.value as OrgType)}
                    className={selectClass}
                  >
                    {ORG_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>
                    Nation <span className="text-[var(--text-muted)] font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nation}
                    onChange={(e) => updateField("nation", e.target.value)}
                    placeholder="Indigenous nation or community"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Territory <span className="text-[var(--text-muted)] font-normal">(optional)</span>
                  </label>
                  <TerritorySelect
                    value={formData.territory}
                    onChange={(val) => updateField("territory", val)}
                    className={selectClass}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      placeholder="City or community"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Province</label>
                    <select
                      value={formData.province}
                      onChange={(e) => updateField("province", e.target.value)}
                      className={selectClass}
                    >
                      <option value="">Select province</option>
                      {CANADIAN_PROVINCES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    Website <span className="text-[var(--text-muted)] font-normal">(optional)</span>
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => updateField("website", e.target.value)}
                    placeholder="https://yourorganization.com"
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {/* Step 2: About */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="text-center mb-6">
                  <h1 className="text-xl font-bold text-[var(--text-primary)] sm:text-2xl">
                    About Your Organization
                  </h1>
                  <p className="mt-1 text-sm text-foreground0">
                    Help others learn about what you do
                  </p>
                </div>

                <div>
                  <label className={labelClass}>Organization Size</label>
                  <select
                    value={formData.size}
                    onChange={(e) => updateField("size", e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select size</option>
                    {SIZE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s} {s === "500+" ? "employees" : "employees"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Year Established</label>
                  <input
                    type="number"
                    value={formData.yearEstablished}
                    onChange={(e) => updateField("yearEstablished", e.target.value)}
                    placeholder="e.g. 2010"
                    min={1800}
                    max={new Date().getFullYear()}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => {
                      const val = e.target.value.slice(0, 3000);
                      updateField("description", val);
                    }}
                    placeholder="Tell people about your organization, mission, and goals..."
                    rows={5}
                    className={`${inputClass} resize-none`}
                  />
                  <p className="mt-1 text-right text-xs text-[var(--text-muted)]">
                    {formData.description.length} / 3,000
                  </p>
                </div>

                <div>
                  <label className={labelClass}>Industry / Sector</label>
                  <select
                    value={formData.sector}
                    onChange={(e) => updateField("sector", e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select sector</option>
                    {SECTOR_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Step 3: Capabilities */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="text-center mb-6">
                  <h1 className="text-xl font-bold text-[var(--text-primary)] sm:text-2xl">
                    What would you like to do?
                  </h1>
                  <p className="mt-1 text-sm text-foreground0">
                    Select the capabilities you want to enable. You can change these anytime.
                  </p>
                </div>

                <div className="space-y-3">
                  {(Object.keys(MODULE_CONFIGS) as OrganizationModule[]).map(
                    (module) => {
                      const config = MODULE_CONFIGS[module];
                      const Icon = config.icon;
                      const isSelected = formData.enabledModules.includes(module);
                      return (
                        <button
                          key={module}
                          type="button"
                          onClick={() => toggleModule(module)}
                          className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                            isSelected
                              ? "border-accent bg-[var(--accent-bg)] ring-1 ring-teal-500/20"
                              : "border-[var(--border)] bg-[var(--card-bg)] hover:border-[var(--border)]"
                          }`}
                        >
                          <div
                            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
                              isSelected
                                ? "bg-accent text-white"
                                : "bg-surface text-foreground0"
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p
                                className={`font-medium ${
                                  isSelected
                                    ? "text-accent"
                                    : "text-[var(--text-primary)]"
                                }`}
                              >
                                {config.label}
                              </p>
                              <span
                                className={`ml-2 flex-shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                  config.isFree
                                    ? "bg-[var(--accent-lt)] text-accent"
                                    : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {config.pricing}
                              </span>
                            </div>
                            <p className="mt-0.5 text-sm text-foreground0">
                              {config.description}
                            </p>
                          </div>
                          <div
                            className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                              isSelected
                                ? "border-teal-600 bg-accent"
                                : "border-[var(--border)] bg-[var(--card-bg)]"
                            }`}
                          >
                            {isSelected && (
                              <CheckIcon className="h-3.5 w-3.5 text-white" />
                            )}
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Branding */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="text-center mb-6">
                  <h1 className="text-xl font-bold text-[var(--text-primary)] sm:text-2xl">
                    Branding & Contact
                  </h1>
                  <p className="mt-1 text-sm text-foreground0">
                    Add your logo and contact information
                  </p>
                </div>

                {/* Logo */}
                <div>
                  <label className={labelClass}>Logo</label>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)]">
                      {formData.logoUrl ? (
                        <Image
                          src={formData.logoUrl}
                          alt="Logo preview"
                          width={80}
                          height={80}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <PhotoIcon className="h-8 w-8 text-[var(--text-secondary)]" />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] shadow-sm hover:bg-[var(--background)] transition-colors">
                        {uploading ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <PhotoIcon className="h-4 w-4" />
                            Upload Logo
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                          disabled={uploading}
                        />
                      </label>
                      <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                        Square, 200x200px min. PNG or JPG, max 2MB
                      </p>
                    </div>
                  </div>
                </div>

                {/* Cover photo */}
                <div>
                  <label className={labelClass}>Cover Photo</label>
                  <div className="space-y-3">
                    <div className="aspect-[3/1] w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)]">
                      {formData.coverImageUrl ? (
                        <img
                          src={formData.coverImageUrl}
                          alt="Cover preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <PhotoIcon className="h-12 w-12 text-[var(--text-secondary)]" />
                        </div>
                      )}
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] shadow-sm hover:bg-[var(--background)] transition-colors">
                      {uploadingCover ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <PhotoIcon className="h-4 w-4" />
                          Upload Cover Photo
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverUpload}
                        className="hidden"
                        disabled={uploadingCover}
                      />
                    </label>
                    <p className="text-xs text-[var(--text-muted)]">
                      Recommended: 1200x400px (3:1 ratio)
                    </p>
                  </div>
                </div>

                {/* Contact info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Contact Email</label>
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) =>
                        updateField("contactEmail", e.target.value)
                      }
                      placeholder="contact@org.com"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Contact Phone</label>
                    <input
                      type="tel"
                      value={formData.contactPhone}
                      onChange={(e) =>
                        updateField("contactPhone", e.target.value)
                      }
                      placeholder="(555) 123-4567"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between border-t border-[var(--border-lt)] pt-6">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  Back
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-3">
                {step < 4 && (
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    Skip
                  </button>
                )}

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-1.5 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition-colors"
                  >
                    Continue
                    <ArrowRightIcon className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleComplete}
                    disabled={loading || uploading || uploadingCover}
                    className="flex items-center gap-1.5 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Complete Setup
                        <CheckIcon className="h-4 w-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Skip to dashboard */}
          {existingProfile && (
            <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
              <Link
                href="/discover"
                className="text-accent hover:underline"
              >
                Skip to Feed
              </Link>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
