"use client";

import { FormEvent, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getScholarship, updateScholarship } from "@/lib/firestore";
import type { ScholarshipApplicationMethod, Scholarship } from "@/lib/types";

export default function EditScholarshipPage() {
  const router = useRouter();
  const params = useParams();
  const scholarshipId = params.scholarshipId as string;
  const { user, role, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [scholarship, setScholarship] = useState<Scholarship | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [level, setLevel] = useState("");
  const [region, setRegion] = useState("");
  const [type, setType] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Application method fields
  const [applicationMethod, setApplicationMethod] = useState<ScholarshipApplicationMethod | "">("");
  const [applicationUrl, setApplicationUrl] = useState("");
  const [applicationEmail, setApplicationEmail] = useState("");
  const [applicationInstructions, setApplicationInstructions] = useState("");

  // Recurring deadline fields
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringSchedule, setRecurringSchedule] = useState("");

  // Load scholarship data
  useEffect(() => {
    async function loadScholarship() {
      if (!scholarshipId) return;

      try {
        const data = await getScholarship(scholarshipId);
        if (data) {
          setScholarship(data);
          setTitle(data.title || "");
          setProvider(data.provider || "");
          setDescription(data.description || "");
          setAmount(typeof data.amount === "string" ? data.amount : "");
          setLevel(data.level || "");
          setRegion(data.region || "");
          setType(data.type || "");
          setActive(data.active !== false);
          setApplicationMethod(data.applicationMethod || "");
          setApplicationUrl(data.applicationUrl || "");
          setApplicationEmail(data.applicationEmail || "");
          setApplicationInstructions(data.applicationInstructions || "");
          setIsRecurring(data.isRecurring || false);
          setRecurringSchedule(data.recurringSchedule || "");

          // Handle deadline conversion
          if (data.deadline) {
            try {
              const deadlineDate =
                typeof data.deadline === "object" && "toDate" in data.deadline
                  ? data.deadline.toDate()
                  : typeof data.deadline === "string"
                  ? new Date(data.deadline)
                  : data.deadline;
              if (deadlineDate instanceof Date && !isNaN(deadlineDate.getTime())) {
                setDeadline(deadlineDate.toISOString().split("T")[0]);
              }
            } catch {
              // Leave deadline empty if parsing fails
            }
          }
        }
      } catch (err) {
        console.error("Failed to load scholarship:", err);
        setError("Failed to load scholarship data");
      } finally {
        setLoading(false);
      }
    }

    loadScholarship();
  }, [scholarshipId]);

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-[var(--text-secondary)]">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Please sign in</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          You must be signed in to edit scholarships.
        </p>
        <Link
          href="/login"
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-accent/90 transition-colors"
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
        <h1 className="text-2xl font-semibold tracking-tight">
          Employer access required
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Switch to an employer account to edit scholarships.
        </p>
      </div>
    );
  }

  if (!scholarship) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Scholarship not found
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          The scholarship you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/organization/scholarships"
          className="text-sm text-[#14B8A6] hover:underline"
        >
          ← Back to Scholarships
        </Link>
      </div>
    );
  }

  // Check ownership (unless super admin)
  if (!isSuperAdmin && scholarship.employerId !== user.uid) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Access denied</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          You don&apos;t have permission to edit this scholarship.
        </p>
        <Link
          href="/organization/scholarships"
          className="text-sm text-[#14B8A6] hover:underline"
        >
          ← Back to Scholarships
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !scholarshipId) return;

    // Validate application method
    if (!applicationMethod) {
      setError("Please select an application method.");
      return;
    }

    if (applicationMethod === "external_link" && !applicationUrl) {
      setError("Please provide an application URL for external applications.");
      return;
    }

    if (applicationMethod === "external_link" && applicationUrl) {
      // Validate URL format - must be https://
      try {
        const url = new URL(applicationUrl);
        if (url.protocol !== "https:") {
          setError("Application URL must start with https:// for security");
          return;
        }
      } catch {
        setError("Please enter a valid application URL (e.g., https://example.com/apply)");
        return;
      }
    }

    if (applicationMethod === "email" && !applicationEmail) {
      setError("Please provide an email address for email applications.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await updateScholarship(scholarshipId, {
        title,
        provider,
        description,
        amount: amount || undefined,
        deadline: deadline || undefined,
        level,
        region: region || undefined,
        type,
        active,
        applicationMethod,
        applicationUrl: applicationMethod === "external_link" ? applicationUrl : null,
        applicationEmail: applicationMethod === "email" ? applicationEmail : undefined,
        applicationInstructions: applicationMethod === "institution_portal" ? applicationInstructions : undefined,
        isRecurring,
        recurringSchedule: isRecurring && recurringSchedule ? recurringSchedule : null,
      });

      router.push("/organization/scholarships");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not update scholarship.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <Link
          href="/organization/scholarships"
          className="text-sm text-[var(--text-muted)] hover:text-white transition-colors"
        >
          ← Back to Scholarships
        </Link>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">Edit Scholarship</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Update the details of your scholarship listing.
      </p>

      {error && (
        <p className="mt-4 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground">
            Scholarship Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Indigenous Student Leadership Award"
            className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-[#14B8A6] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">
            Provider / Organization
          </label>
          <input
            type="text"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder="e.g., Indigenous Education Foundation"
            className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-[#14B8A6] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">
            Description *
          </label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Describe the scholarship, eligibility requirements, and how to apply..."
            className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-[#14B8A6] focus:outline-none"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-foreground">
              Award Amount
            </label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g., $5,000 or $1,000-$5,000"
              className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-[#14B8A6] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">
              Application Deadline
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-[#14B8A6] focus:outline-none"
            />
          </div>
        </div>

        {/* Recurring Deadline */}
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--card-border)] bg-surface text-[#14B8A6] focus:ring-[#14B8A6] focus:ring-offset-background"
            />
            <span className="text-sm font-medium text-foreground">
              This deadline repeats annually
            </span>
          </label>
          <p className="text-xs text-foreground0 ml-7">
            Check this if the scholarship has multiple deadlines throughout the year or repeats every year.
          </p>

          {isRecurring && (
            <div className="ml-7">
              <label className="block text-sm font-medium text-foreground">
                Recurring Schedule
              </label>
              <input
                type="text"
                value={recurringSchedule}
                onChange={(e) => setRecurringSchedule(e.target.value)}
                placeholder="e.g., August 1, November 1, February 1"
                className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-[#14B8A6] focus:outline-none"
              />
              <p className="mt-1 text-xs text-foreground0">
                List all deadline dates. This will be shown instead of a single deadline.
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-foreground">
              Education Level *
            </label>
            <select
              required
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-[#14B8A6] focus:outline-none"
            >
              <option value="">Select level</option>
              <option value="high_school">High School</option>
              <option value="undergraduate">Undergraduate</option>
              <option value="graduate">Graduate</option>
              <option value="postgraduate">Postgraduate / PhD</option>
              <option value="vocational">Vocational / Trade</option>
              <option value="any">Any Level</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">
              Scholarship Type *
            </label>
            <select
              required
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-[#14B8A6] focus:outline-none"
            >
              <option value="">Select type</option>
              <option value="merit">Merit-Based</option>
              <option value="need_based">Need-Based</option>
              <option value="indigenous">Indigenous-Specific</option>
              <option value="field_specific">Field-Specific</option>
              <option value="community">Community Service</option>
              <option value="athletic">Athletic</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">
            Eligible Region
          </label>
          <input
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="e.g., Canada-wide, Ontario, Alberta"
            className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-[#14B8A6] focus:outline-none"
          />
        </div>

        {/* Status Toggle */}
        <div className="pt-4 border-t border-[var(--card-border)]">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--card-border)] bg-surface text-[#14B8A6] focus:ring-[#14B8A6] focus:ring-offset-background"
            />
            <span className="text-sm font-medium text-foreground">
              Active (visible to students)
            </span>
          </label>
          <p className="text-xs text-foreground0 ml-7">
            Uncheck to hide this scholarship from public listings.
          </p>
        </div>

        {/* Application Method Section */}
        <div className="mt-8 pt-6 border-t border-[var(--card-border)]">
          <h3 className="text-lg font-semibold text-white mb-4">
            How do applicants apply? *
          </h3>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Let applicants know how to submit their application for this scholarship.
          </p>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Application Method *
            </label>
            <select
              required
              value={applicationMethod}
              onChange={(e) => setApplicationMethod(e.target.value as ScholarshipApplicationMethod)}
              className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-[#14B8A6] focus:outline-none"
            >
              <option value="">Select application method</option>
              <option value="external_link">External Application Link</option>
              <option value="email">Email Application</option>
              <option value="institution_portal">Apply via Institution Portal</option>
              <option value="instructions_provided">Instructions Provided in Description</option>
            </select>
          </div>

          {applicationMethod === "external_link" && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-foreground">
                Application URL *
              </label>
              <input
                type="url"
                required={applicationMethod === "external_link"}
                value={applicationUrl}
                onChange={(e) => setApplicationUrl(e.target.value)}
                placeholder="https://example.com/apply"
                className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-[#14B8A6] focus:outline-none"
              />
              <p className="mt-1 text-xs text-foreground0">
                Enter the full URL where applicants can submit their application (must be https://)
              </p>
            </div>
          )}

          {applicationMethod === "email" && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-foreground">
                Application Email *
              </label>
              <input
                type="email"
                required={applicationMethod === "email"}
                value={applicationEmail}
                onChange={(e) => setApplicationEmail(e.target.value)}
                placeholder="scholarships@organization.com"
                className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-[#14B8A6] focus:outline-none"
              />
              <p className="mt-1 text-xs text-foreground0">
                Applicants will be directed to send their application to this email
              </p>
            </div>
          )}

          {applicationMethod === "institution_portal" && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-foreground">
                Application Instructions
              </label>
              <textarea
                value={applicationInstructions}
                onChange={(e) => setApplicationInstructions(e.target.value)}
                rows={3}
                placeholder="e.g., Log in to your student portal and navigate to Financial Aid > Scholarships"
                className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-[#14B8A6] focus:outline-none"
              />
            </div>
          )}
        </div>

        <div className="pt-4 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-accent px-6 py-2 text-sm font-semibold text-slate-900 hover:bg-accent/90 transition-colors disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <Link
            href="/organization/scholarships"
            className="rounded-md border border-[var(--card-border)] bg-surface px-6 py-2 text-sm font-semibold text-foreground hover:bg-slate-700 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
