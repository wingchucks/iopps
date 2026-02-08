"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/components/AuthProvider";
import { SlideOutPanel } from "@/components/shared/SlideOutPanel";
import {
  getEmployerProfile,
  createJobPosting,
} from "@/lib/firestore";
import { DatePicker } from "@/components/ui/date-picker";
import toast from "react-hot-toast";

interface CreateJobPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateJobPanel({ isOpen, onClose, onSuccess }: CreateJobPanelProps) {
  const { user } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    location: "",
    employmentType: "Full-time",
    remoteFlag: false,
    description: "",
    responsibilities: "",
    qualifications: "",
    salaryRange: "",
    indigenousPreference: true,
    cpicRequired: false,
    willTrain: false,
    driversLicense: false,
    closingDate: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.title.trim()) errors.title = "Job title is required";
    else if (formData.title.trim().length < 3) errors.title = "Job title must be at least 3 characters";
    if (!formData.location.trim()) errors.location = "Location is required";
    if (!formData.description.trim()) errors.description = "Job description is required";
    else if (formData.description.trim().length < 50)
      errors.description = `Description must be at least 50 characters (currently ${formData.description.trim().length})`;
    if (!formData.closingDate) errors.closingDate = "Closing date is required";
    else {
      const closingDate = new Date(formData.closingDate + "T00:00:00");
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      if (closingDate < tomorrow) errors.closingDate = "Closing date must be at least tomorrow";
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!validateForm()) return;

    setSubmitting(true);
    setError(null);

    try {
      const profile = await getEmployerProfile(user.uid);
      const organizationName = profile?.organizationName || "";
      const employerStatus = profile?.status || "approved";
      const freePostingEnabled = !!profile?.freePostingEnabled;

      const isPendingEmployer = employerStatus === "pending";

      const expires = new Date();
      expires.setDate(expires.getDate() + 30);

      await createJobPosting({
        employerId: user.uid,
        employerName: organizationName,
        title: formData.title,
        location: formData.location,
        employmentType: formData.employmentType,
        remoteFlag: formData.remoteFlag,
        indigenousPreference: formData.indigenousPreference,
        cpicRequired: formData.cpicRequired,
        willTrain: formData.willTrain,
        driversLicense: formData.driversLicense,
        description: formData.description,
        responsibilities: formData.responsibilities.split("\n").filter((r) => r.trim()),
        qualifications: formData.qualifications.split("\n").filter((q) => q.trim()),
        salaryRange: formData.salaryRange,
        closingDate: formData.closingDate,
        quickApplyEnabled: true,
        active: freePostingEnabled ? !isPendingEmployer : false,
        paymentStatus: freePostingEnabled ? "paid" : "pending",
        productType: freePostingEnabled ? "FREE_POSTING" : "SINGLE",
        expiresAt: expires,
        ...(isPendingEmployer && { pendingEmployerApproval: true }),
      });

      // Notify admin
      fetch("/api/admin/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "new_job",
          jobTitle: formData.title,
          employerName: organizationName,
          location: formData.location,
        }),
      }).catch(() => {});

      toast.success("Job posted successfully!");
      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to create job");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      location: "",
      employmentType: "Full-time",
      remoteFlag: false,
      description: "",
      responsibilities: "",
      qualifications: "",
      salaryRange: "",
      indigenousPreference: true,
      cpicRequired: false,
      willTrain: false,
      driversLicense: false,
      closingDate: "",
    });
    setValidationErrors({});
    setError(null);
  };

  const inputClass = (fieldName: string) =>
    `w-full rounded-lg border bg-surface px-4 py-2.5 text-foreground focus:outline-none ${
      validationErrors[fieldName]
        ? "border-red-500 focus:border-red-500"
        : "border-[var(--card-border)] focus:border-accent"
    }`;

  return (
    <SlideOutPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Post a Job"
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
            {submitting ? "Posting..." : "Post Job"}
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

        {/* Core Details */}
        <section className="space-y-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)] border-b border-[var(--card-border)] pb-2">
            Core Details
          </h3>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Job Title *</label>
            <input
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={inputClass("title")}
              placeholder="e.g., Community Coordinator"
            />
            {validationErrors.title && <p className="mt-1 text-sm text-red-400">{validationErrors.title}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Location *</label>
              <input
                name="location"
                value={formData.location}
                onChange={handleChange}
                className={inputClass("location")}
                placeholder="City, Prov"
              />
              {validationErrors.location && <p className="mt-1 text-sm text-red-400">{validationErrors.location}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Employment Type</label>
              <select
                name="employmentType"
                value={formData.employmentType}
                onChange={handleChange}
                className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
              >
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Contract</option>
                <option>Seasonal</option>
                <option>Internship</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Salary Range</label>
              <input
                name="salaryRange"
                value={formData.salaryRange}
                onChange={handleChange}
                className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
                placeholder="e.g., $50k - $70k"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Closing Date *</label>
              <DatePicker
                value={formData.closingDate}
                onChange={(date) => {
                  if (validationErrors.closingDate) {
                    setValidationErrors((prev) => {
                      const updated = { ...prev };
                      delete updated.closingDate;
                      return updated;
                    });
                  }
                  setFormData((prev) => ({ ...prev, closingDate: date }));
                }}
                placeholder="Select closing date"
                minDate={(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d; })()}
                error={!!validationErrors.closingDate}
              />
              {validationErrors.closingDate && <p className="mt-1 text-sm text-red-400">{validationErrors.closingDate}</p>}
            </div>
          </div>
        </section>

        {/* Description */}
        <section className="space-y-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)] border-b border-[var(--card-border)] pb-2">
            Description
          </h3>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Job Description *</label>
            <textarea
              name="description"
              rows={5}
              value={formData.description}
              onChange={handleChange}
              className={inputClass("description")}
              placeholder="Role overview..."
            />
            {validationErrors.description && <p className="mt-1 text-sm text-red-400">{validationErrors.description}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Responsibilities (one per line)
            </label>
            <textarea
              name="responsibilities"
              rows={4}
              value={formData.responsibilities}
              onChange={handleChange}
              className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
              placeholder="Enter each responsibility on a new line"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Qualifications (one per line)
            </label>
            <textarea
              name="qualifications"
              rows={4}
              value={formData.qualifications}
              onChange={handleChange}
              className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
              placeholder="Enter each qualification on a new line"
            />
          </div>
        </section>

        {/* Attributes */}
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-[var(--text-primary)] border-b border-[var(--card-border)] pb-2">
            Job Attributes
          </h3>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="indigenousPreference"
              checked={formData.indigenousPreference}
              onChange={handleChange}
              className="h-5 w-5 rounded border-[var(--card-border)] bg-surface text-accent focus:ring-accent"
            />
            <span className="text-sm text-[var(--text-secondary)]">Indigenous Preference</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="remoteFlag"
              checked={formData.remoteFlag}
              onChange={handleChange}
              className="h-5 w-5 rounded border-[var(--card-border)] bg-surface text-accent focus:ring-accent"
            />
            <span className="text-sm text-[var(--text-secondary)]">Remote / Hybrid Friendly</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="cpicRequired"
              checked={formData.cpicRequired}
              onChange={handleChange}
              className="h-5 w-5 rounded border-[var(--card-border)] bg-surface text-accent focus:ring-accent"
            />
            <div>
              <span className="block text-sm font-medium text-[var(--text-secondary)]">CPIC Required</span>
              <span className="block text-xs text-foreground0">Criminal Record Check</span>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="willTrain"
              checked={formData.willTrain}
              onChange={handleChange}
              className="h-5 w-5 rounded border-[var(--card-border)] bg-surface text-accent focus:ring-accent"
            />
            <div>
              <span className="block text-sm font-medium text-[var(--text-secondary)]">Training Provided</span>
              <span className="block text-xs text-foreground0">Employer will train for role</span>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="driversLicense"
              checked={formData.driversLicense}
              onChange={handleChange}
              className="h-5 w-5 rounded border-[var(--card-border)] bg-surface text-accent focus:ring-accent"
            />
            <span className="text-sm text-[var(--text-secondary)]">Driver&apos;s License Required</span>
          </label>
        </section>

        <p className="text-xs text-foreground0">
          All applications use Quick Apply. Advanced settings (scheduling, TRC alignment, video) can be configured after creation via the full editor.
        </p>
      </form>
    </SlideOutPanel>
  );
}

export default CreateJobPanel;
