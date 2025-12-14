"use client";

import { FormEvent, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  createTrainingProgram,
  getEmployerProfile,
} from "@/lib/firestore";
import type { TrainingFormat, EmployerProfile } from "@/lib/types";

const CATEGORIES = [
  { value: "", label: "Select a category" },
  { value: "Technology", label: "Technology & IT" },
  { value: "Trades", label: "Skilled Trades" },
  { value: "Healthcare", label: "Healthcare & Medical" },
  { value: "Business", label: "Business & Management" },
  { value: "Arts & Culture", label: "Arts & Culture" },
  { value: "Environment", label: "Environment & Natural Resources" },
  { value: "Education", label: "Education & Teaching" },
  { value: "Social Services", label: "Social Services" },
  { value: "Finance", label: "Finance & Accounting" },
  { value: "Legal", label: "Legal & Governance" },
  { value: "Other", label: "Other" },
];

const FORMATS: { value: TrainingFormat; label: string }[] = [
  { value: "online", label: "Online" },
  { value: "in-person", label: "In-Person" },
  { value: "hybrid", label: "Hybrid (Online + In-Person)" },
];

export default function NewTrainingProgramPage() {
  const router = useRouter();
  const { user, role, loading } = useAuth();
  const [employerProfile, setEmployerProfile] = useState<EmployerProfile | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [providerName, setProviderName] = useState("");
  const [providerWebsite, setProviderWebsite] = useState("");
  const [enrollmentUrl, setEnrollmentUrl] = useState("");
  const [format, setFormat] = useState<TrainingFormat>("online");
  const [duration, setDuration] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [skills, setSkills] = useState("");
  const [certificationOffered, setCertificationOffered] = useState("");
  const [indigenousFocused, setIndigenousFocused] = useState(false);
  const [cost, setCost] = useState("");
  const [fundingAvailable, setFundingAvailable] = useState(false);
  const [scholarshipInfo, setScholarshipInfo] = useState("");
  const [ongoing, setOngoing] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load employer profile
  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        try {
          const profile = await getEmployerProfile(user.uid);
          if (profile) {
            setEmployerProfile(profile);
            // Pre-fill provider name from profile
            if (!providerName && profile.organizationName) {
              setProviderName(profile.organizationName);
            }
          }
        } catch (err) {
          console.error("Failed to load employer profile:", err);
        }
      }
    };
    loadProfile();
  }, [user, providerName]);

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
          Employers must be signed in to create training programs.
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
          Employer access required
        </h1>
        <p className="text-sm text-slate-300">
          Switch to an employer account to create training programs.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate URL
    try {
      new URL(enrollmentUrl);
    } catch {
      setError("Please enter a valid enrollment URL (including https://)");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const finalProviderName =
        providerName ||
        employerProfile?.organizationName ||
        user.displayName ||
        user.email ||
        "Training Provider";

      // Check if employer is approved (has approved status)
      const isVerified = employerProfile?.status === "approved";

      const skillsArray = skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await createTrainingProgram(
        {
          organizationId: user.uid,
          organizationName: employerProfile?.organizationName,
          title,
          description,
          shortDescription: shortDescription || undefined,
          enrollmentUrl,
          providerName: finalProviderName,
          providerWebsite: providerWebsite || undefined,
          format,
          duration: duration || undefined,
          location: format !== "online" ? location : undefined,
          category: category || undefined,
          skills: skillsArray.length > 0 ? skillsArray : undefined,
          certificationOffered: certificationOffered || undefined,
          indigenousFocused,
          cost: cost || undefined,
          fundingAvailable,
          scholarshipInfo: fundingAvailable ? scholarshipInfo : undefined,
          ongoing,
          status: "pending", // Will be overridden based on verification
          featured: false,
          active: true,
        },
        isVerified
      );

      router.push("/organization/training");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Could not create training program."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <Link
          href="/organization/training"
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          ← Back to Training Programs
        </Link>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">
        Create a Training Program
      </h1>
      <p className="mt-2 text-sm text-slate-300">
        Share your training program with Indigenous learners and professionals
        across Turtle Island.
      </p>

      {/* Info Banner */}
      <div className="mt-4 rounded-lg border border-purple-500/30 bg-purple-500/10 p-4">
        <p className="text-sm text-purple-200">
          <strong>How it works:</strong> Your training program will be listed on
          IOPPS. When users click &quot;Enroll&quot;, they&apos;ll be redirected
          to your external enrollment page.
        </p>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
            Basic Information
          </h2>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Program Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Full Stack Web Development Bootcamp"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
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
              placeholder="A brief one-liner for program cards (optional)"
              maxLength={150}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
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
              placeholder="Describe the program in detail: what participants will learn, prerequisites, outcomes, etc."
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Provider Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
            Provider Information
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Provider / Institution Name *
              </label>
              <input
                type="text"
                required
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder="e.g., Indigenous Tech Academy"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Provider Website
              </label>
              <input
                type="url"
                value={providerWebsite}
                onChange={(e) => setProviderWebsite(e.target.value)}
                placeholder="https://provider-website.com"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Enrollment / Registration URL *
            </label>
            <input
              type="url"
              required
              value={enrollmentUrl}
              onChange={(e) => setEnrollmentUrl(e.target.value)}
              placeholder="https://your-site.com/enroll"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              Users will be redirected to this URL when they click &quot;Enroll&quot;
            </p>
          </div>
        </div>

        {/* Format & Schedule */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
            Format & Schedule
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Delivery Format *
              </label>
              <div className="mt-2 space-y-2">
                {FORMATS.map((f) => (
                  <label
                    key={f.value}
                    className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      format === f.value
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="format"
                      value={f.value}
                      checked={format === f.value}
                      onChange={(e) =>
                        setFormat(e.target.value as TrainingFormat)
                      }
                      className="sr-only"
                    />
                    <span className="text-sm text-slate-200">{f.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200">
                Duration
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g., 12 weeks, 40 hours, Self-paced"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
              />

              {format !== "online" && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-200">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., Toronto, ON or Multiple Locations"
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={ongoing}
                onChange={(e) => setOngoing(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500"
              />
              <span className="text-sm text-slate-200">
                Ongoing enrollment (students can join anytime)
              </span>
            </label>
          </div>
        </div>

        {/* Category & Skills */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
            Category & Skills
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200">
                Certification Offered
              </label>
              <input
                type="text"
                value={certificationOffered}
                onChange={(e) => setCertificationOffered(e.target.value)}
                placeholder="e.g., AWS Certified Developer"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Skills Taught
            </label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="JavaScript, React, Node.js (comma-separated)"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              Separate skills with commas
            </p>
          </div>

          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={indigenousFocused}
                onChange={(e) => setIndigenousFocused(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500"
              />
              <span className="text-sm text-slate-200">
                This program has an Indigenous focus or is specifically designed
                for Indigenous learners
              </span>
            </label>
          </div>
        </div>

        {/* Pricing & Funding */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
            Pricing & Funding
          </h2>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Cost
            </label>
            <input
              type="text"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="e.g., Free, $500, $1,000-$2,500, Contact for pricing"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={fundingAvailable}
                onChange={(e) => setFundingAvailable(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500"
              />
              <span className="text-sm text-slate-200">
                Funding, scholarships, or financial aid is available
              </span>
            </label>
          </div>

          {fundingAvailable && (
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Funding Details
              </label>
              <textarea
                value={scholarshipInfo}
                onChange={(e) => setScholarshipInfo(e.target.value)}
                rows={3}
                placeholder="Describe available funding options, eligibility requirements, etc."
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-slate-800">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-2.5 text-sm font-semibold text-white hover:from-purple-600 hover:to-indigo-600 transition-colors disabled:opacity-60"
          >
            {saving ? "Creating..." : "Create Training Program"}
          </button>
          <p className="mt-2 text-xs text-slate-500">
            Your program will be reviewed before appearing publicly. Verified
            organizations are auto-approved.
          </p>
        </div>
      </form>
    </div>
  );
}
