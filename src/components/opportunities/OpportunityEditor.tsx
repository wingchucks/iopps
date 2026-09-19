"use client";

import { useRef, useState } from "react";
import { CANADIAN_PROVINCES } from "@/lib/canadian-provinces";
import { EVENT_CATEGORIES, FUNDING_CATEGORIES, normalizeOpportunityInput, scholarshipDeadlineType, validateOpportunity, type OpportunityKind, type OpportunityRecord, type OpportunityStatus } from "@/lib/opportunity-posting";

const control = "mt-2 block min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700";
export const opportunityButton = "inline-flex min-h-11 items-center justify-center rounded-xl border button-gradient-soft px-4 py-2.5 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-wait disabled:opacity-50";
export const opportunityPrimary = `${opportunityButton} button-gradient`;
export class OpportunitySaveError extends Error {
  fields: Record<string, string>;
  constructor(message: string, fields: Record<string, string> = {}) { super(message); this.fields = fields; }
}
export default function OpportunityEditor({ kind, initial, onSave, onCancel, demo = false, getToken }: {
  kind: OpportunityKind;
  initial?: OpportunityRecord;
  onSave: (data: Record<string, unknown>, status: OpportunityStatus) => Promise<void>;
  onCancel: () => void;
  demo?: boolean;
  getToken?: () => Promise<string>;
}) {
  const event = kind === "events";
  const [form, setForm] = useState<Record<string, unknown>>(() => ({ category: event ? "Other" : "Scholarship", eventType: "Other", delivery: "in_person", deadlineType: "unknown", ...normalizeOpportunityInput(initial || {}), ...(initial && !event ? { deadlineType: scholarshipDeadlineType(initial) } : {}) }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);
  const val = (key: string) => Array.isArray(form[key]) ? (form[key] as string[]).join("\n") : String(form[key] ?? "");
  const set = (key: string, value: unknown) => { setForm(previous => ({ ...previous, [key]: value })); setReviewing(false); };
  function showErrors(fields: Record<string, string>, message = "Check the fields below, then try again.") {
    setErrors(fields); setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  }
  async function save(status: OpportunityStatus) {
    const checked = validateOpportunity(kind, form, status, initial || {});
    if (Object.keys(checked.errors).length) { showErrors(checked.errors); return; }
    setBusy(true); setError(""); setErrors({});
    try { await onSave(checked.data, status); }
    catch (caught) { showErrors(caught instanceof OpportunitySaveError ? caught.fields : {}, caught instanceof Error ? caught.message : "Changes could not save. Please try again."); }
    finally { setBusy(false); }
  }
  function review() {
    const checked = validateOpportunity(kind, form, "active", initial || {});
    if (Object.keys(checked.errors).length) { showErrors(checked.errors); return; }
    setErrors({}); setError(""); setReviewing(true);
    requestAnimationFrame(() => { reviewRef.current?.focus(); reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); });
  }
  async function upload(file?: File) {
    if (!file || !getToken) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) { showErrors({}, "Choose an image smaller than 5 MB."); return; }
    setUploading(true); setError("");
    try {
      const body = new FormData(); body.append("file", file); body.append("folder", `${kind}/posters`);
      const response = await fetch("/api/employer/upload", { method: "POST", headers: { Authorization: `Bearer ${await getToken()}` }, body });
      const payload = await response.json();
      if (!response.ok || !payload.url) throw new Error(payload.error || "The image could not upload. Try again.");
      set("imageUrl", payload.url);
    } catch (caught) { showErrors({}, caught instanceof Error ? caught.message : "The image could not upload."); }
    finally { setUploading(false); }
  }
  function field(key: string, label: string, options: { type?: string; options?: readonly (string | readonly [string, string])[]; help?: string; required?: boolean; multiline?: boolean } = {}) {
    const id = `${kind}-${key}`;
    const props = { id, name: key, value: val(key), onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(key, e.target.value), className: control, "aria-invalid": !!errors[key], "aria-describedby": `${id}-help`, "aria-required": options.required || undefined };
    return <div className="min-w-0" key={key}>
      <label htmlFor={id} className="block text-sm font-bold text-slate-800">{label}{options.required && <span className="ml-1 text-teal-800">*</span>}</label>
      {options.options ? <select {...props}>{options.options.map(option => typeof option === "string" ? <option key={option}>{option}</option> : <option key={option[0]} value={option[0]}>{option[1]}</option>)}{val(key) && !options.options.some(option => (typeof option === "string" ? option : option[0]) === val(key)) && <option value={val(key)}>{val(key)}</option>}</select>
        : options.multiline ? <textarea {...props} rows={key === "description" ? 5 : 3} /> : <input {...props} type={options.type || "text"} />}
      <p id={`${id}-help`} className={`mt-1.5 text-xs leading-relaxed ${errors[key] ? "font-semibold text-red-700" : "text-slate-600"}`}>{errors[key] || options.help || ""}</p>
    </div>;
  }
  return <form noValidate onSubmit={e => { e.preventDefault(); review(); }} className="space-y-6 text-slate-900">
    <header>
      <p className="text-xs font-bold uppercase tracking-widest text-teal-700">{initial ? "Edit your listing" : "Share an opportunity"}</p>
      <h2 className="mt-2 text-2xl font-extrabold">{event ? "Bring people together." : "Help someone take their next step."}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">Start with a title and save a private draft. Fields marked * are needed to publish. Contact details entered here will be public when published.</p>
      {initial?.status === "active" && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">This listing is live. Publishing updates it; saving as a draft removes it from public view.</p>}
    </header>
    {error && <div ref={errorRef} tabIndex={-1} role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p className="font-bold">{error}</p>{Object.keys(errors).length > 0 && <p className="mt-1">{Object.keys(errors).length} field{Object.keys(errors).length === 1 ? " needs" : "s need"} attention.</p>}</div>}
    <fieldset disabled={busy || uploading} className="min-w-0 space-y-6 disabled:opacity-60">
      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <h3 className="text-lg font-bold">01 / The essentials</h3>
        {field("title", event ? "Event title" : "Opportunity title", { required: true })}
        {field(event ? "eventType" : "category", "Type", { options: event ? EVENT_CATEGORIES : FUNDING_CATEGORIES, required: true })}
        {field("description", "Description", { multiline: true, required: true, help: event ? "What can people expect? Include accessibility, audience and useful arrival information." : "Explain the support offered and what applicants should know." })}
      </section>
      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <h3 className="text-lg font-bold">02 / {event ? "When and where" : "Funding and eligibility"}</h3>
        {event ? <>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">{field("startDate", "Start date", { type: "date", required: true })}{field("endDate", "End date", { type: "date", help: "Leave blank for a one-day event." })}</div>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">{field("startTime", "Start time", { type: "time" })}{field("endTime", "End time", { type: "time" })}</div>
          {field("timeZone", "Event time zone", { options: [["", "Choose if adding times"], ["America/St_Johns", "Newfoundland — St. John’s"], ["America/Halifax", "Atlantic — Halifax"], ["America/Toronto", "Eastern — Toronto"], ["America/Winnipeg", "Central — Winnipeg"], ["America/Regina", "Saskatchewan — Regina"], ["America/Edmonton", "Mountain — Edmonton"], ["America/Vancouver", "Pacific — Vancouver"], ["America/Whitehorse", "Yukon — Whitehorse"]], help: "Choose the zone used by the venue or organizer." })}
          {field("delivery", "How people attend", { options: [["in_person", "In person"], ["online", "Online"], ["hybrid", "In person and online"]] })}
        </> : <>
          {field("amount", "Amount or support offered", { required: true, help: "Examples: $2,000; Up to $10,000; Amount varies." })}
          {field("deadlineType", "Application deadline", { options: [["unknown", "Confirm with provider"], ["date", "Specific date"], ["rolling", "Rolling applications"]] })}
          {val("deadlineType") === "date" && field("deadline", "Apply by", { type: "date", required: true })}
          {field("eligibility", "Who can apply?", { required: true, multiline: true, help: "Describe actual eligibility. Include Indigenous eligibility only when the provider specifies it." })}
        </>}
        {(!event || val("delivery") !== "online") && <>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">{field("province", event ? "Province or territory" : "Province or territory (if limited)", { options: [["", event ? "Choose a province or territory" : "Not specified / multiple regions"], ...CANADIAN_PROVINCES] })}{field("city", "City or community")}</div>
          {event && field("venue", "Venue or address")}
          {field("location", event ? "Additional location details" : "Eligible locations", { help: event ? "Optional directions, community name or venue notes." : "Explain Canada-wide or multi-region eligibility; leaving a province blank does not imply eligibility everywhere." })}
        </>}
      </section>
      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <h3 className="text-lg font-bold">03 / {event ? "Registration and contact" : "How to apply"}</h3>
        {event ? <>
          {field("price", "Admission or ticket price", { help: "For example: Free; $20; Donations welcome. Leave blank if not confirmed." })}
          {field("sourceUrl", "Official event information", { type: "url", help: "Link to the organizer’s event page so visitors can confirm the details." })}
          {field("rsvpLink", "Registration or event website", { type: "url", help: "Use the full https:// link. Visitors will open the organizer’s website." })}
        </> : <>
          {field("applicationUrl", "Application website", { type: "url", help: "Use the full https:// link to the provider’s application page." })}
          {field("applicationInstructions", "Application instructions", { multiline: true, help: "Explain the steps, documents and submission method. Add a link, instructions or contact email." })}
          {field("requirements", "Required documents", { multiline: true, help: "One item per line, if applicable." })}
        </>}
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">{field("contactEmail", "Public contact email", { type: "email" })}{field("contactPhone", "Public contact phone", { type: "tel" })}</div>
        {field("contactName", "Public contact name")}
      </section>
      <details className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <summary className="min-h-11 cursor-pointer font-bold">Optional details and poster</summary>
        <div className="mt-4 space-y-5">
          {!event && <>
            {field("educationLevel", "Education level")}{field("fieldOfStudy", "Fields of study", { multiline: true, help: "One per line; leave blank if not restricted." })}
            {field("priorityGroups", "Priority groups", { multiline: true, help: "Only include priorities confirmed by the provider." })}
            {val("category") === "Business Grant" && <>{field("businessStage", "Business stage")}{field("fundingUse", "Eligible uses of funding", { multiline: true })}{field("matchingFunds", "Matching contribution")}</>}
            {val("category") === "Community Grant" && <>{field("applicantType", "Eligible applicant types", { multiline: true })}{field("projectType", "Eligible project types", { multiline: true })}{field("reportingRequired", "Reporting requirements")}</>}
          </>}
          {event && field("highlights", "Event highlights", { multiline: true, help: "One highlight per line." })}
          {field("imageUrl", "Poster image link", { type: "url", help: "Optional. Only use images you have permission to share." })}
          {!demo && getToken && <label className="block text-sm font-bold">Or upload a poster<input type="file" accept="image/*" onChange={e => void upload(e.target.files?.[0])} className={`${control} text-sm`} /> <span className="mt-2 block text-xs font-normal text-slate-600">{uploading ? "Uploading…" : "Image files, up to 5 MB."}</span></label>}
        </div>
      </details>
      {reviewing && <section ref={reviewRef} tabIndex={-1} className="rounded-2xl border border-teal-300 bg-teal-50 p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-teal-800">Review before publishing</p>
        <h3 className="mt-2 break-words text-xl font-extrabold">{val("title")}</h3>
        <p className="mt-2 text-sm font-semibold">{event ? [val("eventType"), val("startDate"), val("endDate") && `to ${val("endDate")}`].filter(Boolean).join(" · ") : [val("category"), val("amount"), val("deadlineType") === "date" ? `Apply by ${val("deadline")}` : val("deadlineType") === "rolling" ? "Rolling applications" : "Confirm deadline with provider"].join(" · ")}</p>
        <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed">{val("description")}</p>
        {!event && <p className="mt-3 whitespace-pre-line text-sm"><strong>Eligibility: </strong>{val("eligibility")}</p>}
        <p className="mt-3 break-words text-sm">{val("delivery") === "online" ? "Online" : [val("venue"), val("city"), val("province"), val("location")].filter(Boolean).join(", ")}</p>
        <p className="mt-3 break-words text-sm">{event ? val("rsvpLink") : val("applicationUrl") || val("applicationInstructions")}</p>
        <p className="mt-2 break-words text-sm">{[val("contactName"), val("contactEmail"), val("contactPhone")].filter(Boolean).join(" · ")}</p>
        <p className="mt-4 border-t border-teal-200 pt-4 text-sm">Publishing makes this information visible to everyone on IOPPS.</p>
        <button type="button" className={`${opportunityPrimary} mt-4 w-full sm:w-auto`} onClick={() => void save("active")}>{demo ? "Publish in demo" : initial?.status === "active" ? "Publish changes" : "Publish listing"}</button>
      </section>}
      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:flex-wrap">
        <button type="button" className={opportunityButton} onClick={onCancel}>Back to listings</button>
        <button type="button" className={opportunityButton} onClick={() => void save("draft")}>{busy ? "Saving…" : initial?.status === "active" ? "Unpublish and save draft" : "Save private draft"}</button>
        <button type="submit" className={opportunityPrimary}>Review listing</button>
      </div>
    </fieldset>
  </form>;
}
