"use client";
import ClosingDateField from "@/components/employer/ClosingDateField";
import { isValidClosingDate } from "@/lib/job-closing-date";
import JobLocationFields from "@/components/employer/JobLocationFields";
import HiringDetailsFields from "@/components/employer/HiringDetailsFields";
import { normalizeHiringDetails } from "@/lib/job-hiring-details";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import OrgRoute from "@/components/OrgRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import FeaturedJobControl, { type FeaturedJobSummary } from "@/components/FeaturedJobControl";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";

type PostStatus = "draft" | "active" | "closed";

interface EditableJob {
  publication?: { durationDays?: number };
  id: string;
  title?: string;
  description?: string;
  location?: string | { city?: string; province?: string; remote?: boolean };
  salary?: string | { min?: number | string; max?: number | string; display?: string; currency?: string; period?: string };
  salaryRange?: { min?: number | string; max?: number | string; display?: string; currency?: string; period?: string };
  employmentType?: string;
  jobType?: string;
  qualifications?: string[];
  responsibilities?: string[];
  benefits?: string[];
  badges?: string[];
  closingDate?: string;
  applicationUrl?: string;
  externalApplyUrl?: string;
  status?: PostStatus;
  featured?: boolean;
  hiringDetails?: unknown;
  willTrain?: boolean;
  driversLicense?: boolean;
  requiresResume?: boolean;
  requiresCoverLetter?: boolean;
  requiresReferences?: boolean;
}

const employmentTypes = [
  "Full-time",
  "Part-time",
  "Contract",
  "Temporary",
  "Seasonal",
  "Volunteer",
  "Casual",
  "Internship",
];

function normalizeSalaryParts(job: EditableJob): { min: string; max: string } {
  const salaryValue = job.salaryRange || job.salary;
  if (salaryValue && typeof salaryValue === "object") {
    const min = salaryValue.min == null ? "" : String(salaryValue.min).replace(/[^\d.]/g, "");
    const max = salaryValue.max == null ? "" : String(salaryValue.max).replace(/[^\d.]/g, "");
    if (min || max) return { min, max };
    if (salaryValue.display) return parseSalaryString(String(salaryValue.display));
  }
  return parseSalaryString(typeof job.salary === "string" ? job.salary : "");
}

function parseSalaryString(value: string): { min: string; max: string } {
  const numbers = value.match(/\d[\d,]*(?:\.\d+)?/g) || [];
  return {
    min: numbers[0]?.replace(/,/g, "") || "",
    max: numbers[1]?.replace(/,/g, "") || "",
  };
}

function normalizeLocationParts(location: EditableJob["location"]): { city: string; province: string } {
  if (location && typeof location === "object") {
    return {
      city: typeof location.city === "string" ? location.city : "",
      province: typeof location.province === "string" ? location.province : location.remote ? "Remote" : "",
    };
  }
  const locParts = (location || "").split(",").map((s) => s.trim());
  return { city: locParts[0] || "", province: locParts[1] || "" };
}

export default function JobEditPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const postId = params.id as string;

  const [post, setPost] = useState<EditableJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [locationProvince, setLocationProvince] = useState("");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [salaryPeriod, setSalaryPeriod] = useState("");
  const [requirements, setRequirements] = useState<string[]>([]);
  const [requirementInput, setRequirementInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [hiringDetails, setHiringDetails] = useState(() => normalizeHiringDetails({}));
  const [closingDate, setClosingDate] = useState("");
  const [applicationUrl, setApplicationUrl] = useState("");
  const [documents, setDocuments] = useState({ requiresResume: true, requiresCoverLetter: false, requiresReferences: false });
  const [status, setStatus] = useState<PostStatus>("draft");
  const [featured, setFeatured] = useState(false);
  const [durationDays, setDurationDays] = useState("");
  const [featuredSummary, setFeaturedSummary] = useState<FeaturedJobSummary | null>(null);

  const [isImported, setIsImported] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const idToken = await user.getIdToken();
        const res = await fetch(`/api/employer/jobs/${postId}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.job) {
          router.replace("/org/dashboard");
          return;
        }

        const p = data.job as EditableJob;
        setFeaturedSummary((data.featuredSummary as FeaturedJobSummary | null) ?? null);
        setIsImported(Boolean(data.readOnly));
        setPost(p);
        setTitle(p.title || "");
        setDescription(p.description || "");
        const locationParts = normalizeLocationParts(p.location);
        setLocationCity(locationParts.city);
        setLocationProvince(locationParts.province);
        setEmploymentType(p.employmentType || p.jobType || "Full-time");
        const salaryParts = normalizeSalaryParts(p);
        setSalaryMin(salaryParts.min);
        setSalaryMax(salaryParts.max);
        setSalaryPeriod(p.salaryRange?.period || (typeof p.salary === "object" ? p.salary.period : "") || "");
        setRequirements(p.qualifications || []);
        setSkills(p.badges || []);
        setClosingDate(p.closingDate || "");
        setApplicationUrl(p.applicationUrl || p.externalApplyUrl || "");
        setDocuments({ requiresResume: p.requiresResume === true, requiresCoverLetter: p.requiresCoverLetter === true, requiresReferences: p.requiresReferences === true });
        setHiringDetails(normalizeHiringDetails(p.hiringDetails, p));
        setStatus(p.status || "active");
        setFeatured(Boolean(p.featured));
        setDurationDays(p.publication?.durationDays ? String(p.publication.durationDays) : "");
      } catch (err) {
        console.error("Failed to load employer job:", err);
        router.replace("/org/dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [postId, router, user]);

  const handleSave = async () => {
    if (!user) return;
    if (status === 'active' && featured && !post?.publication && post?.status === 'draft' && (!/^\d+$/.test(durationDays) || Number(durationDays) < 1 || Number(durationDays) > 45)) { showToast("Choose a featured listing duration from 1 to 45 days.", "error"); return; }
    if (!isValidClosingDate(closingDate)) { showToast("Enter a valid closing date or clear it.", "error"); return; }
    if (!title.trim()) {
      showToast("Title is required", "error");
      return;
    }
    setSaving(true);
    try {
      const location = [locationCity, locationProvince]
        .filter(Boolean)
        .join(", ");
      const salaryAmount =
        salaryMin && salaryMax
          ? `$${Number(salaryMin).toLocaleString()} - $${Number(salaryMax).toLocaleString()}`
          : salaryMin
            ? `$${Number(salaryMin).toLocaleString()}`
            : "";
      const salary = salaryAmount ? `${salaryAmount}${salaryPeriod ? ` / ${salaryPeriod.toLowerCase()}` : ""}` : "";
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/employer/jobs/${postId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          location,
          employmentType,
          salary,
          salaryRange: salaryMin || salaryMax ? {
            min: salaryMin ? Number(salaryMin) : undefined,
            max: salaryMax ? Number(salaryMax) : undefined,
            display: salary,
            currency: "CAD",
            period: salaryPeriod,
          } : undefined,
          hiringDetails,
          qualifications: requirements.filter((r) => r.trim()),
          badges: skills,
          closingDate,
          applicationUrl,
          ...documents,
          status,
          featured,
          durationDays: post?.publication ? undefined : featured ? Number(durationDays) : 30,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        showToast(
          typeof result.error === "string" ? result.error : "Failed to save changes",
          "error"
        );
        if (result.featuredSummary) {
          setFeaturedSummary(result.featuredSummary as FeaturedJobSummary);
        }
        return;
      }
      if (result.featuredSummary) {
        setFeaturedSummary(result.featuredSummary as FeaturedJobSummary);
      }
      showToast("Job updated successfully", "success");
    } catch (err) {
      console.error("Failed to update post:", err);
      showToast("Failed to save changes", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUnpublish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/employer/jobs/${postId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "draft", featured }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof result.error === "string" ? result.error : "Failed to unpublish");
      }
      if (result.featuredSummary) {
        setFeaturedSummary(result.featuredSummary as FeaturedJobSummary);
      }
      setStatus("draft");
      showToast("Job unpublished", "info");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to unpublish", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleClosePosition = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const closedOn = new Date().toISOString().split("T")[0];
      const response = await fetch(`/api/employer/jobs/${postId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${await user.getIdToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "closed",
          closingDate: closedOn,
          featured,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof result.error === "string" ? result.error : "Failed to close position");
      }
      if (result.featuredSummary) {
        setFeaturedSummary(result.featuredSummary as FeaturedJobSummary);
      }
      setStatus("closed");
      setClosingDate(closedOn);
      showToast("Position closed", "info");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to close position", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    try {
      const response = await fetch(`/api/employer/jobs/${postId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(typeof result.error === "string" ? result.error : "Failed to delete job");
      }
      showToast("Job deleted", "success");
      router.push("/org/dashboard/jobs");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to delete job", "error");
    }
  };

  const addRequirement = () => {
    const trimmed = requirementInput.trim();
    if (trimmed) {
      setRequirements((prev) => [...prev, trimmed]);
      setRequirementInput("");
    }
  };

  const removeRequirement = (index: number) => {
    setRequirements((prev) => prev.filter((_, i) => i !== index));
  };

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setSkills((prev) => prev.filter((s) => s !== skill));
  };

  const inputStyle = {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    color: "var(--text)",
  };

  return (
    <OrgRoute>
      <AppShell>
      <div className="min-h-screen bg-bg">
        <div className="max-w-[800px] mx-auto px-4 py-8 md:px-10">
          {/* Back link */}
          <Link
            href="/org/dashboard/jobs"
            className="inline-flex items-center gap-1.5 text-sm font-semibold no-underline mb-6 transition-opacity hover:opacity-70"
            style={{ color: "var(--teal)" }}
          >
            &larr; Back to Jobs
          </Link>

          {loading ? (
            <div className="flex flex-col gap-4">
              <div className="h-10 w-64 rounded-xl skeleton" />
              <div className="h-[600px] rounded-2xl skeleton" />
            </div>
          ) : !post ? (
            <Card className="p-8 text-center">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Job posting not found.
              </p>
            </Card>
          ) : (
            <>
              <h1
                className="text-2xl font-bold mb-6"
                style={{ color: "var(--text)" }}
              >
                Edit Job Posting
              </h1>

              {isImported && (
                <div
                  className="rounded-xl px-5 py-4 mb-6 text-sm"
                  style={{
                    background: "rgba(59,130,246,.08)",
                    border: "1px solid rgba(59,130,246,.25)",
                    color: "var(--text-sec)",
                  }}
                >
                  <strong style={{ color: "#3B82F6" }}>Imported Job</strong>
                  <span className="ml-2">
                    This job was originally imported from an external feed. You can close or deactivate it, but some fields may not be editable.
                  </span>
                </div>
              )}

              <Card className="p-6">
                <div className="flex flex-col gap-5">
                  {/* Title */}
                  <div>
                    <label
                      className="block text-sm font-semibold mb-1.5"
                      style={{ color: "var(--text)" }}
                    >
                      Title *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Senior Software Developer"
                      className="w-full px-4 py-3 rounded-xl text-sm"
                      style={inputStyle}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label
                      className="block text-sm font-semibold mb-1.5"
                      style={{ color: "var(--text)" }}
                    >
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the role, team, and expectations..."
                      rows={5}
                      className="w-full px-4 py-3 rounded-xl text-sm resize-y"
                      style={inputStyle}
                    />
                  </div>

                  <JobLocationFields city={locationCity} province={locationProvince} onChange={(city,province)=>{setLocationCity(city);setLocationProvince(province);}} />

                  {/* Employment Type */}
                  <div>
                    <label
                      className="block text-sm font-semibold mb-1.5"
                      style={{ color: "var(--text)" }}
                    >
                      Employment Type
                    </label>
                    <select
                      value={employmentType}
                      onChange={(e) => setEmploymentType(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm cursor-pointer"
                      style={inputStyle}
                    >
                      {employmentTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Salary Range */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        className="block text-sm font-semibold mb-1.5"
                        style={{ color: "var(--text)" }}
                      >
                        Salary Min ($)
                      </label>
                      <input
                        type="number"
                        aria-label="Salary minimum"
                        min="0"
                        step="0.01"
                        value={salaryMin}
                        onChange={(e) => setSalaryMin(e.target.value)}
                        placeholder="e.g. 60000"
                        className="w-full px-4 py-3 rounded-xl text-sm"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label
                        className="block text-sm font-semibold mb-1.5"
                        style={{ color: "var(--text)" }}
                      >
                        Salary Max ($)
                      </label>
                      <input
                        type="number"
                        aria-label="Salary maximum"
                        min="0"
                        step="0.01"
                        value={salaryMax}
                        onChange={(e) => setSalaryMax(e.target.value)}
                        placeholder="e.g. 90000"
                        className="w-full px-4 py-3 rounded-xl text-sm"
                        style={inputStyle}
                      />
                    </div><label className="block text-sm font-semibold mt-3">Pay period<select aria-label="Salary pay period" value={salaryPeriod} onChange={event => setSalaryPeriod(event.target.value)} className="block w-full rounded-lg border border-border bg-card p-3 text-text"><option value="">Not specified</option>{["Hourly", "Annual", "Monthly", "Weekly"].map(period => <option key={period} value={period}>{period}</option>)}</select></label>
                  </div>

                  {/* Requirements */}
                  <div>
                    <label
                      className="block text-sm font-semibold mb-1.5"
                      style={{ color: "var(--text)" }}
                    >
                      Requirements
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={requirementInput}
                        onChange={(e) => setRequirementInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addRequirement();
                          }
                        }}
                        placeholder="Add a requirement..."
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm"
                        style={inputStyle}
                      />
                      <button
                        onClick={addRequirement}
                        className="brand-button px-4 py-2.5 rounded-xl border-none cursor-pointer text-sm font-semibold"
                        style={{
                          background: "var(--button-gradient-soft)",
                          color: "var(--button-gradient-soft-text)",
                        }}
                      >
                        Add
                      </button>
                    </div>
                    {requirements.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        {requirements.map((req, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg"
                            style={{
                              background: "var(--bg)",
                              border: "1px solid var(--border)",
                            }}
                          >
                            <span
                              className="text-sm flex-1"
                              style={{ color: "var(--text)" }}
                            >
                              {req}
                            </span>
                            <button
                              onClick={() => removeRequirement(i)}
                              className="border-none bg-transparent cursor-pointer text-sm font-semibold"
                              style={{ color: "#DC2626" }}
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Skills */}
                  <div>
                    <label
                      className="block text-sm font-semibold mb-1.5"
                      style={{ color: "var(--text)" }}
                    >
                      Skills
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSkill();
                          }
                        }}
                        placeholder="Add a skill..."
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm"
                        style={inputStyle}
                      />
                      <button
                        onClick={addSkill}
                        className="brand-button px-4 py-2.5 rounded-xl border-none cursor-pointer text-sm font-semibold"
                        style={{
                          background: "var(--button-gradient-soft)",
                          color: "var(--button-gradient-soft-text)",
                        }}
                      >
                        Add
                      </button>
                    </div>
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {skills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{
                              background: "rgba(13,148,136,.1)",
                              color: "var(--teal)",
                            }}
                          >
                            {skill}
                            <button
                              onClick={() => removeSkill(skill)}
                              className="border-none bg-transparent cursor-pointer text-xs leading-none p-0"
                              style={{ color: "var(--teal)" }}
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <ClosingDateField value={closingDate} onChange={setClosingDate} />

                  <HiringDetailsFields value={hiringDetails} onChange={setHiringDetails} />
                  {/* Application URL */}
                  <div>
                    <label
                      htmlFor="job-application-url"
                      className="block text-sm font-semibold mb-1.5"
                      style={{ color: "var(--text)" }}
                    >
                      Application URL (external)
                    </label>
                    <input
                      id="job-application-url"
                      type="url"
                      value={applicationUrl}
                      onChange={(e) => setApplicationUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-4 py-3 rounded-xl text-sm"
                      style={inputStyle}
                    />
                    <p className="text-sm mt-2" style={{ color: "var(--text-sec)" }}>Leave blank to accept applications on IOPPS.</p>
                  </div>

                  <fieldset className="space-y-2" disabled={isImported}>
                    <legend className="text-sm font-semibold mb-2">Required application documents</legend>
                    <p className="text-sm" style={{ color: "var(--text-sec)" }}>Choose what applicants must include when applying on IOPPS.</p>
                    {([
                      ["requiresResume", "Resume / CV"],
                      ["requiresCoverLetter", "Cover letter"],
                      ["requiresReferences", "References"],
                    ] as const).map(([key, label]) => <label key={key} className="flex min-h-11 items-center gap-3 text-sm cursor-pointer">
                      <input type="checkbox" checked={documents[key]} className="h-4 w-4 accent-teal-600"
                        onChange={event => setDocuments(current => ({ ...current, [key]: event.target.checked }))} />
                      {label}
                    </label>)}
                  </fieldset>

                  <FeaturedJobControl
                    summary={featuredSummary}
                    checked={featured}
                    onChange={setFeatured}
                    disabled={isImported}
                    returnTo={`/org/dashboard/jobs/${encodeURIComponent(postId)}/edit`}
                  />
                  {featured && !post?.publication && post?.status === 'draft' ? <label htmlFor="featured-duration">Featured listing duration (days, up to 45)
                    <input id="featured-duration" type="number" min={1} max={45} step={1} value={durationDays} onChange={event => setDurationDays(event.target.value)} disabled={isImported} className="w-full rounded-xl border p-3" />
                  </label> : <p className="text-sm text-text-muted">{post?.publication ? `Purchased listing duration: ${post.publication.durationDays} days. Editing does not extend the expiry.` : 'Standard listings run for 30 days. Publishing requires a paid credit or annual-plan allowance.'}</p>}

                  {/* Status */}
                  <div>
                    <label
                      className="block text-sm font-semibold mb-2"
                      style={{ color: "var(--text)" }}
                    >
                      Status
                    </label>
                    <div className="flex gap-4">
                      {(["draft", "active", "closed"] as PostStatus[]).map(
                        (s) => (
                          <label
                            key={s}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="radio"
                              name="status"
                              value={s}
                              checked={status === s}
                              onChange={() => setStatus(s)}
                              className="accent-teal-600"
                            />
                            <span
                              className="text-sm font-medium capitalize"
                              style={{ color: "var(--text)" }}
                            >
                              {s}
                            </span>
                          </label>
                        )
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                    <Button
                      primary
                      onClick={handleSave}
                      className={saving || isImported ? "opacity-50 pointer-events-none" : ""}
                    >
                      {isImported ? "Read Only" : saving ? "Saving..." : "Save Changes"}
                    </Button>
                    {status !== "draft" && (
                      <Button
                        onClick={handleUnpublish}
                        className={saving || isImported ? "opacity-50 pointer-events-none" : ""}
                      >
                        Unpublish
                      </Button>
                    )}
                    {status !== "closed" && (
                      <Button
                        onClick={handleClosePosition}
                        className={saving || isImported ? "opacity-50 pointer-events-none" : ""}
                      >
                        Close Position
                      </Button>
                    )}
                    <button
                      onClick={() => {
                        if (!isImported) setShowDeleteConfirm(true);
                      }}
                      className="px-6 py-3 rounded-xl border-none cursor-pointer text-sm font-semibold transition-opacity hover:opacity-80"
                      style={{
                        background: isImported ? "rgba(148,163,184,.14)" : "rgba(220,38,38,.1)",
                        color: isImported ? "var(--text-muted)" : "#DC2626",
                        opacity: isImported ? 0.65 : 1,
                        cursor: isImported ? "not-allowed" : "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </Card>

              {/* Delete confirmation dialog */}
              {showDeleteConfirm && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4"
                  style={{ background: "rgba(0,0,0,.5)" }}
                >
                  <Card className="p-6 max-w-sm w-full">
                    <h3
                      className="text-lg font-bold mb-2"
                      style={{ color: "var(--text)" }}
                    >
                      Delete Job Posting?
                    </h3>
                    <p
                      className="text-sm mb-5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      This action cannot be undone. The job posting &quot;{title}&quot; will
                      be permanently removed.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleDelete}
                        className="flex-1 py-2.5 rounded-xl border-none cursor-pointer text-sm font-semibold text-white"
                        style={{ background: "#DC2626" }}
                      >
                        Yes, Delete
                      </button>
                      <Button onClick={() => setShowDeleteConfirm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
    </OrgRoute>
  );
}
