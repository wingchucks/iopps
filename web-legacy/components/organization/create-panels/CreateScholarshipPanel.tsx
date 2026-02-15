"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/components/AuthProvider";
import { SlideOutPanel } from "@/components/shared/SlideOutPanel";
import { createScholarship, getEmployerProfile } from "@/lib/firestore";
import type { ScholarshipApplicationMethod } from "@/lib/types";
import toast from "react-hot-toast";

interface CreateScholarshipPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateScholarshipPanel({ isOpen, onClose, onSuccess }: CreateScholarshipPanelProps) {
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [level, setLevel] = useState("");
  const [region, setRegion] = useState("");
  const [type, setType] = useState("");
  const [applicationMethod, setApplicationMethod] = useState<ScholarshipApplicationMethod | "">("");
  const [applicationUrl, setApplicationUrl] = useState("");
  const [applicationEmail, setApplicationEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!title.trim()) {
      setError("Scholarship title is required");
      return;
    }
    if (!description.trim()) {
      setError("Description is required");
      return;
    }
    if (!applicationMethod) {
      setError("Please select an application method");
      return;
    }
    if (applicationMethod === "external_link" && !applicationUrl) {
      setError("Please provide an application URL");
      return;
    }
    if (applicationMethod === "external_link" && applicationUrl) {
      try {
        const url = new URL(applicationUrl);
        if (url.protocol !== "https:") {
          setError("Application URL must start with https://");
          return;
        }
      } catch {
        setError("Please enter a valid application URL");
        return;
      }
    }
    if (applicationMethod === "email" && !applicationEmail) {
      setError("Please provide an application email");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let providerName = provider;
      if (!providerName) {
        const profile = await getEmployerProfile(user.uid);
        providerName = profile?.organizationName ?? user.displayName ?? user.email ?? "Employer";
      }

      await createScholarship({
        employerId: user.uid,
        employerName: providerName,
        title,
        provider: providerName,
        description,
        amount: amount || undefined,
        deadline: deadline || undefined,
        level,
        region: region || undefined,
        type,
        applicationMethod,
        applicationUrl: applicationMethod === "external_link" ? applicationUrl : null,
        applicationEmail: applicationMethod === "email" ? applicationEmail : undefined,
      });

      toast.success("Scholarship created successfully!");
      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to create scholarship");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setProvider("");
    setDescription("");
    setAmount("");
    setDeadline("");
    setLevel("");
    setRegion("");
    setType("");
    setApplicationMethod("");
    setApplicationUrl("");
    setApplicationEmail("");
    setError(null);
  };

  return (
    <SlideOutPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Create Scholarship"
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
            {submitting ? "Creating..." : "Create Scholarship"}
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
            Scholarship Details
          </h3>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Scholarship Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Indigenous Student Leadership Award"
              className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Provider / Organization</label>
            <input
              type="text"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="Leave blank to use your org name"
              className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe eligibility, how to apply..."
              className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Award Amount</label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g., $5,000"
                className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Education Level *</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
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
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Scholarship Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
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
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Eligible Region</label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g., Canada-wide, Ontario"
              className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
            />
          </div>
        </section>

        {/* Application Method */}
        <section className="space-y-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)] border-b border-[var(--card-border)] pb-2">
            How do applicants apply? *
          </h3>

          <div>
            <select
              value={applicationMethod}
              onChange={(e) => setApplicationMethod(e.target.value as ScholarshipApplicationMethod)}
              className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
            >
              <option value="">Select application method</option>
              <option value="external_link">External Application Link</option>
              <option value="email">Email Application</option>
              <option value="institution_portal">Apply via Institution Portal</option>
              <option value="instructions_provided">Instructions Provided in Description</option>
            </select>
          </div>

          {applicationMethod === "external_link" && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Application URL *</label>
              <input
                type="url"
                value={applicationUrl}
                onChange={(e) => setApplicationUrl(e.target.value)}
                placeholder="https://example.com/apply"
                className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
              />
            </div>
          )}

          {applicationMethod === "email" && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Application Email *</label>
              <input
                type="email"
                value={applicationEmail}
                onChange={(e) => setApplicationEmail(e.target.value)}
                placeholder="scholarships@org.com"
                className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
              />
            </div>
          )}
        </section>
      </form>
    </SlideOutPanel>
  );
}

export default CreateScholarshipPanel;
