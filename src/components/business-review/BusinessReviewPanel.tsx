"use client";

import { useState } from "react";
import { REVIEW_LABELS, type BusinessListingReview } from "@/lib/business-listing-review";

export interface ListingReviewItem {
  org: Record<string, unknown>;
  review: BusinessListingReview | null;
  issues: string[];
  isPublic: boolean;
  emailVerified: boolean;
}
export type ReviewAction = "approve" | "changes_requested" | "reject";
const label = (value: unknown): string => {
  if (Array.isArray(value)) return value.map(label).filter(Boolean).join(" · ");
  if (value && typeof value === "object") return Object.entries(value).map(([key, item]) => `${key}: ${label(item)}`).join(" · ");
  if (value === true) return "Yes";
  if (value === false) return "No";
  return value == null ? "" : String(value);
};
function ProfileValue({ value }: { value: unknown }) {
  if (Array.isArray(value)) return <>{value.map((item, index) => <span key={index} className="block"><ProfileValue value={item} /></span>)}</>;
  if (typeof value === "string" && /^https?:\/\//i.test(value)) return <a href={value} target="_blank" rel="noopener noreferrer" className="text-teal-800 underline">{value} ↗</a>;
  return <>{label(value)}</>;
}
const fieldLabels: Record<string, string> = { name: "Name", type: "Organization type", description: "About the business", tagline: "Tagline", location: "Location", services: "Services", businessIdentity: "Self-described identity", nation: "Nation or community", treatyTerritory: "Treaty or territory", communityAffiliation: "Community affiliation", indigenousGroups: "Affiliations", contactEmail: "Public email", phone: "Phone", website: "Website", socialLinks: "Social profiles", address: "Address", industry: "Industry", size: "Team size", foundedYear: "Founded", hours: "Hours", gallery: "Gallery links", logoUrl: "Logo link", logo: "Logo", bannerUrl: "Banner link", tags: "Tags", hiringStatus: "Hiring", partnershipInterests: "Partnership interests", videos: "Video links" };

export default function BusinessReviewPanel({ item, onDecision }: { item: ListingReviewItem; onDecision: (action: ReviewAction, feedback: string) => Promise<void> }) {
  const [feedback, setFeedback] = useState("");
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = item.review?.status === "pending";
  const actionable = pending || item.review?.status === "approved";
  async function decide(action: ReviewAction) {
    setError("");
    if (action !== "approve" && feedback.trim().length < 10) { setError("Please give the owner a specific reason, at least 10 characters long."); return; }
    setBusy(true);
    try { await onDecision(action, feedback.trim()); setFeedback(""); setChecked(false); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to save decision."); }
    finally { setBusy(false); }
  }
  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 text-slate-800 sm:p-7" aria-label="Listing review details">
    <p className="text-xs font-bold uppercase tracking-widest text-teal-700">Listing review · {item.review ? REVIEW_LABELS[item.review.status] : "Existing listing"} · Version {item.review?.revision ?? "—"}</p>
    <h2 className="mt-2 break-words text-2xl font-bold text-[#112c3f]">{label(item.org.name)}</h2>
    <p className="mt-2 text-sm text-slate-600">Check the saved profile, contact details and claims. Approval does not award a verified badge or certify Indigenous ownership.</p>
    <p className="mt-3 text-sm font-semibold">Sign-in email: {item.emailVerified ? "Confirmed" : "Not confirmed"} · Directory: {item.isPublic ? "Visible" : "Hidden"}</p>
    {item.review?.submittedAt && <p className="mt-1 text-xs text-slate-600">Submitted {new Date(item.review.submittedAt).toLocaleString()}</p>}
    <dl className="mt-6 grid min-w-0 gap-5 sm:grid-cols-2">{Object.entries(fieldLabels).filter(([key]) => label(item.org[key])).map(([key, title]) => <div key={key} className={key === "description" ? "sm:col-span-2" : ""}><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">{<ProfileValue value={item.org[key]} />}</dd></div>)}</dl>
    {item.issues.length > 0 && <div className="mt-5 rounded-xl bg-amber-50 p-4"><p className="font-bold">Profile needs attention</p><ul className="mt-2 list-disc pl-5 text-sm">{item.issues.map(issue => <li key={issue}>{issue}</li>)}</ul></div>}
    {item.review?.feedback && <p className="mt-5 whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm"><strong>Previous feedback: </strong>{item.review.feedback}</p>}
    {actionable && <div className="mt-6 border-t border-slate-200 pt-6">
      <label className="block text-sm font-semibold" htmlFor="review-feedback">Feedback for the business owner <span className="font-normal">(required for changes or rejection)</span></label>
      <textarea id="review-feedback" maxLength={2000} rows={3} value={feedback} onChange={event => setFeedback(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm" placeholder="Explain what to update and how to resubmit." />
      {pending && <label className="mt-4 flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-teal-700" />I reviewed the profile, its contact details and any ownership or affiliation claims.</label>}
      <div className="mt-5 flex flex-wrap gap-3">
        {pending && <button type="button" onClick={() => decide("approve")} disabled={busy || !checked || item.issues.length > 0 || !item.emailVerified} className="min-h-11 rounded-xl button-gradient px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Approve listing</button>}
        <button type="button" onClick={() => decide("changes_requested")} disabled={busy} className="button-gradient-soft min-h-11 rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold disabled:opacity-50">Request changes</button>
        <button type="button" onClick={() => decide("reject")} disabled={busy} className="min-h-11 rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-800 disabled:opacity-50">Reject listing</button>
      </div>
      {busy && <p role="status" className="mt-3 text-sm">Saving decision…</p>}
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-800">{error}</p>}
    </div>}
  </section>;
}
