"use client";

import { FormEvent, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  createEducationProgram,
  getSchoolByEmployerId,
} from "@/lib/firestore";
import type { ProgramCategory, ProgramLevel, ProgramDelivery, School } from "@/lib/types";
import { PROGRAM_CATEGORIES } from "@/lib/types";

const PROGRAM_LEVELS: { value: ProgramLevel; label: string }[] = [
  { value: "certificate", label: "Certificate" },
  { value: "diploma", label: "Diploma" },
  { value: "bachelor", label: "Bachelor's Degree" },
  { value: "master", label: "Master's Degree" },
  { value: "doctorate", label: "Doctorate / PhD" },
  { value: "microcredential", label: "Microcredential" },
  { value: "apprenticeship", label: "Apprenticeship" },
];

const DELIVERY_METHODS: { value: ProgramDelivery; label: string }[] = [
  { value: "in-person", label: "In-Person" },
  { value: "online", label: "Online" },
  { value: "hybrid", label: "Hybrid" },
];

export default function NewProgramPage() {
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();

  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [category, setCategory] = useState<ProgramCategory>("Other");
  const [level, setLevel] = useState<ProgramLevel>("certificate");
  const [deliveryMethod, setDeliveryMethod] = useState<ProgramDelivery>("in-person");
  const [durationValue, setDurationValue] = useState("");
  const [durationUnit, setDurationUnit] = useState<"weeks" | "months" | "years">("months");
  const [fullTime, setFullTime] = useState(true);
  const [partTimeAvailable, setPartTimeAvailable] = useState(false);
  const [communityDelivery, setCommunityDelivery] = useState(false);
  const [domesticTuition, setDomesticTuition] = useState("");
  const [internationalTuition, setInternationalTuition] = useState("");
  const [tuitionPer, setTuitionPer] = useState<"year" | "program" | "semester">("program");
  const [educationRequirement, setEducationRequirement] = useState("");
  const [prerequisites, setPrerequisites] = useState("");
  const [applicationUrl, setApplicationUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSchool = async () => {
      if (!user) return;

      try {
        const schoolData = await getSchoolByEmployerId(user.uid);
        setSchool(schoolData);
      } catch (err) {
        console.error("Error loading school:", err);
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
          Organizations must be signed in to create programs.
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
          Switch to an organization account to create programs.
        </p>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          School profile required
        </h1>
        <p className="text-sm text-slate-300">
          You need to create a school profile before adding programs.
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

    try {
      const prerequisitesArray = prerequisites
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);

      await createEducationProgram({
        schoolId: school.id,
        schoolName: school.name,
        name,
        slug: generateSlug(name),
        description,
        shortDescription: shortDescription || undefined,
        category,
        level,
        deliveryMethod,
        duration: durationValue
          ? {
              value: parseInt(durationValue),
              unit: durationUnit,
            }
          : undefined,
        fullTime,
        partTimeAvailable,
        communityDelivery,
        tuition:
          domesticTuition || internationalTuition
            ? {
                domestic: domesticTuition ? parseInt(domesticTuition) : undefined,
                international: internationalTuition ? parseInt(internationalTuition) : undefined,
                per: tuitionPer,
              }
            : undefined,
        admissionRequirements: {
          education: educationRequirement || undefined,
          prerequisites: prerequisitesArray.length > 0 ? prerequisitesArray : undefined,
        },
        applicationUrl: applicationUrl || undefined,
      });

      router.push("/organization/dashboard?tab=education");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not create program.");
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
          Add New Program
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Add an education program to {school.name}.
        </p>

        {error && (
          <p className="mt-4 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          {/* Basic Info */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
              Program Information
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-200">
                Program Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Business Administration Diploma"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200">
                Short Description
              </label>
              <input
                type="text"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="A brief one-liner for program cards"
                maxLength={150}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-slate-500">
                {shortDescription.length}/150 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200">
                Full Description *
              </label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                placeholder="Describe the program in detail: what students will learn, career outcomes, etc."
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Classification */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
              Classification
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Category *
                </label>
                <select
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ProgramCategory)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
                >
                  {PROGRAM_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Credential Level *
                </label>
                <select
                  required
                  value={level}
                  onChange={(e) => setLevel(e.target.value as ProgramLevel)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
                >
                  {PROGRAM_LEVELS.map((lvl) => (
                    <option key={lvl.value} value={lvl.value}>
                      {lvl.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Delivery */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
              Delivery & Duration
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Delivery Method *
                </label>
                <select
                  required
                  value={deliveryMethod}
                  onChange={(e) => setDeliveryMethod(e.target.value as ProgramDelivery)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
                >
                  {DELIVERY_METHODS.map((dm) => (
                    <option key={dm.value} value={dm.value}>
                      {dm.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Duration
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="number"
                    value={durationValue}
                    onChange={(e) => setDurationValue(e.target.value)}
                    placeholder="e.g., 2"
                    min="1"
                    className="w-20 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
                  />
                  <select
                    value={durationUnit}
                    onChange={(e) => setDurationUnit(e.target.value as "weeks" | "months" | "years")}
                    className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
                  >
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fullTime}
                  onChange={(e) => setFullTime(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-teal-500 focus:ring-teal-500"
                />
                <span className="text-sm text-slate-200">Full-time available</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={partTimeAvailable}
                  onChange={(e) => setPartTimeAvailable(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-teal-500 focus:ring-teal-500"
                />
                <span className="text-sm text-slate-200">Part-time available</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={communityDelivery}
                  onChange={(e) => setCommunityDelivery(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-teal-500 focus:ring-teal-500"
                />
                <span className="text-sm text-slate-200">Community delivery available</span>
              </label>
            </div>
          </div>

          {/* Tuition */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
              Tuition & Fees
            </h2>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Domestic Tuition ($)
                </label>
                <input
                  type="number"
                  value={domesticTuition}
                  onChange={(e) => setDomesticTuition(e.target.value)}
                  placeholder="e.g., 5000"
                  min="0"
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">
                  International Tuition ($)
                </label>
                <input
                  type="number"
                  value={internationalTuition}
                  onChange={(e) => setInternationalTuition(e.target.value)}
                  placeholder="e.g., 12000"
                  min="0"
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Per
                </label>
                <select
                  value={tuitionPer}
                  onChange={(e) => setTuitionPer(e.target.value as "year" | "program" | "semester")}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
                >
                  <option value="program">Per Program</option>
                  <option value="year">Per Year</option>
                  <option value="semester">Per Semester</option>
                </select>
              </div>
            </div>
          </div>

          {/* Admission */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
              Admission Requirements
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-200">
                Education Requirement
              </label>
              <input
                type="text"
                value={educationRequirement}
                onChange={(e) => setEducationRequirement(e.target.value)}
                placeholder="e.g., Grade 12 or equivalent"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200">
                Prerequisites
              </label>
              <input
                type="text"
                value={prerequisites}
                onChange={(e) => setPrerequisites(e.target.value)}
                placeholder="Math 30, English 30 (comma-separated)"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-slate-500">
                Separate prerequisites with commas
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200">
                Application URL
              </label>
              <input
                type="url"
                value={applicationUrl}
                onChange={(e) => setApplicationUrl(e.target.value)}
                placeholder="https://your-school.ca/apply"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-slate-800">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white hover:from-teal-600 hover:to-cyan-600 transition-colors disabled:opacity-60"
            >
              {saving ? "Creating..." : "Create Program"}
            </button>
            <p className="mt-2 text-xs text-slate-500">
              Your program will start as a draft. Publish it when you&apos;re ready.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
