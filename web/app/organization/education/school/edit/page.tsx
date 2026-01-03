"use client";

import { FormEvent, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getSchoolByEmployerId, updateSchool } from "@/lib/firestore";
import type { School, SchoolType } from "@/lib/types";

const SCHOOL_TYPES: { value: SchoolType; label: string }[] = [
  { value: "university", label: "University" },
  { value: "college", label: "College" },
  { value: "polytechnic", label: "Polytechnic Institute" },
  { value: "tribal_college", label: "Tribal College" },
  { value: "training_provider", label: "Training Provider" },
];

const PROVINCES = [
  "Alberta",
  "British Columbia",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Northwest Territories",
  "Nova Scotia",
  "Nunavut",
  "Ontario",
  "Prince Edward Island",
  "Quebec",
  "Saskatchewan",
  "Yukon",
];

export default function EditSchoolPage() {
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();

  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [type, setType] = useState<SchoolType>("college");
  const [established, setEstablished] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [reserveName, setReserveName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [indigenousControlled, setIndigenousControlled] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadSchool = async () => {
      if (!user) return;

      try {
        const schoolData = await getSchoolByEmployerId(user.uid);
        if (schoolData) {
          setSchool(schoolData);
          // Populate form
          setName(schoolData.name);
          setShortName(schoolData.shortName || "");
          setType(schoolData.type);
          setEstablished(schoolData.established?.toString() || "");
          setWebsite(schoolData.website || "");
          setDescription(schoolData.description || "");
          setAddress(schoolData.headOffice?.address || "");
          setCity(schoolData.headOffice?.city || "");
          setProvince(schoolData.headOffice?.province || "");
          setPostalCode(schoolData.headOffice?.postalCode || "");
          setReserveName(schoolData.headOffice?.reserveName || "");
          setPhone(schoolData.contact?.phone || "");
          setEmail(schoolData.contact?.email || "");
          setIndigenousControlled(schoolData.verification?.indigenousControlled || false);
          setIsPublished(schoolData.isPublished);
        }
      } catch (err) {
        console.error("Error loading school:", err);
        setError("Failed to load school profile");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadSchool();
    }
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-slate-300">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Please sign in
        </h1>
        <p className="text-sm text-slate-300">
          Organizations must be signed in to edit their school profile.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors"
        >
          Login
        </Link>
      </div>
    );
  }

  const isSuperAdmin = user?.email === "nathan.arias@iopps.ca";

  if (role !== "employer" && !isSuperAdmin) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Organization access required
        </h1>
        <p className="text-sm text-slate-300">
          Switch to an organization account to edit school profiles.
        </p>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          No school profile found
        </h1>
        <p className="text-sm text-slate-300">
          You haven&apos;t created a school profile yet.
        </p>
        <Link
          href="/organization/education/school/new"
          className="inline-block rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors"
        >
          Create School Profile
        </Link>
      </div>
    );
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !school) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await updateSchool(school.id, {
        name,
        shortName: shortName || undefined,
        slug: generateSlug(name),
        type,
        established: established ? parseInt(established) : undefined,
        website: website || undefined,
        description: description || undefined,
        headOffice: {
          address,
          city,
          province,
          postalCode: postalCode || undefined,
          reserveName: reserveName || undefined,
        },
        verification: {
          ...school.verification,
          indigenousControlled,
        },
        contact: {
          phone: phone || undefined,
          email: email || undefined,
        },
        isPublished,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push("/organization/dashboard?tab=education");
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not update school profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6">
          <Link
            href="/organization/dashboard?tab=education"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            ← Back to Education Dashboard
          </Link>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Edit School Profile
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Update your institution&apos;s information.
        </p>

        {error && (
          <p className="mt-4 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        {success && (
          <p className="mt-4 rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            School profile updated successfully! Redirecting...
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          {/* Publishing Status */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <label className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-white">
                  Published Status
                </span>
                <p className="mt-1 text-xs text-slate-400">
                  {isPublished
                    ? "Your school is visible to students"
                    : "Your school is hidden from public view"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPublished(!isPublished)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isPublished ? "bg-emerald-500" : "bg-slate-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPublished ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </label>
          </div>

          {/* Basic Info */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
              Basic Information
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-200">
                Institution Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., First Nations University of Canada"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Short Name / Acronym
                </label>
                <input
                  type="text"
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  placeholder="e.g., FNUniv"
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Institution Type *
                </label>
                <select
                  required
                  value={type}
                  onChange={(e) => setType(e.target.value as SchoolType)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  {SCHOOL_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Year Established
                </label>
                <input
                  type="number"
                  value={established}
                  onChange={(e) => setEstablished(e.target.value)}
                  placeholder="e.g., 1976"
                  min="1800"
                  max={new Date().getFullYear()}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Website
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://your-school.ca"
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Tell prospective students about your institution..."
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
              Head Office Location
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-200">
                Street Address *
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-200">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Province *
                </label>
                <select
                  required
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">Select province</option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200">
                Reserve / First Nation Territory Name
              </label>
              <input
                type="text"
                value={reserveName}
                onChange={(e) => setReserveName(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
              Contact Information
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-200">
                  General Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">
                  General Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Indigenous Verification */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
              Indigenous Verification
            </h2>

            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={indigenousControlled}
                  onChange={(e) => setIndigenousControlled(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <span className="text-sm font-medium text-emerald-200">
                    This is an Indigenous-controlled institution
                  </span>
                  <p className="mt-1 text-xs text-emerald-300/70">
                    Check this if your institution is owned, operated, or governed by Indigenous peoples or nations.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-slate-800 flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-sm font-semibold text-white hover:from-emerald-600 hover:to-teal-600 transition-colors disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <Link
              href="/organization/dashboard?tab=education"
              className="rounded-md border border-slate-700 px-6 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
