"use client";

import { FormEvent, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  getTrainingProgram,
  updateTrainingProgram,
  getEmployerProfile,
} from "@/lib/firestore";
import type { TrainingFormat, TrainingProgram, EmployerProfile } from "@/lib/types";

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

export default function EditTrainingProgramPage() {
  const router = useRouter();
  const params = useParams();
  const trainingId = params.trainingId as string;
  const { user, role, loading: authLoading } = useAuth();
  const [employerProfile, setEmployerProfile] = useState<EmployerProfile | null>(null);
  const [program, setProgram] = useState<TrainingProgram | null>(null);
  const [loadingProgram, setLoadingProgram] = useState(true);

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
  const [active, setActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load training program and employer profile
  useEffect(() => {
    const loadData = async () => {
      if (!user || !trainingId) return;

      try {
        const [programData, profile] = await Promise.all([
          getTrainingProgram(trainingId),
          getEmployerProfile(user.uid),
        ]);

        if (!programData) {
          setError("Training program not found");
          setLoadingProgram(false);
          return;
        }

        // Check ownership
        if (programData.organizationId !== user.uid) {
          setError("You don't have permission to edit this program");
          setLoadingProgram(false);
          return;
        }

        setProgram(programData);
        setEmployerProfile(profile);

        // Populate form fields
        setTitle(programData.title || "");
        setShortDescription(programData.shortDescription || "");
        setDescription(programData.description || "");
        setProviderName(programData.providerName || "");
        setProviderWebsite(programData.providerWebsite || "");
        setEnrollmentUrl(programData.enrollmentUrl || "");
        setFormat(programData.format || "online");
        setDuration(programData.duration || "");
        setLocation(programData.location || "");
        setCategory(programData.category || "");
        setSkills(programData.skills?.join(", ") || "");
        setCertificationOffered(programData.certificationOffered || "");
        setIndigenousFocused(programData.indigenousFocused || false);
        setCost(programData.cost || "");
        setFundingAvailable(programData.fundingAvailable || false);
        setScholarshipInfo(programData.scholarshipInfo || "");
        setOngoing(programData.ongoing ?? true);
        setActive(programData.active ?? true);
      } catch (err) {
        console.error("Failed to load training program:", err);
        setError("Failed to load training program");
      } finally {
        setLoadingProgram(false);
      }
    };

    loadData();
  }, [user, trainingId]);

  if (authLoading || loadingProgram) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-[var(--text-secondary)]">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Please sign in
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Employers must be signed in to edit training programs.
        </p>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-accent/90 transition-colors"
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
        <p className="text-sm text-[var(--text-secondary)]">
          Switch to an employer account to edit training programs.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-red-400">
          Error
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">{error}</p>
        <Link
          href="/organization/training"
          className="inline-block rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600 transition-colors"
        >
          Back to Training Programs
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !program) return;

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
      const skillsArray = skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await updateTrainingProgram(trainingId, {
        title,
        description,
        shortDescription: shortDescription || undefined,
        enrollmentUrl,
        providerName,
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
        active,
      });

      router.push("/organization/training");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Could not update training program."
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
          className="text-sm text-[var(--text-muted)] hover:text-white transition-colors"
        >
          &larr; Back to Training Programs
        </Link>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">
        Edit Training Program
      </h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Update the details of your training program.
      </p>

      {/* Status Banner */}
      {program && (
        <div className={`mt-4 rounded-lg border p-4 ${
          program.status === "approved"
            ? "border-accent/30 bg-accent/10"
            : program.status === "pending"
            ? "border-amber-500/30 bg-amber-500/10"
            : "border-red-500/30 bg-red-500/10"
        }`}>
          <p className={`text-sm ${
            program.status === "approved"
              ? "text-emerald-200"
              : program.status === "pending"
              ? "text-amber-200"
              : "text-red-200"
          }`}>
            <strong>Status:</strong>{" "}
            {program.status === "approved" && "Approved - Your program is live"}
            {program.status === "pending" && "Pending Review - Awaiting admin approval"}
            {program.status === "rejected" && "Rejected - Please contact support"}
            {program.featured && " | Featured"}
          </p>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-[var(--card-border)] pb-2">
            Basic Information
          </h2>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Program Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Full Stack Web Development Bootcamp"
              className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Short Description
            </label>
            <input
              type="text"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="A brief one-liner for program cards (optional)"
              maxLength={150}
              className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-foreground0">
              {shortDescription.length}/150 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Full Description *
            </label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              placeholder="Describe the program in detail: what participants will learn, prerequisites, outcomes, etc."
              className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Provider Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-[var(--card-border)] pb-2">
            Provider Information
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Provider / Institution Name *
              </label>
              <input
                type="text"
                required
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder="e.g., Indigenous Tech Academy"
                className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Provider Website
              </label>
              <input
                type="url"
                value={providerWebsite}
                onChange={(e) => setProviderWebsite(e.target.value)}
                placeholder="https://provider-website.com"
                className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Enrollment / Registration URL *
            </label>
            <input
              type="url"
              required
              value={enrollmentUrl}
              onChange={(e) => setEnrollmentUrl(e.target.value)}
              placeholder="https://your-site.com/enroll"
              className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-foreground0">
              Users will be redirected to this URL when they click &quot;Enroll&quot;
            </p>
          </div>
        </div>

        {/* Format & Schedule */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-[var(--card-border)] pb-2">
            Format & Schedule
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Delivery Format *
              </label>
              <div className="mt-2 space-y-2">
                {FORMATS.map((f) => (
                  <label
                    key={f.value}
                    className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      format === f.value
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-[var(--card-border)] hover:border-[var(--card-border)]"
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
                    <span className="text-sm text-foreground">{f.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">
                Duration
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g., 12 weeks, 40 hours, Self-paced"
                className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
              />

              {format !== "online" && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-foreground">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., Toronto, ON or Multiple Locations"
                    className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
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
                className="h-4 w-4 rounded border-[var(--card-border)] bg-surface text-purple-500 focus:ring-purple-500"
              />
              <span className="text-sm text-foreground">
                Ongoing enrollment (students can join anytime)
              </span>
            </label>
          </div>
        </div>

        {/* Category & Skills */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-[var(--card-border)] pb-2">
            Category & Skills
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">
                Certification Offered
              </label>
              <input
                type="text"
                value={certificationOffered}
                onChange={(e) => setCertificationOffered(e.target.value)}
                placeholder="e.g., AWS Certified Developer"
                className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Skills Taught
            </label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="JavaScript, React, Node.js (comma-separated)"
              className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-foreground0">
              Separate skills with commas
            </p>
          </div>

          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={indigenousFocused}
                onChange={(e) => setIndigenousFocused(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--card-border)] bg-surface text-purple-500 focus:ring-purple-500"
              />
              <span className="text-sm text-foreground">
                This program has an Indigenous focus or is specifically designed
                for Indigenous learners
              </span>
            </label>
          </div>
        </div>

        {/* Pricing & Funding */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-[var(--card-border)] pb-2">
            Pricing & Funding
          </h2>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Cost
            </label>
            <input
              type="text"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="e.g., Free, $500, $1,000-$2,500, Contact for pricing"
              className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={fundingAvailable}
                onChange={(e) => setFundingAvailable(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--card-border)] bg-surface text-purple-500 focus:ring-purple-500"
              />
              <span className="text-sm text-foreground">
                Funding, scholarships, or financial aid is available
              </span>
            </label>
          </div>

          {fundingAvailable && (
            <div>
              <label className="block text-sm font-medium text-foreground">
                Funding Details
              </label>
              <textarea
                value={scholarshipInfo}
                onChange={(e) => setScholarshipInfo(e.target.value)}
                rows={3}
                placeholder="Describe available funding options, eligibility requirements, etc."
                className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Visibility */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-[var(--card-border)] pb-2">
            Visibility
          </h2>

          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--card-border)] bg-surface text-purple-500 focus:ring-purple-500"
              />
              <span className="text-sm text-foreground">
                Active - Program is visible to public (when approved)
              </span>
            </label>
            <p className="mt-1 ml-7 text-xs text-foreground0">
              Uncheck to temporarily hide this program from public listings
            </p>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-[var(--card-border)] flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-2.5 text-sm font-semibold text-white hover:from-purple-600 hover:to-indigo-600 transition-colors disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <Link
            href="/organization/training"
            className="rounded-md px-4 py-2 text-sm text-[var(--text-muted)] hover:text-white transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
