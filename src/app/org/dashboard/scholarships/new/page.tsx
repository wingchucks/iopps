"use client";
const spinStyle = `@keyframes spin { to { transform: rotate(360deg) } }`;
if (typeof document !== "undefined" && !document.getElementById("spin-anim-sc")) { const s = document.createElement("style"); s.id = "spin-anim-sc"; s.textContent = spinStyle; document.head.appendChild(s); }

import { useState, useCallback, useMemo } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import OrgRoute from "@/components/OrgRoute";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import { getMemberProfile } from "@/lib/firestore/members";
import type { MemberProfile } from "@/lib/firestore/members";
import { getOrganization } from "@/lib/firestore/organizations";
import type { Organization } from "@/lib/firestore/organizations";
import { createScholarship } from "@/lib/firestore/scholarships";

/* ------------------------------------------------------------------ */
/*  Categories & category-specific field configs                       */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
  { id: "scholarship", label: "Scholarship", desc: "Academic awards for students", icon: "🎓", color: "var(--teal)", softBg: "rgba(13,148,136,0.08)" },
  { id: "bursary", label: "Bursary", desc: "Financial need-based aid", icon: "💰", color: "#2563EB", softBg: "rgba(37,99,235,0.08)" },
  { id: "business_grant", label: "Business Grant", desc: "Funding for entrepreneurs", icon: "💼", color: "#D4940A", softBg: "rgba(212,148,10,0.08)" },
  { id: "community_grant", label: "Community Grant", desc: "Community project funding", icon: "🤝", color: "#7C3AED", softBg: "rgba(124,58,237,0.08)" },
];

interface CatField {
  key: string;
  label: string;
  type: "pills" | "text";
  required?: boolean;
  multi?: boolean;
  hint?: string;
  placeholder?: string;
  options?: string[];
}

const CATEGORY_FIELDS: Record<string, { sectionTitle: string; sectionHint: string; fields: CatField[] }> = {
  scholarship: {
    sectionTitle: "Scholarship Details",
    sectionHint: "Help students find the right fit",
    fields: [
      { key: "educationLevel", label: "Education Level", type: "pills", required: true, options: ["High School", "Certificate/Diploma", "Undergraduate", "Graduate", "Post-Doctoral", "Any Level"] },
      { key: "fieldOfStudy", label: "Field of Study", type: "pills", multi: true, hint: "Select all that apply, or leave empty for any field", options: ["Any Field", "STEM", "Business", "Health Sciences", "Education", "Arts & Humanities", "Social Sciences", "Trades & Technology", "Law", "Environmental Studies", "Indigenous Studies"] },
      { key: "gpaRequired", label: "Minimum GPA", type: "text", placeholder: 'e.g. "3.0" or "70%" — leave blank if none', hint: "Academic standing requirement" },
      { key: "numberOfAwards", label: "Number of Awards", type: "text", placeholder: "e.g. 5 awards annually", hint: "How many recipients per cycle?" },
      { key: "renewable", label: "Renewable?", type: "pills", options: ["One-time Award", "Renewable Annually", "Multi-year (fixed term)"], hint: "Can recipients receive this award again?" },
      { key: "indigenousSpecific", label: "Indigenous Identity Requirement", type: "pills", options: ["First Nations only", "Métis only", "Inuit only", "Any Indigenous identity", "Open to all (Indigenous priority)", "Open to all"], hint: "Who is eligible based on Indigenous identity?" },
    ],
  },
  bursary: {
    sectionTitle: "Bursary Details",
    sectionHint: "Financial need-based support criteria",
    fields: [
      { key: "educationLevel", label: "Education Level", type: "pills", required: true, options: ["High School", "Certificate/Diploma", "Undergraduate", "Graduate", "Any Level"] },
      { key: "financialNeed", label: "Financial Need Criteria", type: "pills", options: ["Demonstrated financial need required", "Financial need considered", "No financial assessment"], hint: "How is financial need evaluated?" },
      { key: "priorityGroups", label: "Priority Groups", type: "pills", multi: true, hint: "Select all that apply", options: ["Single parents", "Students with disabilities", "First-generation students", "Rural/remote communities", "Students aging out of care", "Returning learners (25+)", "Part-time students"] },
      { key: "numberOfAwards", label: "Number of Awards", type: "text", placeholder: "e.g. 10 bursaries per semester" },
      { key: "renewable", label: "Renewable?", type: "pills", options: ["One-time Award", "Per-semester", "Renewable Annually"] },
      { key: "indigenousSpecific", label: "Indigenous Identity Requirement", type: "pills", options: ["First Nations only", "Métis only", "Inuit only", "Any Indigenous identity", "Open to all (Indigenous priority)", "Open to all"] },
      { key: "fieldOfStudy", label: "Field of Study", type: "pills", multi: true, options: ["Any Field", "STEM", "Business", "Health Sciences", "Education", "Arts & Humanities", "Social Sciences", "Trades & Technology"] },
    ],
  },
  business_grant: {
    sectionTitle: "Business Grant Details",
    sectionHint: "Help entrepreneurs find the right funding",
    fields: [
      { key: "businessStage", label: "Business Stage", type: "pills", required: true, options: ["Idea / Pre-launch", "Startup (0-2 years)", "Growth (2-5 years)", "Established (5+ years)", "Any Stage"] },
      { key: "industrySector", label: "Industry / Sector", type: "pills", multi: true, hint: "Select all eligible industries", options: ["Any Industry", "Technology", "Arts & Culture", "Food & Agriculture", "Tourism & Hospitality", "Construction & Trades", "Professional Services", "Retail", "Manufacturing", "Natural Resources", "Health & Wellness"] },
      { key: "fundingUse", label: "How Can Funds Be Used?", type: "pills", multi: true, hint: "Select all permitted uses", options: ["Equipment & supplies", "Marketing & advertising", "Hiring & wages", "Training & education", "Rent & facilities", "Technology & software", "Research & development", "Inventory", "Unrestricted"] },
      { key: "matchingFunds", label: "Matching Funds Required?", type: "pills", options: ["No matching required", "Partial match required", "1:1 match required"], hint: "Does the applicant need to contribute their own funds?" },
      { key: "indigenousOwnership", label: "Indigenous Ownership Requirement", type: "pills", options: ["100% Indigenous-owned", "51%+ Indigenous-owned", "Indigenous partnership", "Indigenous-serving", "Open to all"] },
      { key: "businessPlanRequired", label: "Business Plan Required?", type: "pills", options: ["Full business plan", "Executive summary only", "Not required"] },
      { key: "maxFundingPerApplicant", label: "Max Funding Per Applicant", type: "text", placeholder: 'e.g. "$25,000 maximum" or "Varies by project"' },
    ],
  },
  community_grant: {
    sectionTitle: "Community Grant Details",
    sectionHint: "Criteria for community-driven projects",
    fields: [
      { key: "projectType", label: "Project Types Eligible", type: "pills", multi: true, required: true, hint: "What kinds of projects does this fund?", options: ["Language revitalization", "Cultural preservation", "Youth programs", "Elder support", "Health & wellness", "Education", "Infrastructure", "Economic development", "Environmental stewardship", "Arts & culture", "Sport & recreation", "Food sovereignty"] },
      { key: "applicantType", label: "Who Can Apply?", type: "pills", multi: true, options: ["First Nations bands/councils", "Tribal councils", "Métis locals/regions", "Inuit communities", "Indigenous non-profits", "Indigenous cooperatives", "Community groups (informal)", "Indigenous schools"] },
      { key: "communitySize", label: "Community Size Requirement", type: "pills", options: ["Under 500 people", "Under 2,000", "Under 10,000", "Any size", "Urban communities", "Rural/remote only"], hint: "Is there a population threshold?" },
      { key: "matchingFunds", label: "Matching Funds Required?", type: "pills", options: ["No matching required", "In-kind contributions accepted", "Partial cash match", "1:1 match required"] },
      { key: "projectDuration", label: "Maximum Project Duration", type: "pills", options: ["Up to 6 months", "Up to 1 year", "Up to 2 years", "Up to 3 years", "Multi-year / ongoing"] },
      { key: "reportingRequired", label: "Reporting Requirements", type: "pills", options: ["Final report only", "Quarterly reports", "Semi-annual reports", "Monthly reports", "Community presentation"], hint: "What accountability is expected?" },
      { key: "maxFundingPerApplicant", label: "Max Funding Per Applicant", type: "text", placeholder: 'e.g. "$50,000 per project" or "Varies"' },
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  Form state                                                         */
/* ------------------------------------------------------------------ */

interface FormState {
  category: string;
  title: string;
  description: string;
  amount: string;
  deadline: string;
  eligibility: string;
  requirements: string[];
  applyMethod: string;
  applicationUrl: string;
  applicationInstructions: string;
  location: string;
  contactEmail: string;
  contactPhone: string;
  // Category-specific (stored flat)
  [key: string]: string | string[] | boolean;
}

const emptyForm: FormState = {
  category: "",
  title: "",
  description: "",
  amount: "",
  deadline: "",
  eligibility: "",
  requirements: [],
  applyMethod: "url",
  applicationUrl: "",
  applicationInstructions: "",
  location: "",
  contactEmail: "",
  contactPhone: "",
  educationLevel: "",
  fieldOfStudy: [],
  gpaRequired: "",
  numberOfAwards: "",
  renewable: "",
  indigenousSpecific: "",
  financialNeed: "",
  priorityGroups: [],
  businessStage: "",
  industrySector: [],
  fundingUse: [],
  matchingFunds: "",
  indigenousOwnership: "",
  businessPlanRequired: "",
  maxFundingPerApplicant: "",
  projectType: [],
  applicantType: [],
  communitySize: "",
  projectDuration: "",
  reportingRequired: "",
};

/* ------------------------------------------------------------------ */
/*  Micro-components                                                   */
/* ------------------------------------------------------------------ */

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  fontSize: 14,
  color: "var(--text)",
  background: "var(--bg)",
  border: "1.5px solid var(--border)",
  borderRadius: 10,
  outline: "none",
  boxSizing: "border-box",
};

function Label({ children, required, hint }: { children: React.ReactNode; required?: boolean; hint?: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <label style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center", gap: 4 }}>
        {children}
        {required && <span style={{ color: "#EF4444", fontSize: 13 }}>*</span>}
      </label>
      {hint && <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0", lineHeight: 1.4 }}>{hint}</p>}
    </div>
  );
}

function Section({ title, hint, accentColor, children }: { title?: string; hint?: string; accentColor?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      {title && (
        <div style={{ margin: "0 0 16px", paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: accentColor || "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
            {title}
          </h3>
          {hint && <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "3px 0 0" }}>{hint}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

function PillSelect({ options, value, onChange, multi, accentColor }: {
  options: string[];
  value: string | string[];
  onChange: (v: string | string[]) => void;
  multi?: boolean;
  accentColor?: string;
}) {
  const color = accentColor || "var(--teal)";

  const toggle = (opt: string) => {
    if (multi) {
      const arr = Array.isArray(value) ? [...value] : [];
      const anyOpts = ["Any Field", "Any Industry", "Any Level", "Any Stage", "Any size"];
      if (anyOpts.includes(opt)) { onChange([opt]); return; }
      const cleaned = arr.filter((v) => !anyOpts.includes(v));
      if (cleaned.includes(opt)) onChange(cleaned.filter((v) => v !== opt));
      else onChange([...cleaned, opt]);
    } else {
      onChange(value === opt ? "" : opt);
    }
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((opt) => {
        const isSelected = multi ? (Array.isArray(value) && value.includes(opt)) : value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            style={{
              padding: "6px 13px",
              fontSize: 13,
              fontWeight: isSelected ? 600 : 500,
              background: isSelected ? "rgba(13,148,136,0.08)" : "var(--card)",
              color: isSelected ? color : "var(--text-sec)",
              border: `1.5px solid ${isSelected ? "var(--teal)" : "var(--border)"}`,
              borderRadius: 20,
              cursor: "pointer",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            {isSelected && <span style={{ marginRight: 3 }}>✓</span>}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function CategorySpecificSection({ category, form, set }: {
  category: string;
  form: FormState;
  set: (key: string, value: string | string[]) => void;
}) {
  const config = CATEGORY_FIELDS[category];
  if (!config) return null;
  const cat = CATEGORIES.find((c) => c.id === category);

  return (
    <Section title={config.sectionTitle} hint={config.sectionHint} accentColor={cat?.color}>
      <div
        style={{
          background: cat?.softBg || "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "18px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {config.fields.map((field) => (
          <div key={field.key}>
            <Label required={field.required} hint={field.hint}>{field.label}</Label>
            {field.type === "pills" && field.options ? (
              <PillSelect
                options={field.options}
                value={(form[field.key] as string | string[]) || (field.multi ? [] : "")}
                onChange={(v) => set(field.key, v)}
                multi={field.multi}
                accentColor={cat?.color}
              />
            ) : (
              <input
                type="text"
                value={(form[field.key] as string) || ""}
                onChange={(e) => set(field.key, e.target.value)}
                placeholder={field.placeholder}
                style={inputStyle}
              />
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  Preview Card                                                       */
/* ------------------------------------------------------------------ */

function PreviewCard({ form }: { form: FormState }) {
  const cat = CATEGORIES.find((c) => c.id === form.category);
  const hasContent = form.title || form.amount || form.deadline;

  if (!hasContent) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--text-muted)" }}>
        <p style={{ fontSize: 14, margin: 0 }}>Start filling out the form to see a live preview</p>
      </div>
    );
  }

  const daysUntil = form.deadline ? Math.ceil((new Date(form.deadline).getTime() - Date.now()) / 86400000) : null;
  const closingSoon = daysUntil !== null && daysUntil <= 7 && daysUntil > 0;

  const catSpecificTags: string[] = [];
  if (form.educationLevel) catSpecificTags.push(form.educationLevel as string);
  if (form.renewable) catSpecificTags.push(form.renewable as string);
  if (form.businessStage) catSpecificTags.push(form.businessStage as string);
  if (form.financialNeed) catSpecificTags.push(form.financialNeed as string);
  if (Array.isArray(form.fieldOfStudy) && form.fieldOfStudy.length > 0) catSpecificTags.push(...form.fieldOfStudy.slice(0, 2));
  if (Array.isArray(form.projectType) && form.projectType.length > 0) catSpecificTags.push(...form.projectType.slice(0, 2));
  if (Array.isArray(form.industrySector) && form.industrySector.length > 0) catSpecificTags.push(...form.industrySector.slice(0, 2));

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ height: 4, background: cat?.color || "var(--border)" }} />
      <div style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          {cat && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: cat.softBg, color: cat.color, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {cat.label}
            </span>
          )}
          {closingSoon && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "rgba(239,68,68,0.08)", color: "#EF4444" }}>
              Closing Soon
            </span>
          )}
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: "0 0 8px", lineHeight: 1.3 }}>
          {form.title || "Untitled Opportunity"}
        </h3>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 10 }}>
          {form.amount && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
              <span>💰</span><span style={{ fontWeight: 600, color: "var(--text)" }}>{form.amount}</span>
            </div>
          )}
          {form.deadline && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: closingSoon ? "#EF4444" : "var(--text-sec)" }}>
              <span>📅</span>
              <span style={{ fontWeight: closingSoon ? 600 : 400 }}>
                {new Date(form.deadline + "T00:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                {daysUntil !== null && daysUntil > 0 && <span style={{ marginLeft: 3, opacity: 0.7 }}>({daysUntil}d)</span>}
              </span>
            </div>
          )}
          {form.location && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--text-sec)" }}>
              <span>📍</span><span>{form.location}</span>
            </div>
          )}
        </div>

        {catSpecificTags.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
            {catSpecificTags.map((tag, i) => (
              <span key={i} style={{ fontSize: 11, padding: "2px 7px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 5, color: "var(--text-sec)" }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {form.description && (
          <p style={{ fontSize: 13, color: "var(--text-sec)", margin: "0 0 10px", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
            {form.description}
          </p>
        )}

        {form.requirements.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {form.requirements.slice(0, 4).map((r, i) => (
              <span key={i} style={{ fontSize: 11, padding: "2px 7px", background: "rgba(13,148,136,0.06)", border: "1px solid rgba(13,148,136,0.15)", borderRadius: 5, color: "var(--teal)" }}>
                {r}
              </span>
            ))}
            {form.requirements.length > 4 && (
              <span style={{ fontSize: 11, padding: "2px 7px", color: "var(--text-muted)" }}>+{form.requirements.length - 4} more</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Completion Bar                                                     */
/* ------------------------------------------------------------------ */

function CompletionBar({ form }: { form: FormState }) {
  const catConfig = CATEGORY_FIELDS[form.category];
  const catRequired = catConfig ? catConfig.fields.filter((f) => f.required) : [];

  const fields = [
    { name: "Category", done: !!form.category },
    { name: "Title", done: !!form.title },
    { name: "Description", done: form.description.length >= 20 },
    { name: "Amount", done: !!form.amount },
    { name: "Deadline", done: !!form.deadline },
    { name: "Eligibility", done: !!form.eligibility },
    { name: "How to Apply", done: !!form.applicationUrl || !!form.applicationInstructions },
    ...catRequired.map((f) => ({
      name: f.label,
      done: f.multi ? (Array.isArray(form[f.key]) && (form[f.key] as string[]).length > 0) : !!form[f.key],
    })),
  ];
  const done = fields.filter((f) => f.done).length;
  const pct = Math.round((done / fields.length) * 100);
  const allDone = done === fields.length;

  return (
    <div style={{ background: allDone ? "rgba(13,148,136,0.06)" : "var(--bg)", borderRadius: 12, padding: "12px 16px", border: `1px solid ${allDone ? "rgba(13,148,136,0.2)" : "var(--border)"}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: allDone ? "var(--teal)" : "var(--text-sec)" }}>
          {allDone ? "✓ Ready to publish" : `${done} of ${fields.length} required fields`}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: allDone ? "var(--teal)" : "var(--text-muted)" }}>{pct}%</span>
      </div>
      <div style={{ height: 5, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "var(--teal)", borderRadius: 3, transition: "width 0.4s ease" }} />
      </div>
      {!allDone && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
          {fields.filter((f) => !f.done).map((f) => (
            <span key={f.name} style={{ fontSize: 11, padding: "2px 7px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 5, color: "var(--text-muted)" }}>
              {f.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function NewScholarshipPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [newReq, setNewReq] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/employer/dashboard", { headers: { Authorization: `Bearer ${idToken}` } });
        if (res.ok) {
          const data = await res.json();
          setProfile(data.profile as MemberProfile);
          setOrg(data.org as Organization);
          setLoading(false);
          return;
        }
      } catch { /* fall through */ }
      const mp = await getMemberProfile(user.uid);
      if (mp?.orgId) {
        setProfile(mp);
        const organization = await getOrganization(mp.orgId);
        setOrg(organization);
      }
      setLoading(false);
    })();
  }, [user]);

  const set = useCallback((field: string, value: string | string[] | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const addRequirement = useCallback(() => {
    if (newReq.trim() && form.requirements.length < 10) {
      setForm((prev) => ({ ...prev, requirements: [...prev.requirements, newReq.trim()] }));
      setNewReq("");
    }
  }, [newReq, form.requirements]);

  const removeRequirement = useCallback((idx: number) => {
    setForm((prev) => ({ ...prev, requirements: prev.requirements.filter((_, i) => i !== idx) }));
  }, []);

  const isValid = useMemo(() => {
    const base = form.category && form.title && form.description.length >= 20 && form.amount && form.deadline && form.eligibility && (form.applicationUrl || form.applicationInstructions);
    if (!base) return false;
    const catConfig = CATEGORY_FIELDS[form.category];
    if (catConfig) {
      return catConfig.fields.filter((f) => f.required).every((f) =>
        f.multi ? (Array.isArray(form[f.key]) && (form[f.key] as string[]).length > 0) : !!form[f.key]
      );
    }
    return true;
  }, [form]);

  const handleSave = async (status: "active" | "draft") => {
    if (!profile?.orgId || !user) {
      setError("Unable to publish — your organization profile could not be loaded. Please refresh and try again.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36);
      const cat = CATEGORIES.find((c) => c.id === form.category);

      // Build data object with all fields
      // NOTE: Firestore setDoc rejects `undefined` values, so we omit empty
      // optional fields instead of passing `|| undefined`.
      const data: Record<string, unknown> = {
        title: form.title,
        slug,
        description: form.description,
        amount: form.amount,
        deadline: form.deadline,
        eligibility: form.eligibility,
        requirements: form.requirements,
        applyMethod: form.applyMethod,
        category: form.category,
        status,
        active: status === "active",
        orgId: profile.orgId,
        orgName: org?.name || "",
        orgShort: org?.shortName || "",
        authorId: user.uid,
      };
      if (form.applicationUrl) data.applicationUrl = form.applicationUrl;
      if (form.applicationInstructions) data.applicationInstructions = form.applicationInstructions;
      if (form.location) data.location = form.location;
      if (form.contactEmail) data.contactEmail = form.contactEmail;
      if (form.contactPhone) data.contactPhone = form.contactPhone;

      // Include category-specific fields
      const catConfig = CATEGORY_FIELDS[form.category];
      if (catConfig) {
        for (const field of catConfig.fields) {
          const val = form[field.key];
          if (val && (typeof val === "string" ? val.trim() : (val as string[]).length > 0)) {
            data[field.key] = val;
          }
        }
      }

      await createScholarship(data as Parameters<typeof createScholarship>[0]);
      router.push("/org/dashboard/scholarships?created=1");
    } catch (err) {
      console.error("Failed to create scholarship:", err);
      setError("Something went wrong while publishing. Please try again or contact support.");
    } finally {
      setSaving(false);
    }
  };

  const activeCat = CATEGORIES.find((c) => c.id === form.category);

  const cardStyle: React.CSSProperties = {
    background: "var(--card)",
    borderRadius: 16,
    border: "1px solid var(--border)",
    padding: "24px 28px",
  };

  return (
    <OrgRoute>
      <AppShell>
        <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
          {loading ? (
            <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
              <div className="skeleton" style={{ height: 32, width: 240, borderRadius: 10, marginBottom: 16 }} />
              <div className="skeleton" style={{ height: 600, borderRadius: 16 }} />
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{
                background: "var(--card)",
                borderBottom: "1px solid var(--border)",
                padding: "14px 24px",
                position: "sticky",
                top: 0,
                zIndex: 20,
              }}>
                <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button
                      onClick={() => router.push("/org/dashboard/scholarships")}
                      style={{ background: "none", border: "none", color: "var(--teal)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}
                    >
                      ← Back
                    </button>
                    <div style={{ width: 1, height: 20, background: "var(--border)" }} />
                    <div>
                      <h1 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: 0 }}>
                        {activeCat ? `Create ${activeCat.label}` : "Create Opportunity"}
                      </h1>
                      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                        {org?.name ? `Posting as ${org.name}` : "Share an opportunity with the community"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 14px",
                      fontSize: 13,
                      fontWeight: 600,
                      background: showPreview ? "rgba(13,148,136,0.12)" : "transparent",
                      color: showPreview ? "var(--teal)" : "var(--text-muted)",
                      border: `1.5px solid ${showPreview ? "var(--teal)" : "var(--border)"}`,
                      borderRadius: 9,
                      cursor: "pointer",
                    }}
                  >
                    👁️ Preview
                  </button>
                </div>
              </div>

              {/* Body */}
              <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 24px 100px" }}>
                <div style={{ marginBottom: 24 }}>
                  <CompletionBar form={form} />
                </div>

                <div style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>
                  {/* Form Column */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={cardStyle}>
                      {/* Category Selection */}
                      <Section title="What type of opportunity?">
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                          {CATEGORIES.map((cat) => {
                            const selected = form.category === cat.id;
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => set("category", cat.id)}
                                style={{
                                  padding: "14px 12px",
                                  background: selected ? cat.softBg : "var(--bg)",
                                  border: `1.5px solid ${selected ? cat.color : "var(--border)"}`,
                                  borderRadius: 12,
                                  cursor: "pointer",
                                  textAlign: "center",
                                  transition: "all 0.2s",
                                  position: "relative",
                                }}
                              >
                                {selected && (
                                  <div style={{ position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: "50%", background: cat.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>
                                    ✓
                                  </div>
                                )}
                                <div style={{ fontSize: 24, marginBottom: 6 }}>{cat.icon}</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: selected ? cat.color : "var(--text)", marginBottom: 2 }}>
                                  {cat.label}
                                </div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.3 }}>
                                  {cat.desc}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </Section>

                      {/* Category-Specific Fields */}
                      {form.category && (
                        <CategorySpecificSection category={form.category} form={form} set={set} />
                      )}

                      {/* Core Details */}
                      <Section title="Details">
                        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                          <div>
                            <Label required>Title</Label>
                            <input
                              type="text"
                              value={form.title}
                              onChange={(e) => set("title", e.target.value)}
                              placeholder={
                                form.category === "business_grant" ? "e.g. Indigenous Entrepreneur Startup Fund" :
                                form.category === "community_grant" ? "e.g. Language Revitalization Community Grant" :
                                form.category === "bursary" ? "e.g. Indigenous Student Financial Need Bursary" :
                                "e.g. Indigenous Youth Leadership Scholarship"
                              }
                              maxLength={120}
                              style={inputStyle}
                            />
                          </div>

                          <div>
                            <Label required hint="Describe the opportunity, its purpose, and who it supports">Description</Label>
                            <textarea
                              value={form.description}
                              onChange={(e) => set("description", e.target.value)}
                              placeholder={
                                form.category === "business_grant" ? "This grant supports Indigenous entrepreneurs launching or growing businesses in..." :
                                form.category === "community_grant" ? "This grant program funds community-driven projects that strengthen..." :
                                form.category === "bursary" ? "This bursary provides financial assistance to Indigenous students who demonstrate..." :
                                "This scholarship supports Indigenous students pursuing post-secondary education in..."
                              }
                              rows={5}
                              maxLength={2000}
                              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }}
                            />
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                            <div>
                              <Label required hint="Dollar amount or description">Award Amount</Label>
                              <input
                                type="text"
                                value={form.amount}
                                onChange={(e) => set("amount", e.target.value)}
                                placeholder={
                                  form.category === "business_grant" ? 'e.g. "$5,000 - $25,000"' :
                                  form.category === "community_grant" ? 'e.g. "Up to $50,000"' :
                                  'e.g. "$5,000" or "Full tuition"'
                                }
                                style={inputStyle}
                              />
                            </div>
                            <div>
                              <Label required>Deadline</Label>
                              <input
                                type="date"
                                value={form.deadline}
                                onChange={(e) => set("deadline", e.target.value)}
                                style={inputStyle}
                              />
                            </div>
                          </div>

                          <div>
                            <Label required hint="Who is this opportunity for?">Eligibility</Label>
                            <textarea
                              value={form.eligibility}
                              onChange={(e) => set("eligibility", e.target.value)}
                              placeholder={
                                form.category === "business_grant" ? "Indigenous-owned businesses registered in Canada, operating for less than 5 years..." :
                                form.category === "community_grant" ? "First Nations, Métis, or Inuit communities with population under 5,000..." :
                                form.category === "bursary" ? "Indigenous students enrolled full-time in a recognized post-secondary institution who demonstrate financial need..." :
                                "e.g. Indigenous students enrolled in post-secondary education in Canada..."
                              }
                              rows={3}
                              maxLength={1000}
                              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }}
                            />
                          </div>

                          {/* Requirements chips */}
                          <div>
                            <Label hint="Specific documents or criteria applicants need (optional)">Requirements</Label>
                            {form.requirements.length > 0 && (
                              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
                                {form.requirements.map((r, i) => (
                                  <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", background: "rgba(13,148,136,0.08)", color: "var(--teal)", borderRadius: 8, fontSize: 13, fontWeight: 500 }}>
                                    {r}
                                    <button
                                      type="button"
                                      onClick={() => removeRequirement(i)}
                                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--teal)", opacity: 0.7, fontSize: 14 }}
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                            {form.requirements.length < 10 && (
                              <div style={{ display: "flex", gap: 8 }}>
                                <input
                                  type="text"
                                  value={newReq}
                                  onChange={(e) => setNewReq(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRequirement(); } }}
                                  placeholder="e.g. Proof of enrollment, letter of intent, transcript..."
                                  style={{ ...inputStyle, flex: 1 }}
                                />
                                <button
                                  type="button"
                                  onClick={addRequirement}
                                  disabled={!newReq.trim()}
                                  style={{
                                    padding: "0 14px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    background: newReq.trim() ? "rgba(13,148,136,0.08)" : "var(--bg)",
                                    color: newReq.trim() ? "var(--teal)" : "var(--text-muted)",
                                    border: `1.5px solid ${newReq.trim() ? "var(--teal)" : "var(--border)"}`,
                                    borderRadius: 9,
                                    cursor: newReq.trim() ? "pointer" : "default",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  + Add
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </Section>

                      {/* How to Apply */}
                      <Section title="How to Apply">
                        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                          {[
                            { id: "url", label: "Application Link" },
                            { id: "instructions", label: "Written Instructions" },
                          ].map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => set("applyMethod", m.id)}
                              style={{
                                padding: "7px 14px",
                                fontSize: 13,
                                fontWeight: 600,
                                background: form.applyMethod === m.id ? "rgba(13,148,136,0.08)" : "var(--bg)",
                                color: form.applyMethod === m.id ? "var(--teal)" : "var(--text-sec)",
                                border: `1.5px solid ${form.applyMethod === m.id ? "var(--teal)" : "var(--border)"}`,
                                borderRadius: 8,
                                cursor: "pointer",
                              }}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                        {form.applyMethod === "url" ? (
                          <input
                            type="url"
                            value={form.applicationUrl}
                            onChange={(e) => set("applicationUrl", e.target.value)}
                            placeholder="https://yourorg.com/apply"
                            style={inputStyle}
                          />
                        ) : (
                          <textarea
                            value={form.applicationInstructions}
                            onChange={(e) => set("applicationInstructions", e.target.value)}
                            placeholder="Describe how applicants should apply. Include mailing address, required documents, and any special instructions..."
                            rows={4}
                            maxLength={1500}
                            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }}
                          />
                        )}
                      </Section>

                      {/* Location & Contact */}
                      <Section title="Location & Contact">
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                          <div>
                            <Label hint="Where is this opportunity available?">Location</Label>
                            <input
                              type="text"
                              value={form.location}
                              onChange={(e) => set("location", e.target.value)}
                              placeholder="e.g. Canada-wide or Saskatchewan"
                              style={inputStyle}
                            />
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                            <div>
                              <Label hint="For applicant inquiries">Contact Email</Label>
                              <input
                                type="email"
                                value={form.contactEmail}
                                onChange={(e) => set("contactEmail", e.target.value)}
                                placeholder="scholarships@yourorg.ca"
                                style={inputStyle}
                              />
                            </div>
                            <div>
                              <Label>Contact Phone</Label>
                              <input
                                type="tel"
                                value={form.contactPhone}
                                onChange={(e) => set("contactPhone", e.target.value)}
                                placeholder="(306) 555-0100"
                                style={inputStyle}
                              />
                            </div>
                          </div>
                        </div>
                      </Section>
                    </div>

                    {/* Error Banner */}
                    {error && (
                      <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(220,38,38,.08)", border: "1px solid rgba(220,38,38,.25)", borderRadius: 10, color: "#DC2626", fontSize: 14, fontWeight: 500 }}>
                        {error}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center", marginTop: 20, padding: "16px 0" }}>
                      <button
                        onClick={() => router.push("/org/dashboard/scholarships")}
                        style={{ padding: "10px 20px", fontSize: 14, fontWeight: 500, background: "transparent", color: "var(--text-muted)", border: "none", cursor: "pointer", borderRadius: 9 }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSave("draft")}
                        disabled={saving}
                        style={{ padding: "10px 20px", fontSize: 14, fontWeight: 600, background: "var(--card)", color: "var(--text-sec)", border: "1.5px solid var(--border)", borderRadius: 9, cursor: saving ? "default" : "pointer", opacity: saving ? 0.5 : 1 }}
                      >
                        Save as Draft
                      </button>
                      <button
                        onClick={() => handleSave("active")}
                        disabled={!isValid || saving}
                        style={{
                          padding: "10px 24px",
                          fontSize: 14,
                          fontWeight: 600,
                          background: isValid ? (activeCat?.color || "var(--teal)") : "var(--border)",
                          color: isValid ? "#fff" : "var(--text-muted)",
                          border: "none",
                          borderRadius: 9,
                          cursor: isValid ? "pointer" : "not-allowed",
                          opacity: saving ? 0.7 : 1,
                        }}
                      >
                        {saving ? "Publishing..." : "Publish"}
                      </button>
                    </div>
                  </div>

                  {/* Preview Column */}
                  {showPreview && (
                    <div style={{ width: 380, flexShrink: 0, position: "sticky", top: 88 }}>
                      <div style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden" }}>
                        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-sec)" }}>👁️ Feed Preview</span>
                        </div>
                        <div style={{ padding: 16 }}>
                          <PreviewCard form={form} />
                        </div>
                        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", background: "var(--bg)", fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
                          This is how your listing appears in the community feed
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </AppShell>
    </OrgRoute>
  );
}
