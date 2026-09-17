"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { LISTING_REVIEW_STATUSES, REVIEW_LABELS, type ListingReviewStatus } from "@/lib/business-listing-review";
import BusinessReviewPanel, { type ListingReviewItem, type ReviewAction } from "@/components/business-review/BusinessReviewPanel";

export default function BusinessReviewsPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<ListingReviewStatus>("pending");
  const [items, setItems] = useState<ListingReviewItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async (cursor?: string, signal?: AbortSignal) => {
    if (!user) return;
    setBusy(true); setError("");
    try {
      const query = new URLSearchParams({ status, ...(cursor ? { cursor } : {}) });
      const response = await fetch(`/api/admin/business-reviews?${query}`, { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load reviews.");
      if (signal?.aborted) return;
      setItems(current => cursor ? [...current, ...result.listings] : result.listings);
      setNextCursor(result.nextCursor);
      if (!cursor) setSelected(null);
    } catch (err) { if (!signal?.aborted) setError(err instanceof Error ? err.message : "Unable to load reviews."); }
    finally { if (!signal?.aborted) setBusy(false); }
  }, [user, status]);
  useEffect(() => { const controller = new AbortController(); void load(undefined, controller.signal); return () => controller.abort(); }, [load]);
  const item = items.find(entry => entry.org.id === selected);
  async function decide(action: ReviewAction, feedback: string) {
    if (!user || !item?.review) return;
    const response = await fetch("/api/admin/business-reviews", {
      method: "POST", headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: item.org.id, revision: item.review.revision, status: item.review.status, action, feedback }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to save decision.");
    setNotice(`${String(item.org.name)}: ${REVIEW_LABELS[result.review.status as ListingReviewStatus]}. The owner can see this update in their dashboard.`);
    await load();
  }
  return <div className="mx-auto max-w-7xl space-y-6">
    <div><p className="text-xs font-bold uppercase tracking-widest text-teal-600">Business directory</p><h1 className="mt-2 text-3xl font-bold">Listing reviews</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">Review what businesses share before it appears publicly. Account access and job posting are managed separately.</p></div>
    <div className="flex flex-wrap items-end gap-4"><label className="text-sm font-semibold">Review status<select value={status} onChange={event => { setStatus(event.target.value as ListingReviewStatus); setItems([]); setSelected(null); setNotice(""); }} className="mt-2 block min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-900">{LISTING_REVIEW_STATUSES.map(value => <option key={value} value={value}>{REVIEW_LABELS[value]}</option>)}</select></label><button type="button" disabled={busy} onClick={() => load()} className="button-gradient-soft min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">Refresh queue</button></div>
    {notice && <p role="status" className="rounded-xl bg-teal-50 p-4 text-sm text-teal-900">{notice}</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-900">{error} Use Refresh queue to try again.</p>}
    {busy && <p role="status">Loading listings…</p>}
    {!busy && !error && !items.length && <div className="rounded-2xl border border-dashed border-slate-300 p-8"><h2 className="text-xl font-bold">No listings {status === "pending" ? "waiting for review" : "with this status"}</h2><p className="mt-2 text-sm">Submitted profiles appear here when businesses are ready.</p></div>}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(240px,1fr)_minmax(0,2fr)]"><div className="min-w-0 space-y-3">{items.map(entry => <button type="button" key={String(entry.org.id)} onClick={() => setSelected(String(entry.org.id))} aria-pressed={selected === entry.org.id} className={`w-full rounded-xl border p-4 text-left ${selected === entry.org.id ? "border-teal-600 bg-teal-50 text-teal-950" : "border-slate-200 bg-white text-slate-800"}`}><span className="block break-words font-bold">{String(entry.org.name)}</span><span className="mt-1 block text-sm">{entry.review ? REVIEW_LABELS[entry.review.status] : "—"} · Version {entry.review?.revision}</span></button>)}{nextCursor && <button type="button" disabled={busy} onClick={() => load(nextCursor)} className="button-gradient-soft min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold">Load more listings</button>}</div>{item ? <BusinessReviewPanel key={`${item.org.id}-${item.review?.revision}-${item.review?.status}`} item={item} onDecision={decide} /> : items.length > 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm">Choose a listing to read its saved profile and make a decision.</p> : null}</div>
  </div>;
}
