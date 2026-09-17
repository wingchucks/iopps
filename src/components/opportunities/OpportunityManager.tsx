"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import OpportunityEditor, { OpportunitySaveError, opportunityButton, opportunityPrimary } from "./OpportunityEditor";
import { type OpportunityKind, type OpportunityRecord, type OpportunityStatus } from "@/lib/opportunity-posting";
import { getEventDisplayDates } from "@/lib/public-events";
import { isJobRecordExpired } from "@/lib/listing-freshness";

export default function OpportunityManager({ kind, getToken, demo = false, initialNew = false, demoInitial = [] }: {
  kind: OpportunityKind; getToken?: () => Promise<string>; demo?: boolean; initialNew?: boolean; demoInitial?: OpportunityRecord[];
}) {
  const [items, setItems] = useState<OpportunityRecord[]>(demoInitial);
  const [loading, setLoading] = useState(!demo);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<OpportunityRecord | "new" | null>(initialNew ? "new" : null);
  const [requestId, setRequestId] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState("");
  const event = kind === "events";
  const load = useCallback(async () => {
    if (demo || !getToken) return;
    setLoading(true); setLoadError("");
    try {
      const response = await fetch(`/api/employer/${kind}`, { headers: { Authorization: `Bearer ${await getToken()}` }, cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Your listings could not load.");
      setItems(payload[kind]);
    } catch (error) { setLoadError(error instanceof Error ? error.message : "Your listings could not load."); }
    finally { setLoading(false); }
  }, [demo, getToken, kind]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (editing === "new" && !requestId) setRequestId(crypto.randomUUID()); }, [editing, requestId]);
  async function persist(data: Record<string, unknown>, status: OpportunityStatus, initial?: OpportunityRecord) {
    if (demo) {
      const id = initial?.id || crypto.randomUUID();
      const result = { ...initial, ...data, id, title: String(data.title || initial?.title || ""), status, active: status === "active", revision: (initial?.revision || 0) + 1 };
      setItems(previous => [result, ...previous.filter(item => item.id !== id)]);
      return;
    }
    if (!getToken) throw new Error("Sign in to save this listing.");
    const response = await fetch(`/api/employer/${kind}`, { method: initial ? "PATCH" : "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await getToken()}` }, body: JSON.stringify({ ...data, id: initial?.id, revision: initial?.revision || 0, status, requestId }) });
    const payload = await response.json();
    if (!response.ok) throw new OpportunitySaveError(payload.error || "Your changes could not save.", payload.fields);
    setItems(previous => [payload, ...previous.filter(item => item.id !== payload.id)]);
  }
  async function save(data: Record<string, unknown>, status: OpportunityStatus) {
    await persist(data, status, editing && editing !== "new" ? editing : undefined);
    setEditing(null); setRequestId(""); setFilter("all");
    setMessage(`${demo ? "Demo: " : ""}${status === "draft" ? "Private draft saved. It is not listed publicly." : "Listing published. You can edit or close it below."}`);
  }
  async function close(item: OpportunityRecord) {
    setBusy(item.id); setMessage("");
    try { await persist({}, "closed", item); setMessage(`${demo ? "Demo: " : ""}Listing closed and removed from public view. You can edit it to publish again.`); }
    catch (error) { setLoadError(error instanceof Error ? error.message : "The listing could not close."); }
    finally { setBusy(""); }
  }
  const filtered = items.filter(item => filter === "all" || item.status === filter);
  return <div className="min-w-0 rounded-2xl bg-slate-50 p-4 text-slate-900 sm:p-6">
    {editing ? <OpportunityEditor key={editing === "new" ? "new" : editing.id} kind={kind} initial={editing === "new" ? undefined : editing} demo={demo} getToken={getToken} onSave={save} onCancel={() => { setEditing(null); setRequestId(""); }} /> : <>
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div><p className="text-xs font-bold uppercase tracking-widest text-teal-700">Your organization · Community opportunities</p><h1 className="mt-2 text-2xl font-extrabold">{event ? "Events & gatherings" : "Scholarships & funding"}</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">{event ? "Create a place for people to connect. Manage the details from the first draft to the final day." : "Make support easier to find. Share clear eligibility, deadlines and application steps."}</p></div>
        <button className={`${opportunityPrimary} shrink-0`} onClick={() => { setEditing("new"); setMessage(""); setRequestId(crypto.randomUUID()); }}>+ {event ? "Create event" : "Create opportunity"}</button>
      </header>
      {message && <p role="status" className="mt-5 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">{message}</p>}
      {loadError && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadError}<button className={`${opportunityButton} ml-3`} onClick={() => void load()}>Reload listings</button></div>}
      <div className="my-6 flex flex-wrap gap-2" aria-label="Listing status">{[["all", "All"], ["draft", "Drafts"], ["active", "Published"], ["closed", "Closed"]].map(([value, label]) => <button key={value} aria-pressed={filter === value} className={filter === value ? opportunityPrimary : opportunityButton} onClick={() => setFilter(value)}>{label} <span className="ml-2 opacity-80">{items.filter(item => value === "all" || item.status === value).length}</span></button>)}</div>
      {loading ? <p role="status" className="py-8 text-sm">Loading your listings…</p> : !loadError && !filtered.length ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-7 text-center"><h2 className="text-lg font-bold">{filter === "all" ? "Your next opportunity starts here." : "No listings in this view."}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">Save a draft while you gather the details. Publish when you are ready for people to find it.</p></div> : <div className="space-y-3">{filtered.map(item => <article key={item.id} className="flex min-w-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${item.status === "active" ? "bg-teal-50 text-teal-800" : "bg-slate-100 text-slate-600"}`}>{item.status === "active" ? "Published" : item.status === "closed" ? "Closed" : "Private draft"}</span><h2 className="mt-2 break-words text-lg font-bold">{item.title}</h2><p className="mt-1 text-sm text-slate-600">{event ? getEventDisplayDates(item) || "Date to be confirmed" : isJobRecordExpired(item) ? "Intake closed — update the deadline for the next intake" : item.deadline ? `Deadline: ${item.deadline}` : "Confirm deadline with provider"}</p></div>
        <div className="flex shrink-0 flex-wrap gap-2"><button className={opportunityButton} onClick={() => { setEditing(item); setMessage(""); }}>Edit<span className="sr-only"> {item.title}</span></button>{item.status === "active" && <>{!demo && <Link className={opportunityButton} href={`/${kind}/${item.slug || item.id}`}>View public listing</Link>}<button disabled={!!busy} className={opportunityButton} onClick={() => void close(item)}>{busy === item.id ? "Closing…" : "Close listing"}</button></>}</div>
      </article>)}</div>}
    </>}
  </div>;
}
