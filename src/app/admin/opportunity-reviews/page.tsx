"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { getEventDisplayDates } from "@/lib/public-events";

type Listing = Record<string, unknown> & { id: string; kind: "events" | "scholarships"; title?: string; revision: number };
type Action = "approve" | "changes_requested" | "reject";

const text = (value: unknown) => (typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "");
const safeLink = (value: unknown) => /^(https?:|mailto:)/i.test(text(value)) ? text(value) : "";

export default function OpportunityReviewsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Listing[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async (signal?: AbortSignal) => {
    if (!user) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/opportunity-reviews", { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load reviews.");
      if (!signal?.aborted) { setItems(result.listings); setSelected(null); }
    } catch (err) { if (!signal?.aborted) setError(err instanceof Error ? err.message : "Unable to load reviews."); }
    finally { if (!signal?.aborted) setBusy(false); }
  }, [user]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  const key = (item: Listing) => `${item.kind}:${item.id}`;
  const item = items.find(entry => key(entry) === selected);
  async function decide(listing: Listing, action: Action, feedback: string) {
    if (!user) return;
    const response = await fetch("/api/admin/opportunity-reviews", {
      method: "POST", headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ kind: listing.kind, id: listing.id, revision: listing.revision, action, feedback }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to save decision.");
    setNotice(`${text(listing.title) || "Listing"}: ${action === "approve" ? "approved and published. This organization's later free listings publish immediately." : action === "reject" ? "not approved." : "sent back for changes."} The organization sees this in its dashboard.`);
    await load();
  }
  return <div className="mx-auto max-w-7xl space-y-6">
    <div><p className="text-xs font-bold uppercase tracking-widest text-teal-400">Events &amp; scholarships</p><h1 className="mt-2 text-3xl font-bold text-[var(--text)]">First listing reviews</h1><p className="mt-2 max-w-3xl text-sm text-[var(--text-sec)]">An organization&apos;s first free event or scholarship waits here before it appears publicly. After one approval, its later free listings publish immediately. Paid job posts are not reviewed here.</p></div>
    <button type="button" disabled={busy} onClick={() => load()} className="button-gradient-soft min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">Refresh queue</button>
    {notice && <p role="status" className="rounded-xl bg-teal-50 p-4 text-sm text-teal-900">{notice}</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-900">{error} Use Refresh queue to try again.</p>}
    {busy && <p role="status" className="text-[var(--text)]">Loading listings…</p>}
    {!busy && !error && !items.length && <div className="rounded-2xl border border-dashed border-slate-400 p-8 text-[var(--text)]"><h2 className="text-xl font-bold">Nothing waiting for review</h2><p className="mt-2 text-sm text-[var(--text-sec)]">An organization&apos;s first free event or scholarship appears here when it is submitted.</p></div>}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(240px,1fr)_minmax(0,2fr)]">
      <div className="min-w-0 space-y-3">{items.map(entry => <button type="button" key={key(entry)} onClick={() => setSelected(key(entry))} aria-pressed={selected === key(entry)} className={`w-full rounded-xl border p-4 text-left ${selected === key(entry) ? "border-teal-600 bg-teal-50 text-teal-950" : "border-slate-200 bg-white text-slate-800"}`}><span className="block break-words font-bold">{text(entry.title) || "Untitled listing"}</span><span className="mt-1 block text-sm">{entry.kind === "events" ? "Event" : "Scholarship"} · {text(entry.orgName) || "Organization"}</span>{text(entry.reviewRequestedAt) && <span className="mt-1 block text-xs text-slate-600">Submitted {new Date(text(entry.reviewRequestedAt)).toLocaleString()}</span>}</button>)}</div>
      {item ? <ReviewPanel key={`${key(item)}-${item.revision}`} item={item} onDecision={(action, feedback) => decide(item, action, feedback)} /> : items.length > 0 ? <p className="rounded-xl border border-dashed border-slate-400 p-6 text-sm text-[var(--text)]">Choose a listing to read it and make a decision.</p> : null}
    </div>
  </div>;
}

function ReviewPanel({ item, onDecision }: { item: Listing; onDecision: (action: Action, feedback: string) => Promise<void> }) {
  const [feedback, setFeedback] = useState("");
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const event = item.kind === "events";
  const facts: Array<[string, string]> = [
    ["Organization", text(item.orgName)],
    [event ? "Dates" : "Deadline", event ? getEventDisplayDates(item as Parameters<typeof getEventDisplayDates>[0]) : text(item.deadline)],
    ["Location", item.delivery === "online" ? "Online" : [item.venue, item.city, item.province, item.location].map(text).filter(Boolean).join(", ")],
    [event ? "Admission" : "Amount", text(event ? item.price : item.amount)],
    ["Category", text(item.category || item.eventType)],
  ].filter((fact): fact is [string, string] => Boolean(fact[1]));
  const links = [["Application or registration", safeLink(item.applicationUrl || item.rsvpLink)], ["Source", safeLink(item.sourceUrl)], ["Poster", safeLink(item.imageUrl)]].filter(([, href]) => href);
  async function decide(action: Action) {
    setError("");
    if (action !== "approve" && feedback.trim().length < 10) { setError("Please give the organization a specific reason, at least 10 characters long."); return; }
    setBusy(true);
    try { await onDecision(action, feedback.trim()); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to save decision."); setBusy(false); }
  }
  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 text-slate-800 sm:p-7" aria-label="Listing review details">
    <p className="text-xs font-bold uppercase tracking-widest text-teal-700">{event ? "Event" : "Scholarship"} · First free listing · Version {item.revision}</p>
    <h2 className="mt-2 break-words text-2xl font-bold text-[#112c3f]">{text(item.title) || "Untitled listing"}</h2>
    <p className="mt-2 text-sm text-slate-600">Check that the organization and the listing are real and that the dates, links and costs make sense. Approval publishes it and lets this organization&apos;s later free listings publish without review.</p>
    {text(item.orgId) && <Link href={`/admin/employers/${encodeURIComponent(text(item.orgId))}`} className="mt-2 inline-block text-sm font-semibold text-teal-800 underline">Open the organization in admin</Link>}
    <dl className="mt-6 grid min-w-0 gap-5 sm:grid-cols-2">{facts.map(([label, value]) => <div key={label}><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm">{value}</dd></div>)}</dl>
    {["description", "eligibility", "applicationInstructions"].filter(field => text(item[field])).map(field => <div key={field} className="mt-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{field === "description" ? "Description" : field === "eligibility" ? "Eligibility" : "How to apply"}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">{text(item[field])}</p></div>)}
    {links.length > 0 && <ul className="mt-5 space-y-1 text-sm">{links.map(([label, href]) => <li key={label}>{label}: <a href={href} target="_blank" rel="noopener noreferrer" className="break-all text-teal-800 underline">{href} ↗</a></li>)}</ul>}
    <div className="mt-6 border-t border-slate-200 pt-6">
      <label className="block text-sm font-semibold" htmlFor="opportunity-review-feedback">Feedback for the organization <span className="font-normal">(required for changes or rejection)</span></label>
      <textarea id="opportunity-review-feedback" maxLength={2000} rows={3} value={feedback} onChange={e => setFeedback(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900" placeholder="Explain what to update before it can be published." />
      <label className="mt-4 flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-teal-700" />I checked the organization, the listing details and its links.</label>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={() => decide("approve")} disabled={busy || !checked} className="min-h-11 rounded-xl button-gradient px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Approve and publish</button>
        <button type="button" onClick={() => decide("changes_requested")} disabled={busy} className="button-gradient-soft min-h-11 rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold disabled:opacity-50">Request changes</button>
        <button type="button" onClick={() => decide("reject")} disabled={busy} className="min-h-11 rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-800 disabled:opacity-50">Reject listing</button>
      </div>
      {busy && <p role="status" className="mt-3 text-sm">Saving decision…</p>}
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-800">{error}</p>}
    </div>
  </section>;
}
