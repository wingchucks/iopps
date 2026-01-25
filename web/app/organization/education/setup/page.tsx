"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getEmployerProfile } from "@/lib/firestore/employers";
import { getSchoolByOrganizationId, createSchool } from "@/lib/firestore";
import { storage } from "@/lib/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import type { School, SchoolType } from "@/lib/types";
import { SCHOOL_TYPES } from "@/lib/types";
import {
  AcademicCapIcon,
  BuildingLibraryIcon,
  MapPinIcon,
  GlobeAltIcon,
  PhotoIcon,
  CheckCircleIcon,
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

export default function SchoolSetupPage() {
  const router = useRouter();
  const { user, role, loading } = useAuth();
  const [existingSchool, setExistingSchool] = useState<School | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);

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

  // UI state
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || role !== "employer") {
      setCheckingExisting(false);
      return;
    }

    const checkExisting = async () => {
      try {
        const profile = await getEmployerProfile(user.uid);
        if (profile) {
          const school = await getSchoolByOrganizationId(profile.id);
          if (school) {
            setExistingSchool(school);
          }
        }
      } catch (err) {
        console.error("Error checking existing school:", err);
      } finally {
        setCheckingExisting(false);
      }
    };

    checkExisting();
  }, [user, role]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      const profile = await getEmployerProfile(user.uid);
      if (!profile) {
        setError("Please complete your employer profile first.");
        return;
      }

      const schoolData: Omit<School, "id" | "createdAt" | "updatedAt" | "viewCount"> = {
        employerId: profile.id,
        name,
        shortName: shortName || undefined,
        type,
        website: website || undefined,
        slug: generateSlug(name),
        description: description || undefined,
        headOffice: {
          city,
          province,
          address: address || "",
          postalCode: postalCode || undefined,
        },
        campuses: [],
        location: city || province ? { city, province, address: address || undefined, postalCode: postalCode || undefined } : undefined,
        indigenousFocused,
        logoUrl: logoUrl || undefined,
        bannerUrl: bannerUrl || undefined,
        isPublished: false,
      };

      await createSchool(schoolData);
      router.push("/organization/education");
    } catch (err) {
      console.error("Error creating school:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create school profile."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading || checkingExisting) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold">Sign in required</h1>
        <p className="text-slate-300">
          Sign in or create an employer account to set up your school profile.
        </p>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-md bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-600"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-violet-400"
          >
            Register
          </Link>
        </div>
      </div>
    );
  }

  if (role !== "employer") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold">Employer access required</h1>
        <p className="text-slate-300">
          You need an employer account to create a school profile.
        </p>
      </div>
    );
  }

  // Already has a school profile
  if (existingSchool) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
            <CheckCircleIcon className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            School Profile Already Exists
          </h1>
          <p className="text-slate-400 mb-6">
            You already have a school profile for <strong>{existingSchool.name}</strong>.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/organization/education"
              className="rounded-lg bg-violet-500 px-6 py-3 font-semibold text-white hover:bg-violet-600"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/organization/education/settings"
              className="rounded-lg border border-slate-700 px-6 py-3 text-slate-300 hover:bg-slate-800"
            >
              Edit Settings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-violet-400">
          Education Partner
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Create School Profile
        </h1>
        <p className="mt-3 text-sm text-slate-400 sm:text-base">
          Set up your institution&apos;s profile to list academic programs, scholarships,
          and connect with Indigenous students across Canada.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-8"
      >
        {/* Basic Information */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
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
                placeholder="e.g., First Nations University of Canada"
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
                placeholder="e.g., FNUniv"
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
                placeholder="Tell prospective students about your institution, mission, and what makes you unique..."
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
                  Check if your institution is Indigenous-governed or primarily serves Indigenous students
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Location */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
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
                  placeholder="Regina"
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
                placeholder="1 First Nations Way"
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
                placeholder="S4S 7K2"
              />
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
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
                      {uploadingLogo ? "Uploading..." : "Choose logo file"}
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
                    Recommended: 200x200px or larger, PNG or JPG
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
                  {uploadingBanner ? "Uploading..." : "Choose banner image"}
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
                Recommended: 1200x400px, PNG or JPG
              </p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Link
            href="/organization/education"
            className="text-sm text-slate-400 hover:text-white"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 px-8 py-3 font-semibold text-white hover:from-violet-600 hover:to-purple-600 transition-colors disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create School Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
