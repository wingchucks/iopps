"use client";
import ClosingDateField from "@/components/employer/ClosingDateField";
import { isValidClosingDate } from "@/lib/job-closing-date";
import JobLocationFields, { formatJobLocation } from "@/components/employer/JobLocationFields";

import HiringDetailsFields from "@/components/employer/HiringDetailsFields";
import HiringDetailsSummary from "@/components/employer/HiringDetailsSummary";
import { normalizeHiringDetails, type HiringDetails } from "@/lib/job-hiring-details";
import { confirmSavedJob, type JobSaveConfirmation } from "@/lib/job-save-confirmation";
import { createContext, useContext, useId, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import OrgRoute from "@/components/OrgRoute";
import AppShell from "@/components/AppShell";
import FeaturedJobControl, { type FeaturedJobSummary } from "@/components/FeaturedJobControl";
import { describePublishing, type PublishingSummary } from "@/lib/job-publishing-summary";
import {
  JOB_WIZARD_RESUME_PARAM,
  clearJobWizardSnapshot,
  draftPurchaseHref,
  isDraftId,
  jobWizardResumePath,
  readJobWizardSnapshot,
  saveJobWizardSnapshot,
  savedDraftEditPath,
  sessionStorageOrNull,
  type DraftPurchase,
} from "@/lib/job-wizard-resume";
import { useAuth } from "@/lib/auth-context";
import type { MemberProfile } from "@/lib/firestore/members";
import type { Organization } from "@/lib/firestore/organizations";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const JOB_CATEGORIES = [
  "Administration", "Agriculture", "Arts & Culture", "Business",
  "Construction & Trades", "Education", "Environment & Land",
  "Finance", "Government & Public Service", "Health & Wellness",
  "Hospitality & Tourism", "Human Resources", "Information Technology",
  "Legal", "Management", "Marketing & Communications",
  "Natural Resources", "Social Services", "Transportation", "Other",
];

const COMMUNITY_TAGS = [
  "Treaty 6", "Treaty 4", "Treaty 7", "Cree", "Métis", "Dene",
  "Ojibwe", "Inuit", "Blackfoot",
];

const PREFERENCE_LEVELS = [
  { value: "", label: "Select preference level..." },
  { value: "open", label: "Open to All" },
  { value: "preferred", label: "Indigenous Preferred" },
  { value: "strongly-preferred", label: "Strongly Preferred" },
  { value: "psea-s22", label: "Public-service employment policy (PSEA s.22)" },
];

const STEP_LABELS = ["Job Details", "Requirements", "Review & Publish"];

/* ------------------------------------------------------------------ */
/*  Form state type                                                    */
/* ------------------------------------------------------------------ */

interface FormState {
  title: string;
  department: string;
  category: string;
  employmentType: string;
  workLocation: string;
  location: string;
  locationCity: string;
  locationProvince: string;
  salaryMin: string;
  salaryMax: string;
  salaryPeriod: string;
  closingDate: string;
  externalApplyUrl: string;
  description: string;
  responsibilities: string[];
  qualifications: string[];
  benefits: string[];
  indigenousPreferenceLevel: string;
  communityTags: string[];
  hiringDetails: HiringDetails;
  featured: boolean;
  durationDays: string;
  requiresResume: boolean;
  requiresCoverLetter: boolean;
  requiresReferences: boolean;
}

const emptyForm: FormState = {
  title: "",
  department: "",
  category: "",
  employmentType: "",
  workLocation: "",
  location: "",
  locationCity: "",
  locationProvince: "",
  salaryMin: "",
  salaryMax: "",
  salaryPeriod: "Annual",
  closingDate: "",
  externalApplyUrl: "",
  description: "",
  responsibilities: [],
  qualifications: [],
  benefits: [],
  indigenousPreferenceLevel: "",
  communityTags: [],
  hiringDetails: normalizeHiringDetails({}),
  featured: false,
  durationDays: "",
  requiresResume: true,
  requiresCoverLetter: false,
  requiresReferences: false,
};

/* ------------------------------------------------------------------ */
/*  Helper: build salary display string                                */
/* ------------------------------------------------------------------ */

function formatSalary(min: string, max: string, period: string): string {
  const lo = min ? Number(min) : 0;
  const hi = max ? Number(max) : 0;
  if (!lo && !hi) return "";
  const fmt = (n: number) =>
    n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
  if (lo && hi) return `${fmt(lo)} – ${fmt(hi)} / ${period}`;
  if (lo) return `${fmt(lo)}+ / ${period}`;
  return `Up to ${fmt(hi)} / ${period}`;
}

/** Request body shared by create (POST) and update of a saved draft (PUT). */
function buildJobRequest(form: FormState, status: "active" | "draft", slug?: string) {
  return {
    title: form.title,
    ...(slug ? { slug } : {}),
    department: form.department || undefined,
    category: form.category,
    employmentType: form.employmentType,
    workLocation: form.workLocation,
    location: form.location,
    salary: formatSalary(form.salaryMin, form.salaryMax, form.salaryPeriod),
    salaryRange: {
      min: form.salaryMin ? Number(form.salaryMin) : undefined,
      max: form.salaryMax ? Number(form.salaryMax) : undefined,
      period: form.salaryPeriod,
      currency: "CAD",
    },
    closingDate: form.closingDate || undefined,
    externalApplyUrl: form.externalApplyUrl || undefined,
    description: form.description,
    responsibilities: form.responsibilities,
    qualifications: form.qualifications,
    benefits: form.benefits,
    indigenousPreference: form.indigenousPreferenceLevel !== "" && form.indigenousPreferenceLevel !== "open",
    indigenousPreferenceLevel: form.indigenousPreferenceLevel || undefined,
    communityTags: form.communityTags,
    hiringDetails: normalizeHiringDetails(form.hiringDetails),
    willTrain: form.hiringDetails.willTrain,
    driversLicense: form.hiringDetails.driversLicense,
    featured: form.featured,
    durationDays: form.featured ? Number(form.durationDays) : 30,
    requiresResume: form.requiresResume,
    requiresCoverLetter: form.requiresCoverLetter,
    requiresReferences: form.requiresReferences,
    status,
  };
}

function newJobSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36);
}

/* ------------------------------------------------------------------ */
/*  Micro-components (local to wizard)                                 */
/* ------------------------------------------------------------------ */

function ProgressBar({ step }: { step: number }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 32 }}>
      {STEP_LABELS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <div key={label} style={{ display: "flex", justifyContent: "center", flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 0 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  background: done
                    ? "var(--teal)"
                    : active
                      ? "var(--navy)"
                      : "var(--border)",
                  color: done || active ? "#fff" : "var(--text-muted)",
                  transition: "all .2s",
                }}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  color: active ? "var(--text)" : "var(--text-muted)",
                  whiteSpace: "normal",
                  textAlign: "center",
                  overflowWrap: "anywhere",
                }}
              >
                {label}
              </span>
            </div>

          </div>
        );
      })}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: "var(--text)",
          }}
        >
          {title}
        </h2>
      </div>
      {subtitle && (
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "var(--text-muted)",
            paddingLeft: 28,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

// The control inside a FormField takes its label, required state, hint and error from here,
// so assistive technology announces them together.
const FieldContext = createContext<{ id?: string; describedBy?: string; invalid?: boolean; required?: boolean }>({});

const fieldLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
  color: "var(--text)",
};

function RequiredMark() {
  return <><span aria-hidden="true" style={{ color: "var(--teal)", marginLeft: 3 }}>*</span><span className="sr-only"> (required)</span></>;
}

function FormField({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div style={{ marginBottom: 16 }}>
      <label htmlFor={id} style={fieldLabelStyle}>
        {label}
        {required && <RequiredMark />}
      </label>
      <FieldContext.Provider value={{ id, describedBy, invalid: Boolean(error), required }}>{children}</FieldContext.Provider>
      {hint && !error && (
        <p id={`${id}-hint`} style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} style={{ margin: "4px 0 0", fontSize: 12, color: "#DC2626" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function useFieldProps() {
  const field = useContext(FieldContext);
  return { id: field.id, "aria-describedby": field.describedBy, "aria-invalid": field.invalid || undefined, "aria-required": field.required || undefined };
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  const field = useFieldProps();
  return (
    <input
      {...field}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={inputStyle}
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const field = useFieldProps();
  return (
    <textarea
      {...field}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{ ...inputStyle, resize: "vertical" }}
    />
  );
}

function Select({
  value,
  onChange,
  children,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  /** Accessible name when the select is not inside a FormField. */
  label?: string;
}) {
  const field = useFieldProps();
  return (
    <div style={{ position: "relative" }}>
      <select
        {...field}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...inputStyle,
          appearance: "none",
          paddingRight: 32,
          cursor: "pointer",
        }}
      >
        {children}
      </select>
      <span
        style={{
          position: "absolute",
          right: 12,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: "var(--text-muted)",
          fontSize: 12,
        }}
      >
        ▾
      </span>
    </div>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 2, width: 16, height: 16, accentColor: "var(--teal)" }}
      />
      <div>
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
          {label}
        </span>
        {description && (
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
            {description}
          </p>
        )}
      </div>
    </label>
  );
}

function ChipSelect({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (tags: string[]) => void;
}) {
  const toggle = (tag: string) => {
    onChange(
      selected.includes(tag)
        ? selected.filter((t) => t !== tag)
        : [...selected, tag]
    );
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((tag) => {
        const active = selected.includes(tag);
        return (
          <button className="brand-button"
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              border: active ? "1.5px solid var(--teal)" : "1px solid var(--border)",
              background: active ? "var(--button-gradient)" : "var(--button-gradient-soft)",
              color: active ? "#fff" : "var(--button-gradient-soft-text)",
              fontSize: 13,
              fontWeight: active ? 600 : 500,
              cursor: "pointer",
              transition: "all .15s",
            }}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}

function ListBuilder({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const id = useId();

  const add = () => {
    const val = draft.trim();
    if (!val) return;
    onChange([...items, val]);
    setDraft("");
  };

  return (
    <div style={{ marginBottom: 16 }} role="group" aria-labelledby={`${id}-label`}>
      <label id={`${id}-label`} htmlFor={id} style={fieldLabelStyle}>
        {label}
      </label>
      <p id={`${id}-help`} className="sr-only">Type one item and press Enter or choose Add. {items.length} added so far.</p>
      {items.length > 0 && (
        <ul
          style={{
            margin: "0 0 8px",
            padding: 0,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {items.map((item, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 8,
                background: "var(--bg)",
                border: "1px solid var(--border)",
                fontSize: 14,
                color: "var(--text)",
              }}
            >
              <span style={{ flex: 1 }}>{item}</span>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#DC2626",
                  fontSize: 16,
                  lineHeight: 1,
                  padding: "0 4px",
                }}
                aria-label={`Remove ${item}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          id={id}
          aria-describedby={`${id}-help`}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder || `Add a ${label.toLowerCase().replace(/ies$/, "y").replace(/s$/, "")}...`}
          style={{ ...inputStyle, flex: 1 }}
        />
        <button className="brand-button"
          type="button"
          onClick={add}
          style={{
            padding: "8px 16px",
            borderRadius: 10,
            border: "none",
            background: "var(--button-gradient-soft)",
            color: "var(--button-gradient-soft-text)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          + Add<span className="sr-only"> to {label}</span>
        </button>
      </div>
    </div>
  );
}

function InfoTip({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: 10,
        background: "rgba(13,148,136,.06)",
        border: "1px solid rgba(13,148,136,.15)",
        fontSize: 13,
        lineHeight: 1.5,
        color: "var(--text-sec)",
        marginBottom: 16,
      }}
    >
      <span style={{ marginRight: 6 }}>💡</span>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Completeness checklist for Step 2                                  */
/* ------------------------------------------------------------------ */

function getChecklist(form: FormState) {
  return [
    { label: "Job title", ok: !!form.title.trim() },
    { label: "Location", ok: !!form.location.trim() },
    { label: "Employment type", ok: !!form.employmentType },
    { label: "Description", ok: !!form.description.trim() },
    { label: "Salary range", ok: !!(form.salaryMin || form.salaryMax) },
    { label: "Indigenous preference", ok: !!form.indigenousPreferenceLevel },
    { label: "Community tags", ok: form.communityTags.length > 0 },
  ];
}

/* ------------------------------------------------------------------ */
/*  Main wizard component                                              */
/* ------------------------------------------------------------------ */

type WizardStep = 0 | 1 | 2 | "success";

export default function NewJobWizardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [step, setStep] = useState<WizardStep>(0);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [featuredSummary, setFeaturedSummary] = useState<FeaturedJobSummary | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [confirmation, setConfirmation] = useState<JobSaveConfirmation | null>(null);
  // Server draft this wizard saved (before checkout); later saves update it instead of creating a new job.
  const [draftId, setDraftId] = useState<string | null>(null);
  const [publishingSummary, setPublishingSummary] = useState<PublishingSummary | null>(null);
  const [resumeNotice, setResumeNotice] = useState("");
  const [checkingSummary, setCheckingSummary] = useState(false);

  const loadDashboard = async () => {
    if (!user) return null;
    const idToken = await user.getIdToken();
    const res = await fetch("/api/employer/dashboard", {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    setFeaturedSummary((data.featuredSummary as FeaturedJobSummary | null) ?? null);
    setPublishingSummary((data.publishingSummary as PublishingSummary | null) ?? null);
    return data;
  };

  // Load org & profile, then resume a draft saved before checkout (Back, cancel or payment return).
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const data = await loadDashboard();
        if (data) {
          setProfile(data.profile as MemberProfile);
          setOrg(data.org as Organization);
          const resumeId = new URLSearchParams(window.location.search).get(JOB_WIZARD_RESUME_PARAM);
          if (isDraftId(resumeId)) {
            const snapshot = readJobWizardSnapshot<FormState>(sessionStorageOrNull(), user.uid, resumeId);
            if (!snapshot) {
              // Another tab or device: the saved server draft is the source of truth.
              router.replace(savedDraftEditPath(resumeId));
              return;
            }
            setForm({ ...emptyForm, ...snapshot.form, hiringDetails: normalizeHiringDetails(snapshot.form.hiringDetails ?? {}) });
            setStep(snapshot.step);
            setDraftId(resumeId);
            setResumeNotice("Your job is saved as a draft. You're back where you left off.");
          }
          setLoading(false);
          return;
        }
        setLoadError("Your organization couldn’t be loaded. Please reload before posting a job.");
      } catch {
        setLoadError("Your organization couldn’t be loaded. Check your connection and reload.");
      }
      setLoading(false);
    })();
    // loadDashboard only depends on user; running once per signed-in user is intended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const checkSummaryAgain = async () => {
    setCheckingSummary(true);
    try {
      await loadDashboard();
    } finally {
      setCheckingSummary(false);
    }
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  /* ---- Validation ---- */
  const validateStep0 = (): boolean => {
    const e: Record<string, string> = {};
    if (!isValidClosingDate(form.closingDate)) e.closingDate = "Enter a valid closing date or clear it";
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.category) e.category = "Category is required";
    if (!form.locationProvince) e.location = "Select a province, territory, or multiple-province option";
    if (form.salaryMin && form.salaryMax && Number(form.salaryMin) > Number(form.salaryMax)) e.salary = "The minimum salary can’t be more than the maximum.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep1 = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.description.trim()) e.description = "Description is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    if ((step === 0 && !validateStep0()) || (step === 1 && !validateStep1())) {
      // Take keyboard and screen-reader users straight to the first field that needs attention.
      window.requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setErrors({});
    setStep((s) => (typeof s === "number" ? ((s + 1) as WizardStep) : s));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setErrors({});
    setStep((s) => (typeof s === "number" && s > 0 ? ((s - 1) as WizardStep) : s));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ---- Save ---- */
  const handleSave = async (status: "active" | "draft") => {
    if (status === 'active' && form.featured && (!/^\d+$/.test(form.durationDays) || Number(form.durationDays) < 1 || Number(form.durationDays) > 45)) { setSubmitError("Choose a featured listing duration from 1 to 45 days."); return; }
    if (!isValidClosingDate(form.closingDate)) { setSubmitError("Enter a valid closing date or clear it."); return; }
    if (!profile?.orgId || !user) { setSubmitError("Your organization session isn’t ready. Please reload and try again."); return; }
    setSubmitError("");
    setSaving(true);
    try {
      const idToken = await user.getIdToken();
      const { response, result } = await sendJob(status, idToken);
      if (!response.ok) {
        setSubmitError(
          typeof result.error === "string" ? result.error : "Failed to create job. Please try again."
        );
        if (result.featuredSummary) {
          setFeaturedSummary(result.featuredSummary as FeaturedJobSummary);
        }
        return;
      }

      if (result.featuredSummary) {
        setFeaturedSummary(result.featuredSummary as FeaturedJobSummary);
      }

      clearJobWizardSnapshot(sessionStorageOrNull(), user.uid);
      window.history.replaceState(null, "", "/org/dashboard/jobs/new");
      setResumeNotice("");
      const savedJobId = typeof result.jobId === "string" ? result.jobId : draftId ?? "";
      setConfirmation(await confirmSavedJob(savedJobId, (url) => fetch(url, { headers: { Authorization: `Bearer ${idToken}` } })));
      setStep("success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Failed to create job:", err);
      setSubmitError("Failed to create job. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  /** Creates the job, or updates the draft this wizard already saved. */
  const sendJob = async (status: "active" | "draft", idToken: string) => {
    const response = await fetch(draftId ? `/api/employer/jobs/${encodeURIComponent(draftId)}` : "/api/employer/jobs", {
      method: draftId ? "PUT" : "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildJobRequest(form, status, draftId ? undefined : newJobSlug(form.title))),
    });
    const result = await response.json().catch(() => ({}));
    return { response, result: result as Record<string, unknown> };
  };

  /** Saves the job as a draft before leaving for checkout or plans, so every return path resumes it. */
  const leaveForPurchase = async (purchase: DraftPurchase) => {
    if (!profile?.orgId || !user) { setSubmitError("Your organization session isn’t ready. Please reload and try again."); return; }
    if (!form.title.trim()) {
      setStep(0);
      setErrors({ title: "Add a job title so your draft can be saved before checkout" });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!isValidClosingDate(form.closingDate)) { setSubmitError("Enter a valid closing date or clear it before checkout."); return; }
    setSubmitError("");
    setSaving(true);
    try {
      const idToken = await user.getIdToken();
      const { response, result } = await sendJob("draft", idToken);
      const savedId = draftId ?? result.jobId;
      if (!response.ok || !isDraftId(savedId)) {
        setSubmitError(typeof result.error === "string" ? `${result.error} Checkout was not opened.` : "Your draft couldn’t be saved, so checkout was not opened. Please try again.");
        return;
      }
      setDraftId(savedId);
      saveJobWizardSnapshot(sessionStorageOrNull(), user.uid, { draftId: savedId, step: typeof step === "number" ? step : 2, form, savedAt: Date.now() });
      // Browser Back from checkout now lands on this saved draft instead of an empty wizard.
      window.history.replaceState(null, "", jobWizardResumePath(savedId));
      router.push(draftPurchaseHref(purchase, savedId));
    } catch (err) {
      console.error("Failed to save draft before checkout:", err);
      setSubmitError("Your draft couldn’t be saved, so checkout was not opened. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const publishing = describePublishing(publishingSummary, form.featured);

  /* ---- Render ---- */
  const cardStyle: React.CSSProperties = {
    background: "var(--card)",
    borderRadius: 16,
    border: "1px solid var(--border)",
    padding: 32,
  };

  return (
    <OrgRoute>
      <AppShell>
        <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
          <div
            style={{
              maxWidth: 720,
              margin: "0 auto",
              padding: "32px 16px 64px",
            }}
          >
            {loadError ? <div role="alert" className="employer-panel"><h1>Unable to open job posting</h1><p>{loadError}</p><button onClick={() => window.location.reload()} className="employer-primary mt-4">Reload</button></div> : loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="skeleton" style={{ height: 32, width: 240, borderRadius: 10 }} />
                <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />
              </div>
            ) : step === "success" ? (
              /* ============ SUCCESS SCREEN ============ */
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: "rgba(13,148,136,.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 24px",
                    fontSize: 36,
                  }}
                >
                  ✓
                </div>
                <h1
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: "var(--text)",
                    margin: "0 0 8px",
                  }}
                >
                  {confirmation?.title}
                </h1>
                <p
                  style={{
                    fontSize: 15,
                    color: "var(--text-muted)",
                    margin: "0 0 32px",
                    maxWidth: 440,
                    marginLeft: "auto",
                    marginRight: "auto",
                    lineHeight: 1.6,
                  }}
                >
                  {confirmation?.description}
                </p>

                <div
                  style={{
                    ...cardStyle,
                    textAlign: "left",
                    maxWidth: 480,
                    margin: "0 auto 32px",
                  }}
                >
                  <h3
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "var(--text)",
                      margin: "0 0 12px",
                    }}
                  >
                    What happens next
                  </h3>
                  <ul
                    style={{
                      margin: 0,
                      padding: "0 0 0 20px",
                      fontSize: 14,
                      lineHeight: 1.8,
                      color: "var(--text-sec)",
                    }}
                  >
                    <li>Review the saved posting and its status in your dashboard</li>
                    <li>Drafts stay private until published</li>
                  </ul>
                </div>

                <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                  <button className="brand-button"
                    onClick={() => {
                      setForm(emptyForm);
                      setStep(0);
                      setErrors({});
                      // A new posting must never update the job just saved.
                      setDraftId(null);
                      void loadDashboard().catch(() => {});
                    }}
                    style={{
                      padding: "12px 24px",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: "var(--button-gradient-soft)",
                      color: "var(--button-gradient-soft-text)",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Post Another Job
                  </button>
                  <button className="brand-button"
                    onClick={() => router.push("/org/dashboard")}
                    style={{
                      padding: "12px 24px",
                      borderRadius: 10,
                      border: "none",
                      background: "var(--button-gradient)",
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            ) : (
              /* ============ WIZARD STEPS ============ */
              <>
                {/* Page header */}
                <div style={{ marginBottom: 24 }}>
                  <button
                    onClick={() => router.push("/org/dashboard")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--teal)",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    ← Back to Dashboard
                  </button>
                  <h1
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: "var(--text)",
                      margin: 0,
                    }}
                  >
                    Post a New Job
                  </h1>
                  <p
                    style={{
                      fontSize: 14,
                      color: "var(--text-muted)",
                      margin: "4px 0 0",
                    }}
                  >
                    {org?.name ? `Posting as ${org.name}` : "Create a job listing"}
                  </p>
                </div>

                <ProgressBar step={typeof step === "number" ? step : 0} />

                {resumeNotice && (
                  <div
                    role="status"
                    style={{
                      marginBottom: 18,
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(13,148,136,.3)",
                      background: "rgba(13,148,136,.08)",
                      color: "var(--text)",
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    {resumeNotice}
                  </div>
                )}

                {/* ============ STEP 0: JOB DETAILS ============ */}
                {step === 0 && (
                  <div style={cardStyle}>
                    <SectionHeader
                      icon="📋"
                      title="Job Details"
                      subtitle="Basic information about the position"
                    />

                    <FormField label="Job Title" required error={errors.title}>
                      <TextInput
                        value={form.title}
                        onChange={(v) => set("title", v)}
                        placeholder="e.g. Senior Software Developer"
                      />
                    </FormField>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <FormField label="Department">
                        <TextInput
                          value={form.department}
                          onChange={(v) => set("department", v)}
                          placeholder="e.g. Engineering"
                        />
                      </FormField>
                      <FormField label="Category" required error={errors.category}>
                        <Select
                          value={form.category}
                          onChange={(v) => set("category", v)}
                        >
                          <option value="">Select category...</option>
                          {JOB_CATEGORIES.map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </Select>
                      </FormField>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <FormField label="Employment Type">
                        <Select
                          value={form.employmentType}
                          onChange={(v) => set("employmentType", v)}
                        >
                          <option value="">Select type...</option>
                          <option>Full-time</option>
                          <option>Part-time</option>
                          <option>Contract</option>
                          <option>Casual</option>
                          <option>Temporary</option>
                          <option>Seasonal</option>
                          <option>Internship</option>
                          <option>Volunteer</option>
                        </Select>
                      </FormField>
                      <FormField label="Work Location">
                        <Select
                          value={form.workLocation}
                          onChange={(v) => set("workLocation", v)}
                        >
                          <option value="">Select...</option>
                          <option>On-site</option>
                          <option>Hybrid</option>
                          <option>Remote</option>
                        </Select>
                      </FormField>
                    </div>

                    <JobLocationFields required city={form.locationCity} province={form.locationProvince} onChange={(city,province)=>setForm(prev=>({...prev,locationCity:city,locationProvince:province,location:formatJobLocation(city,province)}))} />
                    {errors.location && <p role="alert" className="text-red-500 text-sm mb-4">{errors.location}</p>}

                    {/* Salary */}
                    <fieldset style={{ marginBottom: 16, border: "none", padding: 0, minWidth: 0 }} aria-describedby="salary-range-help">
                      <legend style={{ ...fieldLabelStyle, padding: 0 }}>
                        Salary Range
                      </legend>
                      <p id="salary-range-help" style={{ margin: "0 0 6px", fontSize: 12, color: "var(--text-muted)" }}>Optional. Amounts in Canadian dollars (CAD) for the pay period you choose.</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 140px", gap: 8 }}>
                        <input
                          type="number"
                          min={0}
                          value={form.salaryMin}
                          onChange={(e) => set("salaryMin", e.target.value)}
                          placeholder="Min"
                          aria-label="Minimum salary (CAD)"
                          aria-invalid={errors.salary ? true : undefined}
                          aria-describedby={errors.salary ? "salary-range-error" : undefined}
                          style={inputStyle}
                        />
                        <input
                          type="number"
                          min={0}
                          value={form.salaryMax}
                          onChange={(e) => set("salaryMax", e.target.value)}
                          placeholder="Max"
                          aria-label="Maximum salary (CAD)"
                          aria-invalid={errors.salary ? true : undefined}
                          aria-describedby={errors.salary ? "salary-range-error" : undefined}
                          style={inputStyle}
                        />
                        <Select
                          value={form.salaryPeriod}
                          onChange={(v) => set("salaryPeriod", v)}
                          label="Pay period"
                        >
                          <option>Annual</option>
                          <option>Monthly</option>
                          <option>Hourly</option>
                          <option>Contract</option>
                        </Select>
                      </div>
                      {errors.salary && <p id="salary-range-error" role="alert" style={{ margin: "4px 0 0", fontSize: 12, color: "#DC2626" }}>{errors.salary}</p>}
                    </fieldset>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <ClosingDateField value={form.closingDate} onChange={v => set("closingDate", v)} />
                      <FormField
                        label="External Apply URL"
                        hint="Leave blank to use IOPPS built-in apply form"
                      >
                        <TextInput
                          value={form.externalApplyUrl}
                          onChange={(v) => set("externalApplyUrl", v)}
                          placeholder="https://careers.yourorg.com/apply/..."
                        />
                      </FormField>
                    </div>
                  </div>
                )}

                {/* ============ STEP 1: REQUIREMENTS ============ */}
                {step === 1 && (
                  <div style={cardStyle}>
                    <SectionHeader
                      icon="📝"
                      title="Requirements & Details"
                      subtitle="Describe the role and what you're looking for"
                    />

                    <FormField label="Description" required error={errors.description}>
                      <TextArea
                        value={form.description}
                        onChange={(v) => set("description", v)}
                        placeholder="Describe the role, team, and what a typical day looks like..."
                        rows={5}
                      />
                    </FormField>

                    <ListBuilder
                      label="Responsibilities"
                      items={form.responsibilities}
                      onChange={(items) => set("responsibilities", items)}
                      placeholder="e.g. Lead project planning and execution"
                    />

                    <ListBuilder
                      label="Qualifications"
                      items={form.qualifications}
                      onChange={(items) => set("qualifications", items)}
                      placeholder="e.g. 3+ years experience in project management"
                    />

                    <ListBuilder
                      label="Benefits"
                      items={form.benefits}
                      onChange={(items) => set("benefits", items)}
                      placeholder="e.g. Extended health & dental benefits"
                    />

                    {/* Indigenous Preference */}
                    <div
                      style={{
                        borderTop: "1px solid var(--border)",
                        marginTop: 24,
                        paddingTop: 24,
                      }}
                    >
                      <SectionHeader
                        icon="🪶"
                        title="Indigenous Preference"
                        subtitle="Indicate hiring preferences for this role"
                      />

                      <FormField label="Preference Level" hint="PSEA means Public Service Employment Act. This option is for applicable public-service hiring policies, not a general small-business preference. Check your organization’s HR policy before selecting it.">
                        <Select
                          value={form.indigenousPreferenceLevel}
                          onChange={(v) => set("indigenousPreferenceLevel", v)}
                        >
                          {PREFERENCE_LEVELS.map((p) => (
                            <option key={p.value} value={p.value}>
                              {p.label}
                            </option>
                          ))}
                        </Select>
                      </FormField>

                      <FormField label="Community Tags" hint="Choose community or Nation connections relevant to this role. Use Category for the industry; these tags do not establish hiring eligibility.">
                        <ChipSelect
                          options={COMMUNITY_TAGS}
                          selected={form.communityTags}
                          onChange={(tags) => set("communityTags", tags)}
                        />
                      </FormField>

                      <InfoTip>
                        Indigenous professionals value cultural leave, flexible hours for
                        ceremony attendance, and community engagement opportunities. Including
                        these in your benefits can help attract top talent.
                      </InfoTip>
                    </div>

                    {/* Job Flags */}
                    <div
                      style={{
                        borderTop: "1px solid var(--border)",
                        marginTop: 24,
                        paddingTop: 24,
                      }}
                    >
                      <SectionHeader
                        icon="⚙️"
                        title="Job Options"
                      />
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <HiringDetailsFields value={form.hiringDetails} onChange={value => set("hiringDetails", value)} />
                        <FeaturedJobControl
                          summary={featuredSummary}
                          checked={form.featured}
                          onChange={(value) => set("featured", value)}
                          onPurchase={(purchase) => void leaveForPurchase(purchase)}
                        />
                        {form.featured ? <label htmlFor="featured-duration">Featured listing duration (days, up to 45)
                          <input id="featured-duration" type="number" min={1} max={45} step={1} value={form.durationDays} onChange={event => set("durationDays", event.target.value)} className="w-full rounded-xl border p-3" />
                        </label> : <p>Standard job postings run for 30 days. A paid credit or annual-plan allowance is required.</p>}
                      </div>
                    </div>

                    {/* Required Documents */}
                    <div
                      style={{
                        borderTop: "1px solid var(--border)",
                        marginTop: 24,
                        paddingTop: 24,
                      }}
                    >
                      <SectionHeader
                        icon="📄"
                        title="Required Documents"
                        subtitle="What applicants must submit"
                      />
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <Checkbox
                          checked={form.requiresResume}
                          onChange={(v) => set("requiresResume", v)}
                          label="Resume / CV"
                        />
                        <Checkbox
                          checked={form.requiresCoverLetter}
                          onChange={(v) => set("requiresCoverLetter", v)}
                          label="Cover Letter"
                        />
                        <Checkbox
                          checked={form.requiresReferences}
                          onChange={(v) => set("requiresReferences", v)}
                          label="References"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ============ STEP 2: REVIEW & PUBLISH ============ */}
                {step === 2 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {/* Preview card */}
                    <div style={cardStyle}>
                      <SectionHeader
                        icon="👁️"
                        title="Preview"
                        subtitle="This is how candidates will see your posting"
                      />

                      <div
                        style={{
                          padding: 24,
                          borderRadius: 12,
                          border: "1px solid var(--border)",
                          background: "var(--bg)",
                        }}
                      >
                        {/* Title + org */}
                        <h2
                          style={{
                            margin: "0 0 4px",
                            fontSize: 20,
                            fontWeight: 700,
                            color: "var(--text)",
                          }}
                        >
                          {form.title || "Untitled"}
                        </h2>
                        <p
                          style={{
                            margin: "0 0 12px",
                            fontSize: 14,
                            color: "var(--text-muted)",
                          }}
                        >
                          {org?.name || "Your Organization"}{" "}
                          {form.location && `· ${form.location}`}
                        </p>

                        {/* Badges */}
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 6,
                            marginBottom: 16,
                          }}
                        >
                          {form.employmentType && (
                            <span
                              style={{
                                padding: "4px 10px",
                                borderRadius: 12,
                                fontSize: 12,
                                fontWeight: 600,
                                background: "rgba(13,148,136,.1)",
                                color: "var(--teal)",
                              }}
                            >
                              {form.employmentType}
                            </span>
                          )}
                          {form.workLocation && (
                            <span
                              style={{
                                padding: "4px 10px",
                                borderRadius: 12,
                                fontSize: 12,
                                fontWeight: 600,
                                background: "rgba(30,64,175,.1)",
                                color: "var(--navy)",
                              }}
                            >
                              {form.workLocation}
                            </span>
                          )}
                          {form.category && (
                            <span
                              style={{
                                padding: "4px 10px",
                                borderRadius: 12,
                                fontSize: 12,
                                fontWeight: 600,
                                background: "rgba(139,92,246,.08)",
                                color: "#8B5CF6",
                              }}
                            >
                              {form.category}
                            </span>
                          )}
                          {form.indigenousPreferenceLevel &&
                            form.indigenousPreferenceLevel !== "open" && (
                              <span
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: 12,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  background: "rgba(217,119,6,.1)",
                                  color: "#D97706",
                                }}
                              >
                                {PREFERENCE_LEVELS.find(
                                  (p) => p.value === form.indigenousPreferenceLevel
                                )?.label || "Indigenous Preferred"}
                              </span>
                            )}
                          {form.hiringDetails.willTrain && (
                            <span
                              style={{
                                padding: "4px 10px",
                                borderRadius: 12,
                                fontSize: 12,
                                fontWeight: 600,
                                background: "rgba(16,185,129,.1)",
                                color: "#10B981",
                              }}
                            >
                              Will Train
                            </span>
                          )}
                        </div>

                        {/* Salary */}
                        {(form.salaryMin || form.salaryMax) && (
                          <p
                            style={{
                              fontSize: 15,
                              fontWeight: 600,
                              color: "var(--text)",
                              margin: "0 0 16px",
                            }}
                          >
                            {formatSalary(form.salaryMin, form.salaryMax, form.salaryPeriod)}
                          </p>
                        )}

                        {/* Description */}
                        {form.description && (
                          <div style={{ marginBottom: 16 }}>
                            <h4
                              style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: "var(--text)",
                                margin: "0 0 6px",
                              }}
                            >
                              Description
                            </h4>
                            <p
                              style={{
                                fontSize: 14,
                                color: "var(--text-sec)",
                                lineHeight: 1.6,
                                margin: 0,
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {form.description}
                            </p>
                          </div>
                        )}

                        {/* Lists */}
                        {[
                          { title: "Responsibilities", items: form.responsibilities },
                          { title: "Qualifications", items: form.qualifications },
                          { title: "Benefits", items: form.benefits },
                        ]
                          .filter(({ items }) => items.length > 0)
                          .map(({ title, items }) => (
                            <div key={title} style={{ marginBottom: 16 }}>
                              <h4
                                style={{
                                  fontSize: 14,
                                  fontWeight: 700,
                                  color: "var(--text)",
                                  margin: "0 0 6px",
                                }}
                              >
                                {title}
                              </h4>
                              <ul
                                style={{
                                  margin: 0,
                                  padding: "0 0 0 20px",
                                  fontSize: 14,
                                  color: "var(--text-sec)",
                                  lineHeight: 1.7,
                                }}
                              >
                                {items.map((item, i) => (
                                  <li key={i}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          ))}

                        {/* Community tags */}
                        <HiringDetailsSummary value={form.hiringDetails} />
                        {form.communityTags.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                            {form.communityTags.map((tag) => (
                              <span
                                key={tag}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: 12,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  background: "rgba(13,148,136,.08)",
                                  color: "var(--teal)",
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Completeness checklist */}
                    <div style={cardStyle}>
                      <SectionHeader icon="✅" title="Completeness Check" />
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        {getChecklist(form).map(({ label, ok }) => (
                          <div
                            key={label}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              fontSize: 14,
                              color: ok ? "var(--text)" : "var(--text-muted)",
                            }}
                          >
                            <span
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: "50%",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 11,
                                fontWeight: 700,
                                background: ok
                                  ? "rgba(16,185,129,.12)"
                                  : "rgba(107,114,128,.1)",
                                color: ok ? "#10B981" : "#9CA3AF",
                              }}
                            >
                              {ok ? "✓" : "–"}
                            </span>
                            {label}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ============ PUBLISHING SUMMARY ============ */}
                {step === 2 && publishing && (
                  <section aria-label="Publishing summary" style={{ ...cardStyle, marginTop: 20 }}>
                    <SectionHeader icon={publishing.covered ? "💳" : "🧾"} title="What happens when you publish" />
                    <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                      {publishing.headline}
                    </h3>
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--text-muted)" }}>
                      {publishing.detail}
                      {publishing.covered ? " Paid jobs go live on the IOPPS job board right away." : ""}
                    </p>
                    {!publishing.covered && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
                        {publishing.purchasePlan && (
                          <button type="button" className="brand-button" disabled={saving} onClick={() => void leaveForPurchase(publishing.purchasePlan!)}
                            style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: "var(--button-gradient)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "wait" : "pointer" }}>
                            {saving ? "Saving draft..." : publishing.purchasePlan === "featured-post" ? "Save draft & buy featured post" : "Save draft & buy standard post"}
                          </button>
                        )}
                        {publishing.purchasePlan && (
                          <button type="button" className="brand-button" disabled={saving} onClick={() => void leaveForPurchase("plans")}
                            style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--button-gradient-soft)", color: "var(--button-gradient-soft-text)", fontSize: 14, fontWeight: 600, cursor: saving ? "wait" : "pointer" }}>
                            See annual plans
                          </button>
                        )}
                        <button type="button" disabled={checkingSummary} onClick={() => void checkSummaryAgain()}
                          style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                          {checkingSummary ? "Checking..." : "I just paid: check again"}
                        </button>
                      </div>
                    )}
                  </section>
                )}

                {/* ============ NAV BUTTONS ============ */}
                {submitError && (
                  <div
                    role="alert"
                    style={{
                      marginTop: 18,
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(220,38,38,.28)",
                      background: "rgba(220,38,38,.08)",
                      color: "#FCA5A5",
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    {submitError}
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    justifyContent: step === 0 ? "flex-end" : "space-between",
                    marginTop: 24,
                    gap: 12,
                  }}
                >
                  {typeof step === "number" && step > 0 && (
                    <button className="brand-button"
                      onClick={goBack}
                      style={{
                        padding: "12px 24px",
                        borderRadius: 10,
                        border: "1px solid var(--border)",
                        background: "var(--button-gradient-soft)",
                        color: "var(--button-gradient-soft-text)",
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      ← Back
                    </button>
                  )}

                  {step === 2 ? (
                    <div style={{ display: "flex", gap: 12 }}>
                      <button className="brand-button"
                        onClick={() => handleSave("draft")}
                        disabled={saving}
                        style={{
                          padding: "12px 24px",
                          borderRadius: 10,
                          border: "1px solid var(--border)",
                          background: "var(--button-gradient-soft)",
                          color: "var(--button-gradient-soft-text)",
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: saving ? "default" : "pointer",
                          opacity: saving ? 0.5 : 1,
                        }}
                      >
                        {saving ? "Saving..." : "Save as Draft"}
                      </button>
                      {/* Without a credit or plan allowance, the summary above offers purchase instead. */}
                      {(!publishing || publishing.covered) && (
                        <button className="brand-button"
                          onClick={() => handleSave("active")}
                          disabled={saving}
                          style={{
                            padding: "12px 24px",
                            borderRadius: 10,
                            border: "none",
                            background: "var(--button-gradient)",
                            color: "#fff",
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: saving ? "default" : "pointer",
                            opacity: saving ? 0.5 : 1,
                          }}
                        >
                          {saving ? "Publishing..." : "Publish Job"}
                        </button>
                      )}
                    </div>
                  ) : (
                    <button className="brand-button"
                      onClick={goNext}
                      style={{
                        padding: "12px 24px",
                        borderRadius: 10,
                        border: "none",
                        background: "var(--button-gradient)",
                        color: "#fff",
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Continue →
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </AppShell>
    </OrgRoute>
  );
}
