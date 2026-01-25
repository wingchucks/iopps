"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getEmployerProfile } from "@/lib/firestore/employers";
import {
  getSchoolByOrganizationId,
  updateSchool,
  setSchoolPublished,
} from "@/lib/firestore";
import { storage } from "@/lib/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import type { School, SchoolType } from "@/lib/types";
import { SCHOOL_TYPES } from "@/lib/types";
import {
  AcademicCapIcon,
  BuildingLibraryIcon,
  MapPinIcon,
  PhotoIcon,
  ArrowLeftIcon,
  GlobeAltIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";

const PROVINCES = [
  { value: "AB", label: "Alberta" },
  { value: "BC", label: "British Columbia" },
  { value: "MB", label: "Manitoba" },
  { value: "NB", label: "New Brunswick" },
  { value: "NL", label: "Newfoundland and Labrador" },
  { value: "NS", label: "Nova Scotia" },
  { value: "NT", label: "Northwest Territories" },
  { value: "NU", label: "Nunavut" },
  { value: "ON", label: "Ontario" },
  { value: "PE", label: "Prince Edward Island" },
  { value: "QC", label: "Quebec" },
  { value: "SK", label: "Saskatchewan" },
  { value: "YT", label: "Yukon" },
];

export default function SchoolSettingsPage() {
  const router = useRouter();
  const { user, role, loading } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Form state
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [type, setType] = useState<SchoolType>("university");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [indigenousFocused, setIndigenousFocused] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");

  // Contact info
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Indigenous services
  const [elderInResidence, setElderInResidence] = useState(false);
  const [indigenousStudentServices, setIndigenousStudentServices] =
    useState(false);
  const [culturalPrograms, setCulturalPrograms] = useState(false);

  // UI state
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user || role !== "employer") {
      setLoadingData(false);
      return;
    }

    const loadSchool = async () => {
      try {
        const profile = await getEmployerProfile(user.uid);
        if (profile) {
          const schoolData = await getSchoolByOrganizationId(profile.id);
          if (schoolData) {
            setSchool(schoolData);
            // Populate form with existing data
            setName(schoolData.name || "");
            setShortName(schoolData.shortName || "");
            setType(schoolData.type || "university");
            setWebsite(schoolData.website || "");
            setDescription(schoolData.description || "");
            setCity(schoolData.headOffice?.city || "");
            setProvince(schoolData.headOffice?.province || "");
            setAddress(schoolData.headOffice?.address || "");
            setPostalCode(schoolData.headOffice?.postalCode || "");
            setIndigenousFocused(schoolData.indigenousFocused || false);
            setLogoUrl(schoolData.logoUrl || "");
            setBannerUrl(schoolData.bannerUrl || "");
            setContactEmail(schoolData.contact?.admissionsEmail || "");
            setContactPhone(schoolData.contact?.admissionsPhone || "");
            setElderInResidence(
              schoolData.indigenousServices?.elderInResidence || false
            );
            setIndigenousStudentServices(
              schoolData.indigenousServices?.academicCoaches || false
            );
            setCulturalPrograms(
              schoolData.indigenousServices?.culturalProgramming || false
            );
          }
        }
      } catch (err) {
        console.error("Error loading school:", err);
        setError("Failed to load school data");
      } finally {
        setLoadingData(false);
      }
    };

    loadSchool();
  }, [user, role]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploadingLogo(true);
      const logoRef = ref(
        storage!,
        `schools/${user.uid}/logo/${Date.now()}-${file.name}`
      );
      await uploadBytes(logoRef, file);
      const url = await getDownloadURL(logoRef);
      setLogoUrl(url);
    } catch (err) {
      console.error(err);
      setError("Failed to upload logo. Please try again.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploadingBanner(true);
      const bannerRef = ref(
        storage!,
        `schools/${user.uid}/banner/${Date.now()}-${file.name}`
      );
      await uploadBytes(bannerRef, file);
      const url = await getDownloadURL(bannerRef);
      setBannerUrl(url);
    } catch (err) {
      console.error(err);
      setError("Failed to upload banner. Please try again.");
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSubmit = async (e: FormEvent, publish?: boolean) => {
    e.preventDefault();
    if (!user || !school) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const updateData: Partial<School> = {
        name,
        shortName: shortName || undefined,
        type,
        website: website || undefined,
        description: description || undefined,
        headOffice: {
          city,
          province,
          address: address || "",
          postalCode: postalCode || undefined,
        },
        location: city || province ? { city, province, address: address || undefined, postalCode: postalCode || undefined } : undefined,
        indigenousFocused,
        logoUrl: logoUrl || undefined,
        bannerUrl: bannerUrl || undefined,
        contact: {
          admissionsEmail: contactEmail || undefined,
          admissionsPhone: contactPhone || undefined,
        },
        indigenousServices: {
          elderInResidence,
          culturalCoordinators: false,
          academicCoaches: indigenousStudentServices,
          learningSpecialists: false,
          wellnessCoaches: false,
          psychologists: false,
          culturalProgramming: culturalPrograms,
          ceremonySpace: false,
        },
      };

      await updateSchool(school.id, updateData);

      // Handle publish/unpublish separately
      if (publish !== undefined) {
        await setSchoolPublished(school.id, publish);
        setSchool((prev) => (prev ? { ...prev, isPublished: publish } : null));
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error updating school:", err);
      setError(
        err instanceof Error ? err.message : "Failed to update school profile."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!user || role !== "employer") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold">Employer access required</h1>
        <p className="text-slate-300">
          You need an employer account to manage school settings.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900"
        >
          Login
        </Link>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center">
          <AcademicCapIcon className="mx-auto h-12 w-12 text-slate-600" />
          <h2 className="mt-4 text-xl font-semibold text-white">
            No School Profile
          </h2>
          <p className="mt-2 text-slate-400">
            You need to create a school profile first.
          </p>
          <Link
            href="/organization/education/setup"
            className="mt-4 inline-block rounded-lg bg-violet-500 px-6 py-2 font-semibold text-white hover:bg-violet-600"
          >
            Create School Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <Link
          href="/organization/education"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Education
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">School Settings</h1>
            <p className="mt-1 text-sm text-slate-400">
              Manage your institution&apos;s profile and settings
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                school.isPublished
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-slate-700 text-slate-400"
              }`}
            >
              {school.isPublished ? "Published" : "Draft"}
            </span>
            {school.isVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/20 px-3 py-1 text-xs font-medium text-violet-300">
                <CheckBadgeIcon className="h-3.5 w-3.5" />
                Verified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-sm text-emerald-400">
            Settings saved successfully!
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e)} className="space-y-8">
        {/* Basic Information */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <BuildingLibraryIcon className="h-5 w-5 text-violet-400" />
            Institution Information
          </h2>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Institution Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:border-violet-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Short Name / Abbreviation
              </label>
              <input
                type="text"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:border-violet-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Institution Type *
              </label>
              <select
                required
                value={type}
                onChange={(e) => setType(e.target.value as SchoolType)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:border-violet-500 focus:outline-none"
              >
                {SCHOOL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Website
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:border-violet-500 focus:outline-none"
                placeholder="https://yourschool.ca"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:border-violet-500 focus:outline-none"
                placeholder="Tell prospective students about your institution..."
              />
            </div>

            <label className="flex items-center gap-3 p-4 rounded-lg border border-slate-700 bg-slate-800/50 cursor-pointer hover:border-violet-500/50 transition-colors">
              <input
                type="checkbox"
                checked={indigenousFocused}
                onChange={(e) => setIndigenousFocused(e.target.checked)}
                className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-violet-600 focus:ring-violet-500"
              />
              <div>
                <span className="block text-sm font-medium text-white">
                  Indigenous-Focused Institution
                </span>
                <span className="text-xs text-slate-400">
                  Check if your institution is Indigenous-governed or primarily
                  serves Indigenous students
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Location */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <MapPinIcon className="h-5 w-5 text-violet-400" />
            Location
          </h2>

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Province *
                </label>
                <select
                  required
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:border-violet-500 focus:outline-none"
                >
                  <option value="">Select Province</option>
                  {PROVINCES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Street Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:border-violet-500 focus:outline-none"
              />
            </div>

            <div className="w-1/2">
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Postal Code
              </label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:border-violet-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <GlobeAltIcon className="h-5 w-5 text-violet-400" />
            Contact Information
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:border-violet-500 focus:outline-none"
                placeholder="admissions@school.ca"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:border-violet-500 focus:outline-none"
                placeholder="(306) 555-0100"
              />
            </div>
          </div>
        </div>

        {/* Indigenous Services */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-6">
            Indigenous Student Services
          </h2>

          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={elderInResidence}
                onChange={(e) => setElderInResidence(e.target.checked)}
                className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-slate-300">Elder in Residence Program</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={indigenousStudentServices}
                onChange={(e) =>
                  setIndigenousStudentServices(e.target.checked)
                }
                className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-slate-300">
                Indigenous Student Services Office
              </span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={culturalPrograms}
                onChange={(e) => setCulturalPrograms(e.target.checked)}
                className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-slate-300">
                Cultural Programs & Activities
              </span>
            </label>
          </div>
        </div>

        {/* Branding */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <PhotoIcon className="h-5 w-5 text-violet-400" />
            Branding
          </h2>

          <div className="space-y-6">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Institution Logo
              </label>
              <div className="flex items-start gap-4">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="h-24 w-24 rounded-xl object-cover border border-slate-700"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                    <AcademicCapIcon className="h-10 w-10 text-slate-600" />
                  </div>
                )}
                <div className="flex-1">
                  <label className="flex cursor-pointer flex-col">
                    <span className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-center text-sm text-slate-300 hover:border-violet-500 transition-colors">
                      {uploadingLogo ? "Uploading..." : "Change logo"}
                    </span>
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.svg,.webp"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      className="hidden"
                    />
                  </label>
                  <p className="mt-2 text-xs text-slate-500">
                    Recommended: 200x200px or larger
                  </p>
                </div>
              </div>
            </div>

            {/* Banner Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Banner Image
              </label>
              {bannerUrl ? (
                <div className="relative h-40 rounded-xl overflow-hidden border border-slate-700 mb-3">
                  <img
                    src={bannerUrl}
                    alt="Banner preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-40 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-3">
                  <div className="text-center">
                    <PhotoIcon className="mx-auto h-10 w-10 text-slate-600" />
                    <p className="mt-2 text-sm text-slate-500">
                      No banner uploaded
                    </p>
                  </div>
                </div>
              )}
              <label className="flex cursor-pointer">
                <span className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:border-violet-500 transition-colors">
                  {uploadingBanner ? "Uploading..." : "Change banner"}
                </span>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp"
                  onChange={handleBannerUpload}
                  disabled={uploadingBanner}
                  className="hidden"
                />
              </label>
              <p className="mt-2 text-xs text-slate-500">
                Recommended: 1200x400px
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/organization/education"
            className="rounded-lg border border-slate-700 px-6 py-2 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Link>
          {school.isPublished ? (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={(e) => handleSubmit(e, false)}
                className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-6 py-2 font-semibold text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Unpublish"}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-2 font-semibold text-white hover:from-violet-600 hover:to-purple-600 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : (
            <>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg border border-slate-700 bg-slate-800 px-6 py-2 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Draft"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={(e) => handleSubmit(e, true)}
                className="rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-2 font-semibold text-white hover:from-violet-600 hover:to-purple-600 disabled:opacity-50"
              >
                {saving ? "Publishing..." : "Save & Publish"}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
