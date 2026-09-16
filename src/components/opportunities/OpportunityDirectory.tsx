"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import DirectoryPagination, { useDirectoryFilter, useDirectoryFilterActions, useDirectoryPagination } from "@/components/DirectoryPagination";
import { CANADIAN_PROVINCES } from "@/lib/canadian-provinces";
import { getEventDisplayDates, getEventStartDate, normalizeEventTypeLabel } from "@/lib/public-events";
import { isJobRecordExpired } from "@/lib/listing-freshness";
import { displayLocation, displayAmount } from "@/lib/utils";
import { matchesEventDate, matchesFundingDeadline, opportunityProvince } from "@/lib/opportunity-discovery";
import { scholarshipDeadlineType, fundingTypeLabel, type OpportunityKind, type OpportunityRecord } from "@/lib/opportunity-posting";

const selectClass = "mt-2 min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700";
export default function OpportunityDirectory({ kind }: { kind: OpportunityKind }) {
  const events = kind === "events";
  const [items, setItems] = useState<OpportunityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useDirectoryFilter("q", "");
  const [province, setProvince] = useDirectoryFilter("province", "");
  const [category, setCategory] = useDirectoryFilter(events ? "type" : "category", "");
  const [when, setWhen] = useDirectoryFilter(events ? "date" : "deadline", "all");
  const [oldClosing] = useDirectoryFilter("closing", "");
  const [oldRolling] = useDirectoryFilter("rolling", "");
  const setFilters = useDirectoryFilterActions();
  const deadlineFilter = oldClosing === "1" ? "closing" : oldRolling === "1" ? "rolling" : when;
  const dateFilter = ({ "All Dates": "all", "This Week": "week", "This Month": "month", Upcoming: "upcoming" } as Record<string, string>)[when] || when;
  useEffect(() => {
    const abort = new AbortController();
    fetch(`/api/${kind}`, { signal: abort.signal, cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("We couldn’t load the listings. Please try again.");
      setItems((await response.json())[kind] || []);
    }).catch(caught => { if (!abort.signal.aborted) setError(caught instanceof Error ? caught.message : "Could not load listings."); }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [kind, attempt]);
  const label = (item: OpportunityRecord) => events ? normalizeEventTypeLabel(String(item.eventType || item.category || "Other")) : fundingTypeLabel(item);
  const categories = [...new Set(items.map(label))].sort();
  const filtered = useMemo(() => items.filter(item => {
    const text = [item.title, item.orgName, item.description, item.eligibility, item.category, item.city, item.province, displayLocation(item.location)].join(" ").toLowerCase();
    return (!search.trim() || text.includes(search.trim().toLowerCase())) && (!province || opportunityProvince(item) === province) && (!category || (events ? normalizeEventTypeLabel(String(item.eventType || item.category || "Other")) : fundingTypeLabel(item)) === category) && (events ? matchesEventDate(item, dateFilter) : matchesFundingDeadline(item, deadlineFilter));
  }).sort((a, b) => events ? (getEventStartDate(a)?.getTime() || Infinity) - (getEventStartDate(b)?.getTime() || Infinity) : Number(isJobRecordExpired(a)) - Number(isJobRecordExpired(b))), [items, search, province, category, events, dateFilter, deadlineFilter]);
  const { page, pageItems, totalPages, setPage } = useDirectoryPagination(filtered, 12);
  function clear() { setFilters({ q: null, province: null, type: null, category: null, date: null, deadline: null, closing: null, rolling: null, eligibility: null, location: null }); }
  return <AppShell><main className="min-h-screen bg-[#f5f7f6] text-slate-900">
    <section className="relative overflow-hidden bg-[#102d42] px-4 py-10 sm:px-8 sm:py-14">
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full border-[40px] border-teal-400/10 sm:size-[440px]" />
      <div className="relative mx-auto max-w-6xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">IOPPS · Community connections</p><h1 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight text-white sm:text-5xl">{events ? "Find your next gathering." : "Support for your next chapter."}</h1><p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-200">{events ? "Powwows, conferences, career fairs and community events. Find a place to learn, celebrate and connect." : "Explore scholarships, bursaries and grants supporting Indigenous learners, entrepreneurs and communities. Check each provider’s eligibility before applying."}</p><Link href={`/org/dashboard/${kind}/new`} className="mt-6 inline-flex min-h-11 items-center rounded-xl border border-cyan-200/40 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20">{events ? "Share an event" : "Share a funding opportunity"} <span className="ml-3">↗</span></Link></div>
    </section>
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-8 sm:py-9">
      <section aria-label="Find opportunities" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <label className="min-w-0 text-xs font-bold uppercase tracking-wide text-slate-600">Search<input type="search" aria-label={events ? "Search events" : "Search scholarships and funding"} value={search} onChange={e => setSearch(e.target.value)} placeholder={events ? "Event, community or organizer" : "Funding, provider or eligibility"} className={selectClass} /></label>
          <label className="min-w-0 text-xs font-bold uppercase tracking-wide text-slate-600">Province or territory<select value={province} onChange={e => setProvince(e.target.value)} className={selectClass}><option value="">All provinces & territories</option>{CANADIAN_PROVINCES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
          <label className="min-w-0 text-xs font-bold uppercase tracking-wide text-slate-600">Type<select value={category} onChange={e => setCategory(e.target.value)} className={selectClass}><option value="">All types</option>{categories.map(value => <option key={value}>{value}</option>)}</select></label>
          <label className="min-w-0 text-xs font-bold uppercase tracking-wide text-slate-600">{events ? "When" : "Deadline"}<select value={events ? dateFilter : deadlineFilter} onChange={e => events ? setWhen(e.target.value) : setFilters({ deadline: e.target.value === "all" ? null : e.target.value, closing: null, rolling: null })} className={selectClass}>{(events ? [["all", "All current listings"], ["upcoming", "Upcoming & happening now"], ["week", "Next 7 days"], ["month", "This month"], ["unconfirmed", "Date to be confirmed"]] : [["all", "All deadlines"], ["closing", "Closing in 14 days"], ["rolling", "Rolling applications"], ["unknown", "Confirm with provider"], ["closed", "Intake closed"]]).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4"><p className="text-xs text-slate-500">{events ? "Event details can change. Confirm with the organizer before travelling." : "An unspecified deadline does not mean applications are always open."}</p><button type="button" className="min-h-11 text-sm font-bold text-teal-800 underline underline-offset-4" onClick={clear}>Clear filters</button></div>
      </section>
      <div className="my-6 flex flex-wrap items-end justify-between gap-2"><h2 id="directory-results" tabIndex={-1} className="text-xl font-extrabold">{events ? "What’s happening" : "Explore opportunities"}</h2><p aria-live="polite" className="text-sm text-slate-600">{loading ? "Loading listings…" : error ? "Listings unavailable" : `${filtered.length} ${filtered.length === 1 ? "opportunity" : "opportunities"}`}</p></div>
      {loading ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading listings">{[1, 2, 3].map(n => <div key={n} className="h-64 animate-pulse rounded-2xl bg-slate-200 motion-reduce:animate-none" />)}</div> : error ? <div role="alert" className="rounded-2xl border border-red-200 bg-white p-7 text-center"><h3 className="text-lg font-bold">Listings couldn’t load</h3><p className="mt-2 text-sm text-slate-600">{error}</p><button className="mt-4 min-h-11 rounded-xl bg-teal-700 px-5 font-bold text-white" onClick={() => { setLoading(true); setError(""); setAttempt(n => n + 1); }}>Try again</button></div> : !pageItems.length ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center"><h3 className="text-xl font-bold">No matches just yet.</h3><p className="mt-2 text-sm text-slate-600">Try another type, province or search term.</p><button className="mt-5 min-h-11 rounded-xl bg-teal-700 px-5 font-bold text-white" onClick={clear}>Show all opportunities</button></div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{pageItems.map(item => {
        const closed = !events && isJobRecordExpired(item), deadlineType = scholarshipDeadlineType(item), location = item.delivery === "online" ? "Online" : displayLocation(item.location) || [item.city, item.province].filter(Boolean).join(", ");
        const date = getEventStartDate(item);
        return <article key={item.id} className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between gap-3"><span className="max-w-full break-words rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-800">{label(item)}</span>{events && date && <span className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-center"><span className="block text-[10px] font-bold uppercase text-teal-700">{date.toLocaleDateString("en-CA", { month: "short" })}</span><span className="block text-xl font-extrabold leading-tight">{date.getDate()}</span></span>}</div>
          <h3 className="mt-4 break-words text-xl font-extrabold leading-snug"><Link className="hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700" href={`/${kind}/${item.slug || item.id}`}>{item.title}</Link></h3>
          {item.orgName ? <p className="mt-2 break-words text-sm text-slate-600">{String(item.orgName)}</p> : null}
          {!events && <p className={`mt-5 font-extrabold text-teal-800 ${displayAmount(item.amount).length > 36 ? "text-lg" : "text-2xl"}`}>{displayAmount(item.amount) || "Amount not specified"}</p>}
          <p className={`mt-4 text-sm font-semibold ${closed ? "text-amber-800" : "text-slate-800"}`}>{events ? getEventDisplayDates(item) || "Date to be confirmed" : closed ? "Intake closed" : deadlineType === "rolling" ? "Rolling applications" : deadlineType === "date" ? `Apply by ${item.deadline}` : "Confirm deadline with provider"}</p>
          {location && <p className="mt-1 break-words text-sm text-slate-600">{location}</p>}
          <p className="mb-5 mt-3 line-clamp-3 break-words text-sm leading-relaxed text-slate-600">{String(!events && item.eligibility || item.description || "View the full listing for details.").replace(/<[^>]*>/g, " ")}</p>
          <Link href={`/${kind}/${item.slug || item.id}`} className="mt-auto flex min-h-11 items-center justify-between border-t border-slate-100 pt-3 text-sm font-bold text-teal-800">{events ? "View event" : closed ? "Check next intake" : "View eligibility & apply"}<span aria-hidden="true">→</span><span className="sr-only">: {item.title}</span></Link>
        </article>;
      })}</div>}
      {!error && !loading && <DirectoryPagination page={page} totalPages={totalPages} onPageChange={setPage} />}
      <aside className="mt-9 flex flex-col justify-between gap-4 rounded-2xl bg-[#e7f2ef] p-6 sm:flex-row sm:items-center"><div><h2 className="text-lg font-extrabold">{events ? "Make room for more connections." : "Know an opportunity worth sharing?"}</h2><p className="mt-2 text-sm text-slate-700">Use your organization account to post {events ? "events" : "scholarships and grants"}. The same sign-in works across IOPPS.</p></div><Link href={`/org/dashboard/${kind}/new`} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-teal-700 px-4 py-3 text-sm font-bold text-white">{events ? "Share an event" : "Share funding"}</Link></aside>
    </div>
  </main></AppShell>;
}
