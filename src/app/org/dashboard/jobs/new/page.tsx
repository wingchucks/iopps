"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import OrgRoute from "@/components/OrgRoute";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import { getMemberProfile } from "@/lib/firestore/members";
import type { MemberProfile } from "@/lib/firestore/members";
import { getOrganization } from "@/lib/firestore/organizations";
import type { Organization } from "@/lib/firestore/organizations";
import { createJob } from "@/lib/firestore/jobs";

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
  "Ojibwe", "Inuit", "Blackfoot", "Healthcare", "Education",
  "Government", "Technology", "Trades",
];

const PREFERENCE_LEVELS = [
  { value: "", label: "Select preference level..." },
  { value: "open", label: "Open to All" },
  { value: "preferred", label: "Indigenous Preferred" },
  { value: "strongly-preferred", label: "Strongly Preferred" },
  { value: "psea-s22", label: "Per PSEA Section 22" },
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
  willTrain: boolean;
  driversLicense: boolean;
  featured: boolean;
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
  willTrain: false,
  driversLicense: false,
  featured: false,
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

/* ------------------------------------------------------------------ */
/*  Micro-components (local to wizard)                                 */
/* ------------------------------------------------------------------ */

function ProgressBar({ step }: { step: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 32 }}>
      {STEP_LABELS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  margin: "0 12px",
                  background: done ? "var(--teal)" : "var(--border)",
                  borderRadius: 1,
                  transition: "background .2s",
                }}
              />
            )}
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
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 6,
          color: "var(--text)",
        }}
      >
        {label}
        {required && (
          <span style={{ color: "var(--teal)", marginLeft: 3 }}>*</span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
          {hint}
        </p>
      )}
      {error && (
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#DC2626" }}>
          {error}
        </p>
      )}
    </div>
  );
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
  return (
    <input
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
  return (
    <textarea
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
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
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
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              border: active ? "1.5px solid var(--teal)" : "1px solid var(--border)",
              background: active ? "rgba(13,148,136,.1)" : "var(--card)",
              color: active ? "var(--teal)" : "var(--text-sec)",
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

  const add = () => {
    const val = draft.trim();
    if (!val) return;
    onChange([...items, val]);
    setDraft("");
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 6,
          color: "var(--text)",
        }}
      >
        {label}
      </label>
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
        <button
          type="button"
          onClick={add}
          style={{
            padding: "8px 16px",
            borderRadius: 10,
            border: "none",
            background: "rgba(13,148,136,.1)",
            color: "var(--teal)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          + Add
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

  const [step, setStep] = useState<WizardStep>(0);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load org & profile
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/employer/dashboard", {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data.profile as MemberProfile);
          setOrg(data.org as Organization);
          setLoading(false);
          return;
        }
      } catch {
        // fall through
      }
      const mp = await getMemberProfile(user.uid);
      if (mp?.orgId) {
        setProfile(mp);
        const organization = await getOrganization(mp.orgId);
        setOrg(organization);
      }
      setLoading(false);
    })();
  }, [user]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  /* ---- Validation ---- */
  const validateStep0 = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.category) e.category = "Category is required";
    if (!form.location.trim()) e.location = "Location is required";
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
    if (step === 0 && !validateStep0()) return;
    if (step === 1 && !validateStep1()) return;
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
    if (!profile?.orgId || !user) return;
    setSaving(true);
    try {
      const salary = formatSalary(form.salaryMin, form.salaryMax, form.salaryPeriod);
      const slug =
        form.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") +
        "-" +
        Date.now().toString(36);

      await createJob({
        title: form.title,
        slug,
        department: form.department || undefined,
        category: form.category,
        employmentType: form.employmentType,
        workLocation: form.workLocation,
        location: form.location,
        salary,
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
        willTrain: form.willTrain,
        driversLicense: form.driversLicense,
        featured: form.featured,
        requiresResume: form.requiresResume,
        requiresCoverLetter: form.requiresCoverLetter,
        requiresReferences: form.requiresReferences,
        status,
        employerId: profile.orgId,
        orgId: profile.orgId,
        orgName: org?.name,
        orgShort: org?.shortName,
        authorId: user.uid,
      });

      setStep("success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Failed to create job:", err);
    } finally {
      setSaving(false);
    }
  };

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
            {loading ? (
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
                  Job Posted Successfully!
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
                  Your job posting is now live and visible to Indigenous professionals across Canada.
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
                    <li>Candidates will be notified about this opportunity</li>
                    <li>Your job appears in search results and the jobs feed</li>
                    <li>Manage applications from your dashboard</li>
                  </ul>
                </div>

                <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                  <button
                    onClick={() => {
                      setForm(emptyForm);
                      setStep(0);
                      setErrors({});
                    }}
                    style={{
                      padding: "12px 24px",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      color: "var(--text)",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Post Another Job
                  </button>
                  <button
                    onClick={() => router.push("/org/dashboard")}
                    style={{
                      padding: "12px 24px",
                      borderRadius: 10,
                      border: "none",
                      background: "var(--navy)",
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

                    <FormField label="Location" required error={errors.location}>
                      <TextInput
                        value={form.location}
                        onChange={(v) => set("location", v)}
                        placeholder="e.g. Saskatoon, SK"
                      />
                    </FormField>

                    {/* Salary */}
                    <div style={{ marginBottom: 16 }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: 13,
                          fontWeight: 600,
                          marginBottom: 6,
                          color: "var(--text)",
                        }}
                      >
                        Salary Range
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 140px", gap: 8 }}>
                        <input
                          type="number"
                          value={form.salaryMin}
                          onChange={(e) => set("salaryMin", e.target.value)}
                          placeholder="Min"
                          style={inputStyle}
                        />
                        <input
                          type="number"
                          value={form.salaryMax}
                          onChange={(e) => set("salaryMax", e.target.value)}
                          placeholder="Max"
                          style={inputStyle}
                        />
                        <Select
                          value={form.salaryPeriod}
                          onChange={(v) => set("salaryPeriod", v)}
                        >
                          <option>Annual</option>
                          <option>Monthly</option>
                          <option>Hourly</option>
                          <option>Contract</option>
                        </Select>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <FormField label="Closing Date">
                        <TextInput
                          type="date"
                          value={form.closingDate}
                          onChange={(v) => set("closingDate", v)}
                        />
                      </FormField>
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

                      <FormField label="Preference Level">
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

                      <FormField label="Community Tags" hint="Select all that apply to help candidates find relevant opportunities">
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
                        <Checkbox
                          checked={form.willTrain}
                          onChange={(v) => set("willTrain", v)}
                          label="Will Train"
                          description="Employer will provide on-the-job training"
                        />
                        <Checkbox
                          checked={form.driversLicense}
                          onChange={(v) => set("driversLicense", v)}
                          label="Driver's License Required"
                        />
                        <Checkbox
                          checked={form.featured}
                          onChange={(v) => set("featured", v)}
                          label="Feature This Job"
                          description="Highlighted in search results and job feeds"
                        />
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
                          {form.willTrain && (
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

                {/* ============ NAV BUTTONS ============ */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: step === 0 ? "flex-end" : "space-between",
                    marginTop: 24,
                    gap: 12,
                  }}
                >
                  {typeof step === "number" && step > 0 && (
                    <button
                      onClick={goBack}
                      style={{
                        padding: "12px 24px",
                        borderRadius: 10,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        color: "var(--text)",
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
                      <button
                        onClick={() => handleSave("draft")}
                        disabled={saving}
                        style={{
                          padding: "12px 24px",
                          borderRadius: 10,
                          border: "1px solid var(--border)",
                          background: "var(--card)",
                          color: "var(--text)",
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: saving ? "default" : "pointer",
                          opacity: saving ? 0.5 : 1,
                        }}
                      >
                        {saving ? "Saving..." : "Save as Draft"}
                      </button>
                      <button
                        onClick={() => handleSave("active")}
                        disabled={saving}
                        style={{
                          padding: "12px 24px",
                          borderRadius: 10,
                          border: "none",
                          background: "var(--teal)",
                          color: "#fff",
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: saving ? "default" : "pointer",
                          opacity: saving ? 0.5 : 1,
                        }}
                      >
                        {saving ? "Publishing..." : "Publish Job"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={goNext}
                      style={{
                        padding: "12px 24px",
                        borderRadius: 10,
                        border: "none",
                        background: "var(--navy)",
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
