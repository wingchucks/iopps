"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent, Input, Select, Button } from "@/components/ui";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type JobType = "full-time" | "part-time" | "contract" | "internship";
type ApplicationMethod = "url" | "email";

interface JobFormData {
  title: string;
  company: string;
  location: string;
  isRemote: boolean;
  jobType: JobType;
  description: string;
  requirements: string;
  salaryMin: string;
  salaryMax: string;
  applicationMethod: ApplicationMethod;
  applicationValue: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const JOB_TYPE_OPTIONS = [
  { label: "Full-time", value: "full-time" },
  { label: "Part-time", value: "part-time" },
  { label: "Contract", value: "contract" },
  { label: "Internship", value: "internship" },
];

const INITIAL_FORM: JobFormData = {
  title: "",
  company: "",
  location: "",
  isRemote: false,
  jobType: "full-time",
  description: "",
  requirements: "",
  salaryMin: "",
  salaryMax: "",
  applicationMethod: "url",
  applicationValue: "",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NewJobPage() {
  const { userProfile } = useAuth();
  const [form, setForm] = useState<JobFormData>({
    ...INITIAL_FORM,
    company: userProfile?.displayName || "",
  });

  function updateField<K extends keyof JobFormData>(
    key: K,
    value: JobFormData[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // TODO: Submit to API
    alert("TODO: Job posting submission will be connected to the API.");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back link */}
      <Link
        href="/organization/jobs"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
          />
        </svg>
        Back to Jobs
      </Link>

      <h1 className="mb-8 text-2xl font-bold text-text-primary sm:text-3xl">
        Post a New Job
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <Card>
          <CardContent className="space-y-5 p-6">
            <h2 className="text-lg font-semibold text-text-primary">
              Job Details
            </h2>

            <Input
              label="Job Title"
              name="title"
              placeholder="e.g. Software Developer"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              required
            />

            <Input
              label="Company"
              name="company"
              placeholder="Your organization name"
              value={form.company}
              onChange={(e) => updateField("company", e.target.value)}
              required
            />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Input
                  label="Location"
                  name="location"
                  placeholder="e.g. Toronto, ON"
                  value={form.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  required={!form.isRemote}
                />
                <label className="mt-2 flex items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={form.isRemote}
                    onChange={(e) => updateField("isRemote", e.target.checked)}
                    className="h-4 w-4 rounded border-input-border text-accent focus:ring-accent"
                  />
                  Remote position
                </label>
              </div>

              <Select
                label="Job Type"
                name="jobType"
                options={JOB_TYPE_OPTIONS}
                value={form.jobType}
                onChange={(e) =>
                  updateField("jobType", e.target.value as JobType)
                }
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Description & Requirements */}
        <Card>
          <CardContent className="space-y-5 p-6">
            <h2 className="text-lg font-semibold text-text-primary">
              Description
            </h2>

            <div>
              <label
                htmlFor="description"
                className="mb-1.5 block text-sm font-medium text-text-primary"
              >
                Job Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={6}
                placeholder="Describe the role, responsibilities, and what makes this opportunity unique..."
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                className="flex w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-text-primary ring-offset-background placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                required
              />
            </div>

            <div>
              <label
                htmlFor="requirements"
                className="mb-1.5 block text-sm font-medium text-text-primary"
              >
                Requirements
              </label>
              <textarea
                id="requirements"
                name="requirements"
                rows={4}
                placeholder="List the qualifications, skills, and experience required..."
                value={form.requirements}
                onChange={(e) => updateField("requirements", e.target.value)}
                className="flex w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-text-primary ring-offset-background placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Salary */}
        <Card>
          <CardContent className="space-y-5 p-6">
            <h2 className="text-lg font-semibold text-text-primary">
              Compensation
            </h2>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Input
                label="Minimum Salary (CAD)"
                name="salaryMin"
                type="number"
                placeholder="e.g. 50000"
                value={form.salaryMin}
                onChange={(e) => updateField("salaryMin", e.target.value)}
              />
              <Input
                label="Maximum Salary (CAD)"
                name="salaryMax"
                type="number"
                placeholder="e.g. 80000"
                value={form.salaryMax}
                onChange={(e) => updateField("salaryMax", e.target.value)}
              />
            </div>
            <p className="text-xs text-text-muted">
              Salary information is optional but helps attract more qualified
              candidates.
            </p>
          </CardContent>
        </Card>

        {/* Application method */}
        <Card>
          <CardContent className="space-y-5 p-6">
            <h2 className="text-lg font-semibold text-text-primary">
              How to Apply
            </h2>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="radio"
                  name="applicationMethod"
                  value="url"
                  checked={form.applicationMethod === "url"}
                  onChange={() => updateField("applicationMethod", "url")}
                  className="h-4 w-4 border-input-border text-accent focus:ring-accent"
                />
                Application URL
              </label>
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="radio"
                  name="applicationMethod"
                  value="email"
                  checked={form.applicationMethod === "email"}
                  onChange={() => updateField("applicationMethod", "email")}
                  className="h-4 w-4 border-input-border text-accent focus:ring-accent"
                />
                Email Address
              </label>
            </div>

            <Input
              label={
                form.applicationMethod === "url"
                  ? "Application URL"
                  : "Application Email"
              }
              name="applicationValue"
              type={form.applicationMethod === "url" ? "url" : "email"}
              placeholder={
                form.applicationMethod === "url"
                  ? "https://yourcompany.com/apply"
                  : "careers@yourcompany.com"
              }
              value={form.applicationValue}
              onChange={(e) => updateField("applicationValue", e.target.value)}
              required
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            href="/organization/jobs"
            variant="secondary"
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            Post Job
          </Button>
        </div>
      </form>
    </div>
  );
}
