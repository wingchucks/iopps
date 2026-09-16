"use client";

import { useState } from "react";
import { businessListingIssues, getBusinessListingReview, REVIEW_LABELS, type BusinessListingReview } from "@/lib/business-listing-review";
import { isOrganizationPubliclyVisible } from "@/lib/organization-profile";

export default function BusinessListingStatus({ org, onSubmit, onEdit, onRefresh }: {
  org: Record<string, unknown>;
  onSubmit: (revision: number) => Promise<BusinessListingReview>;
  onEdit: () => void;
  onRefresh?: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const review = getBusinessListingReview(org);
  const isPublic = isOrganizationPubliclyVisible(org);
  const issues = businessListingIssues(org);
  const canSubmit = review && ["draft", "changes_requested", "rejected"].includes(review.status);
  const correctionNeeded = review && ["changes_requested", "rejected"].includes(review.status) && review.revision === review.submittedRevision;
  const title = isPublic ? "Your business is in the directory" : review?.status === "pending" ? "Your listing is with the IOPPS team" : review?.status === "changes_requested" ? "A few updates before you go live" : review?.status === "rejected" ? "Your listing needs attention" : review?.status === "approved" ? "Approved · currently hidden" : "Get your business ready to be discovered";
  async function run(action: () => Promise<unknown>) {
    setBusy(true); setError("");
    try { await action(); } catch (err) { setError(err instanceof Error ? err.message : "Please try again."); } finally { setBusy(false); }
  }
  return <section className="mb-6 rounded-2xl border border-[#b9ddd8] bg-[#f1faf8] p-5 text-[#173d43] sm:p-6" aria-label="Business listing status">
    <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider"><span>Business directory</span><span className="rounded-full bg-white px-3 py-1 text-[#174f50]">{review ? REVIEW_LABELS[review.status] : isPublic ? "Existing public listing" : "Profile setup"}</span></div>
    <h2 className="mt-3 text-xl font-bold text-[#112c3f]">{title}</h2>
    <p className="mt-2 max-w-3xl text-sm leading-6">{review?.status === "pending" ? "We’ll check your saved profile before it appears publicly. You can keep using your dashboard and job tools. Editing the profile returns it to draft so you can resubmit the changes." : "Save each profile section, then submit your listing for review. Your job tools stay available. Changes to a public profile take it out of the directory until the updated listing is approved."}</p>
    {review?.feedback && <div className="mt-4 rounded-xl border border-[#c7d9dd] bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide">Feedback from IOPPS</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{review.feedback}</p></div>}
    {canSubmit && issues.length > 0 && <div className="mt-4"><p className="text-sm font-bold">Before you submit</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{issues.map(issue => <li key={issue}>{issue}</li>)}</ul></div>}
    <div className="mt-4 flex flex-wrap gap-3">
      {canSubmit && <button type="button" disabled={busy || issues.length > 0 || Boolean(correctionNeeded)} onClick={() => run(() => onSubmit(review.revision))} className="min-h-11 rounded-xl bg-[#006b62] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Submitting…" : review.submittedAt ? "Resubmit for review" : "Submit for review"}</button>}
      <button type="button" onClick={onEdit} className="min-h-11 rounded-xl border border-[#8bb8b7] bg-white px-4 py-3 text-sm font-bold">Edit profile</button>
      {onRefresh && <button type="button" disabled={busy} onClick={() => run(onRefresh)} className="min-h-11 px-2 py-3 text-sm font-bold underline disabled:opacity-50">Refresh status</button>}
    </div>
    {correctionNeeded && <p className="mt-3 text-sm">Save your corrections before resubmitting.</p>}
    {error && <p role="alert" className="mt-3 break-words text-sm font-semibold text-[#9b2525]">{error}</p>}
    <p className="mt-4 text-xs leading-5">Directory approval checks listing quality. It does not certify Indigenous ownership or create an IOPPS partnership.</p>
  </section>;
}
