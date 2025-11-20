"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { createJobPosting, getEmployerProfile } from "@/lib/firestore";

const employmentTypes = [
  "Full-time",
  "Part-time",
  "Contract",
  "Seasonal",
  "Internship",
];

export default function NewJobPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [remoteFlag, setRemoteFlag] = useState(false);
  const [indigenousPreference, setIndigenousPreference] = useState(true);
  const [salaryRange, setSalaryRange] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [description, setDescription] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [applicationLink, setApplicationLink] = useState("");
  const [applicationEmail, setApplicationEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || role !== "employer") return;
    (async () => {
      const profile = await getEmployerProfile(user.uid);
      if (profile) {
        setOrganizationName(profile.organizationName);
      } else {
        setOrganizationName("");
      }
    })();
  }, [user, role]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);

    try {
      const jobId = await createJobPosting({
        employerId: user.uid,
        employerName: organizationName ?? "",
        title,
        location,
        employmentType,
        remoteFlag,
        indigenousPreference,
        salaryRange,
        closingDate,
        description,
        responsibilities: responsibilities
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        qualifications: qualifications
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        applicationLink,
        applicationEmail,
      });
      router.push(`/jobs/${jobId}`);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Could not create job posting."
      );
    } finally {
      setSaving(false);
    }
  };

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
          Sign in as an employer to post opportunities.
        </p>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-md bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-teal-400"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-teal-400 hover:text-teal-300"
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
        <h1 className="text-2xl font-semibold tracking-tight">
          Employer access required
        </h1>
        <p className="text-sm text-slate-300">
          Switch to an employer account to post jobs.
        </p>
      </div>
    );
  }

  if (organizationName === "") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Finish setting up your organization
        </h1>
        <p className="text-sm text-slate-300">
          Please set up your employer profile before posting jobs.
        </p>
        <Link
          href="/employer/setup"
          className="inline-flex rounded-md bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-teal-400"
        >
          Go to employer setup
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Post a new job</h1>
      <p className="mt-2 text-sm text-slate-300">
        Job listings instantly appear on the public jobs page. The future mobile
        app will use the same Firestore data so every posting reaches more
        community members.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Job title
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Location
          </label>
          <input
            type="text"
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-200">
              Employment type
            </label>
            <select
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            >
              {employmentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-200">
              Salary range (optional)
            </label>
            <input
              type="text"
              value={salaryRange}
              onChange={(e) => setSalaryRange(e.target.value)}
              placeholder="$65,000 - $78,000"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="inline-flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={remoteFlag}
              onChange={(e) => setRemoteFlag(e.target.checked)}
            />
            Remote / hybrid friendly
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={indigenousPreference}
              onChange={(e) => setIndigenousPreference(e.target.checked)}
            />
            Indigenous preference / targeted hiring
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200">
            Closing date (optional)
          </label>
          <input
            type="date"
            value={closingDate}
            onChange={(e) => setClosingDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200">
            Job description
          </label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-200">
              Responsibilities (one per line)
            </label>
            <textarea
              value={responsibilities}
              onChange={(e) => setResponsibilities(e.target.value)}
              rows={5}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-200">
              Qualifications (one per line)
            </label>
            <textarea
              value={qualifications}
              onChange={(e) => setQualifications(e.target.value)}
              rows={5}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200">
            Application link (URL)
          </label>
          <input
            type="url"
            value={applicationLink}
            onChange={(e) => setApplicationLink(e.target.value)}
            placeholder="https://example.com/apply"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Application email (optional)
          </label>
          <input
            type="email"
            value={applicationEmail}
            onChange={(e) => setApplicationEmail(e.target.value)}
            placeholder="talent@organization.ca"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-400">
            Provide at least one of link or email so community members can apply.
          </p>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-teal-400 disabled:opacity-60"
        >
          {saving ? "Posting..." : "Publish job"}
        </button>
      </form>
    </div>
  );
}
