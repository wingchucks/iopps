"use client";

import { useState, useEffect, FormEvent } from "react";
import { useAuth } from "@/components/AuthProvider";
import { SlideOutPanel } from "@/components/shared/SlideOutPanel";
import { createTrainingProgram, getEmployerProfile } from "@/lib/firestore";
import type { TrainingFormat, EmployerProfile } from "@/lib/types";
import toast from "react-hot-toast";

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
  { value: "hybrid", label: "Hybrid" },
];

interface CreateTrainingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateTrainingPanel({ isOpen, onClose, onSuccess }: CreateTrainingPanelProps) {
  const { user } = useAuth();
  const [employerProfile, setEmployerProfile] = useState<EmployerProfile | null>(null);

  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [providerName, setProviderName] = useState("");
  const [providerWebsite, setProviderWebsite] = useState("");
  const [enrollmentUrl, setEnrollmentUrl] = useState("");
  const [format, setFormat] = useState<TrainingFormat>("online");
  const [durationValue, setDurationValue] = useState<number | "">("");
  const [durationUnit, setDurationUnit] = useState<"days" | "weeks" | "months" | "years">("weeks");
  const [isSelfPaced, setIsSelfPaced] = useState(false);
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [skills, setSkills] = useState("");
  const [certificationOffered, setCertificationOffered] = useState("");
  const [indigenousFocused, setIndigenousFocused] = useState(false);
  const [cost, setCost] = useState("");
  const [fundingAvailable, setFundingAvailable] = useState(false);
  const [ongoing, setOngoing] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && isOpen) {
      getEmployerProfile(user.uid).then((profile) => {
        if (profile) {
          setEmployerProfile(profile);
          if (!providerName && profile.organizationName) {
            setProviderName(profile.organizationName);
          }
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isOpen]);

  const getDurationString = (): string => {
    if (isSelfPaced) return "Self-paced";
    if (durationValue === "" || durationValue === 0) return "";
    return `${durationValue} ${durationUnit}`;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!title.trim()) {
      setError("Program title is required");
      return;
    }
    if (!description.trim()) {
      setError("Description is required");
      return;
    }
    if (!enrollmentUrl.trim()) {
      setError("Enrollment URL is required");
      return;
    }

    try {
      new URL(enrollmentUrl);
    } catch {
      setError("Please enter a valid enrollment URL (including https://)");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const finalProviderName =
        providerName ||
        employerProfile?.organizationName ||
        user.displayName ||
        user.email ||
        "Training Provider";

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
          duration: getDurationString() || undefined,
          location: format !== "online" ? location : undefined,
          category: category || undefined,
          skills: skillsArray.length > 0 ? skillsArray : undefined,
          certificationOffered: certificationOffered || undefined,
          indigenousFocused,
          cost: cost || undefined,
          fundingAvailable,
          ongoing,
          status: "pending",
          featured: false,
          active: true,
        },
        isVerified
      );

      toast.success("Training program created!");
      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to create training program");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setShortDescription("");
    setDescription("");
    setProviderWebsite("");
    setEnrollmentUrl("");
    setFormat("online");
    setDurationValue("");
    setDurationUnit("weeks");
    setIsSelfPaced(false);
    setLocation("");
    setCategory("");
    setSkills("");
    setCertificationOffered("");
    setIndigenousFocused(false);
    setCost("");
    setFundingAvailable(false);
    setOngoing(true);
    setError(null);
  };

  return (
    <SlideOutPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Create Training Program"
      footer={
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-surface transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e as unknown as FormEvent)}
            disabled={submitting}
            className="rounded-lg bg-accent px-6 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Program"}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <section className="space-y-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)] border-b border-[var(--card-border)] pb-2">
            Basic Information
          </h3>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Program Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Full Stack Web Development Bootcamp"
              className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Short Description</label>
            <input
              type="text"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Brief one-liner for cards"
              maxLength={150}
              className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
            />
            <p className="mt-1 text-xs text-foreground0">{shortDescription.length}/150</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Full Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="What will participants learn, prerequisites, outcomes..."
              className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
            />
          </div>
        </section>

        {/* Provider */}
        <section className="space-y-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)] border-b border-[var(--card-border)] pb-2">
            Provider
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Provider Name *</label>
              <input
                type="text"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder="e.g., Indigenous Tech Academy"
                className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Provider Website</label>
              <input
                type="url"
                value={providerWebsite}
                onChange={(e) => setProviderWebsite(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Enrollment URL *</label>
            <input
              type="url"
              value={enrollmentUrl}
              onChange={(e) => setEnrollmentUrl(e.target.value)}
              placeholder="https://your-site.com/enroll"
              className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
            />
            <p className="mt-1 text-xs text-foreground0">Users will be redirected here when clicking &quot;Enroll&quot;</p>
          </div>
        </section>

        {/* Format & Duration */}
        <section className="space-y-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)] border-b border-[var(--card-border)] pb-2">
            Format & Schedule
          </h3>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Delivery Format</label>
            <div className="flex gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFormat(f.value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    format === f.value
                      ? "bg-accent text-white"
                      : "bg-surface text-[var(--text-secondary)] border border-[var(--card-border)] hover:border-accent/50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Duration</label>
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={isSelfPaced}
                onChange={(e) => setIsSelfPaced(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--card-border)] bg-surface text-accent focus:ring-accent"
              />
              <span className="text-sm text-[var(--text-secondary)]">Self-paced</span>
            </label>
            {!isSelfPaced && (
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  value={durationValue}
                  onChange={(e) => setDurationValue(e.target.value ? parseInt(e.target.value) : "")}
                  placeholder="e.g., 12"
                  className="w-24 rounded-lg border border-[var(--card-border)] bg-surface px-3 py-2 text-foreground focus:border-accent focus:outline-none"
                />
                <select
                  value={durationUnit}
                  onChange={(e) => setDurationUnit(e.target.value as typeof durationUnit)}
                  className="flex-1 rounded-lg border border-[var(--card-border)] bg-surface px-3 py-2 text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>
            )}
          </div>

          {format !== "online" && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Toronto, ON"
                className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
              />
            </div>
          )}

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={ongoing}
              onChange={(e) => setOngoing(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--card-border)] bg-surface text-accent focus:ring-accent"
            />
            <span className="text-sm text-[var(--text-secondary)]">Ongoing enrollment (join anytime)</span>
          </label>
        </section>

        {/* Category & Skills */}
        <section className="space-y-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)] border-b border-[var(--card-border)] pb-2">
            Category & Skills
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Certification</label>
              <input
                type="text"
                value={certificationOffered}
                onChange={(e) => setCertificationOffered(e.target.value)}
                placeholder="e.g., AWS Certified"
                className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Skills Taught</label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="JavaScript, React, Node.js (comma-separated)"
              className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={indigenousFocused}
              onChange={(e) => setIndigenousFocused(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--card-border)] bg-surface text-accent focus:ring-accent"
            />
            <span className="text-sm text-[var(--text-secondary)]">Indigenous-focused program</span>
          </label>
        </section>

        {/* Pricing */}
        <section className="space-y-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)] border-b border-[var(--card-border)] pb-2">
            Pricing
          </h3>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Cost</label>
            <input
              type="text"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="e.g., Free, $500, Contact for pricing"
              className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={fundingAvailable}
              onChange={(e) => setFundingAvailable(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--card-border)] bg-surface text-accent focus:ring-accent"
            />
            <span className="text-sm text-[var(--text-secondary)]">Funding / scholarships available</span>
          </label>
        </section>

        <p className="text-xs text-foreground0">
          Your program will be reviewed before appearing publicly. Verified organizations are auto-approved.
        </p>
      </form>
    </SlideOutPanel>
  );
}

export default CreateTrainingPanel;
