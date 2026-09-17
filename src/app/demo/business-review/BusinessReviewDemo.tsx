"use client";

import Link from "next/link";
import { useState } from "react";
import BusinessListingStatus from "@/components/business-review/BusinessListingStatus";
import BusinessReviewPanel from "@/components/business-review/BusinessReviewPanel";
import { businessListingIssues, getBusinessListingReview, newBusinessListingReview, reviewAfterProfileEdit, REVIEW_LABELS } from "@/lib/business-listing-review";
import { isOrganizationPubliclyVisible } from "@/lib/organization-profile";

const fixture: Record<string, unknown> = {
  id: "fictional-prairie-pathways", name: "Prairie Pathways — Demo Company", type: "business",
  description: "A fictional team providing event planning and communications for community organizations. Explore the listing review process without creating an account.",
  logoUrl: "https://example.invalid/fictional-logo.png", contactEmail: "hello@example.invalid",
  location: { city: "Saskatoon", province: "SK" }, services: ["Event planning", "Communications"], businessIdentity: "not_specified",
  onboardingComplete: true, emailVerified: true, directoryReview: newBusinessListingReview(),
};

export default function BusinessReviewDemo() {
  const [org, setOrg] = useState(fixture);
  const [view, setView] = useState("business");
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(String(fixture.description));
  const [notice, setNotice] = useState("");
  const review = getBusinessListingReview(org)!;
  const visible = isOrganizationPubliclyVisible(org);
  return <div className="min-h-screen bg-[#f4f7f8] px-4 py-6 text-[#153347] sm:px-8 sm:py-10">
    <div className="mx-auto max-w-6xl">
      <header className="mb-7 overflow-hidden rounded-3xl bg-[#102f43] p-6 text-white sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4"><Link href="/demo/employer?workspace=business" className="text-xl font-black tracking-wide text-white">IOPPS<span className="ml-2 text-teal-300">/ business</span></Link><span className="rounded-full border border-white/30 px-3 py-1 text-xs font-bold tracking-wide">INTERACTIVE PREVIEW</span></div>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-teal-200">Good work deserves to be seen</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">A clear path from profile to public.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">Try submitting a business, reviewing it, and seeing what appears in the directory. This fictional example stays in this browser visit. Nothing is published.</p>
        <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full bg-white/10 px-3 py-2">01 · Save your profile</span><span className="rounded-full bg-white/10 px-3 py-2">02 · IOPPS review</span><span className="rounded-full bg-white/10 px-3 py-2">03 · Get discovered</span></div>
      </header>
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Preview perspective">{[["business", "Business owner"], ["admin", "Admin review"], ["public", "Public directory"]].map(([key, name]) => <button type="button" key={key} aria-pressed={view === key} onClick={() => { setView(key); setNotice(""); }} className={`min-h-11 rounded-xl px-4 py-3 text-sm font-bold ${view === key ? "button-gradient text-white" : "border border-slate-300 button-gradient-soft text-slate-700"}`}>{name}</button>)}<button type="button" onClick={() => { setOrg({ ...fixture, directoryReview: newBusinessListingReview() }); setView("business"); setDescription(String(fixture.description)); setEditing(false); setNotice("Demo reset."); }} className="ml-auto min-h-11 px-3 text-sm font-semibold underline">Reset demo</button></nav>
      {notice && <p role="status" className="mb-4 rounded-xl bg-white p-4 text-sm text-teal-900">{notice}</p>}
      {view === "business" && <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)]"><div className="min-w-0"><BusinessListingStatus org={org} onEdit={() => setEditing(true)} onSubmit={async revision => {
        const next = { ...review, status: "pending" as const, submittedRevision: revision, submittedAt: new Date().toISOString(), approvedRevision: 0 };
        setOrg(previous => ({ ...previous, directoryReview: next })); setNotice("Submitted. Choose Admin review to try the next step."); return next;
      }} />{editing && <form className="rounded-2xl border border-slate-200 bg-white p-5" onSubmit={event => { event.preventDefault(); const updates = { description: description.trim() }; setOrg(previous => ({ ...previous, ...updates, directoryReview: reviewAfterProfileEdit(previous, updates) })); setNotice("Profile saved. Submit the updated version when you’re ready."); setEditing(false); }}><h2 className="text-xl font-bold">Update your sample profile</h2><label htmlFor="demo-business-description" className="mt-4 block text-sm font-bold">About the business</label><textarea id="demo-business-description" required rows={5} value={description} onChange={event => setDescription(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm" /><button type="submit" className="mt-4 min-h-11 rounded-xl button-gradient px-5 py-3 text-sm font-bold text-white">Save profile changes</button></form>}</div><aside className="rounded-2xl border border-slate-200 bg-white p-6"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-lg font-black text-teal-800">PP</span><h2 className="mt-4 text-lg font-bold">{String(org.name)}</h2><p className="mt-2 text-sm leading-6 text-slate-600">Saskatoon, Saskatchewan<br />Event planning · Communications</p><div className="mt-5 border-t border-slate-200 pt-5"><p className="text-xs font-bold uppercase tracking-wide text-teal-700">One account. Room to grow.</p><p className="mt-2 text-sm leading-6">Your listing review never prevents you from drafting a job or exploring your hiring tools.</p><Link href="/demo/employer?tab=Post%20a%20Job" className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-teal-800 underline">Try the employer dashboard →</Link></div></aside></div>}
      {view === "admin" && <div className="mx-auto max-w-3xl">{review.status !== "pending" && review.status !== "approved" && <p className="mb-4 rounded-xl bg-white p-4 text-sm">This listing is {REVIEW_LABELS[review.status].toLowerCase()}. Submit it from Business owner to make a review decision.</p>}<BusinessReviewPanel key={`${review.revision}-${review.status}`} item={{ org, review, issues: businessListingIssues(org), isPublic: visible, emailVerified: true }} onDecision={async (action, feedback) => {
        const status = action === "approve" ? "approved" as const : action === "reject" ? "rejected" as const : "changes_requested" as const;
        setOrg(previous => ({ ...previous, directoryReview: { ...review, status, feedback, reviewedAt: new Date().toISOString(), approvedRevision: status === "approved" ? review.revision : 0 } }));
        setNotice(`Decision saved: ${REVIEW_LABELS[status]}. Check Business owner for feedback or Public directory for visibility.`);
      }} /></div>}
      {view === "public" && <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-9"><p className="text-xs font-bold uppercase tracking-wide text-teal-700">Directory preview · fictional example</p>{visible ? <><h2 className="mt-3 text-2xl font-bold">{String(org.name)}</h2><p className="mt-2 text-sm text-slate-500">Saskatoon, Saskatchewan · Event planning and communications</p><p className="mt-5 whitespace-pre-wrap text-base leading-7">{String(org.description)}</p><p className="mt-5 text-sm">Public contact: hello@example.invalid</p><p className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500">Sample contact only. Review feedback and account information do not appear on public profiles.</p></> : <><h2 className="mt-3 text-2xl font-bold">This business is not in the directory yet</h2><p className="mt-3 text-sm leading-6">Only approved profiles appear publicly. Return to Business owner to submit or update the listing, then try Admin review.</p></>}</section>}
      <p className="mt-8 text-center text-xs leading-6 text-slate-500">Demo only · No account, payment or live business record is created.</p>
    </div>
  </div>;
}
