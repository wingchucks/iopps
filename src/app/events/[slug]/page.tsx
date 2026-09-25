"use client";

import { Suspense, useState, useEffect } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import ShareButton from "@/components/ShareButton";
import { createEventCalendar } from "@/lib/event-calendar";
import { plainOpportunityText } from "@/lib/opportunity-posting";
import { savePost, unsavePost, isPostSaved } from "@/lib/firestore/savedItems";
import {
  getRSVP,
  setRSVP,
  removeRSVP,
  type RSVPStatus,
} from "@/lib/firestore/rsvps";
import { useAuth } from "@/lib/auth-context";
import ReportButton from "@/components/ReportButton";
import {
  getEventDisplayDates,
  normalizeEventTypeLabel,
} from "@/lib/public-events";
import { buildLoginRedirectHref, displayAmount, displayLocation } from "@/lib/utils";

// Unified type for rendering — covers fields from both Event and Post
type EventData = {
  id: string;
  goingCount?: number;
  title: string;
  slug?: string;
  description?: string;
  dates?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  timeZone?: string;
  imageUrl?: string;
  sourceUrl?: string;
  delivery?: string;
  location?: string | { city?: string; venue?: string; province?: string; remote?: boolean };
  eventType?: string;
  orgName?: string;
  price?: unknown;
  schedule?: { day: string; items: string[] }[];
  highlights?: string[];
  type?: string;
  rsvpLink?: string;
  contactEmail?: string;
  contactPhone?: string;
};

export default function EventDetailPage() {
  return (
    <AppShell>
      <div className="min-h-screen bg-bg">
        <Suspense fallback={null}>
          <EventDetailContent />
        </Suspense>
      </div>
    </AppShell>
  );
}

function downloadICS(event: EventData) {
  const ics = createEventCalendar(event);
  if (!ics) return;
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.title.replace(/[^a-zA-Z0-9]/g, "_")}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function EventDetailContent() {
  const params = useParams();
  const slug = params.slug as string;
  const [event, setEvent] = useState<EventData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState<RSVPStatus | null>(null);
  const [goingCount, setGoingCount] = useState(0);
  const [actionLoading, setActionLoading] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    let live = true;
    const abort = new AbortController();
    setLoading(true); setLoadError(""); setEvent(null); setSaved(false); setRsvpStatus(null);
    async function load() {
      try {
        const response = await fetch(`/api/events/${encodeURIComponent(slug)}`, { signal: abort.signal, cache: "no-store" });
        if (!response.ok && response.status !== 404) throw new Error("The event could not load. Please try again.");
        const data = response.ok ? (await response.json()).event as EventData : null;
        if (data && user) {
          const count = typeof data.goingCount === "number" ? data.goingCount : 0;
          const [rsvp, savedItem] = await Promise.all([getRSVP(user.uid, data.id).catch(() => null), isPostSaved(user.uid, data.id).catch(() => false)]);
          if (live) { setRsvpStatus(rsvp?.status || null); setGoingCount(count); setSaved(savedItem); }
        }
        if (live) setEvent(data);
      } catch (error) { if (live) setLoadError(error instanceof Error ? error.message : "The event could not load."); }
      finally { if (live) setLoading(false); }
    }
    void load();
    return () => { live = false; abort.abort(); };
  }, [slug, user, attempt]);

  const handleSave = async () => {
    if (!event) return;
    // C-3: anonymous save -> route to login, preserve save intent via ?save=1
    if (!user) {
      const target = `${pathname || `/events/${slug}`}?save=1`;
      router.push(buildLoginRedirectHref(target));
      return;
    }
    setActionLoading("save");
    try {
      if (saved) {
        await unsavePost(user.uid, event.id);
        setSaved(false);
        setActionNotice("Removed from your saved events.");
      } else {
        await savePost(user.uid, event.id, event.title, "event", event.orgName);
        setSaved(true);
        setActionNotice("Saved — you can find this anytime from Saved Items.");
      }
    } catch (err) {
      console.error("Save failed:", err);
      setActionNotice("Your saved event could not update. Please try again.");
    } finally {
      setActionLoading("");
    }
  };

  // C-3: when returning from login with ?save=1 intent, auto-fire save once
  useEffect(() => {
    if (!user || !event || loading) return;
    if (searchParams?.get("save") !== "1") return;
    const cleanQs = new URLSearchParams(searchParams.toString());
    cleanQs.delete("save");
    const qs = cleanQs.toString();
    router.replace(qs ? `${pathname}?${qs}` : (pathname || `/events/${slug}`));
    if (!saved) void handleSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, event, saved, loading]);

  const handleRsvp = async (status: RSVPStatus) => {
    if (!event) return;
    if (!user) { router.push(buildLoginRedirectHref(`${pathname || `/events/${slug}`}?rsvp=${status}`)); return; }
    setActionLoading(`rsvp-${status}`);
    try {
      if (rsvpStatus === status) {
        await removeRSVP(user.uid, event.id);
        if (status === "going") setGoingCount((c) => Math.max(0, c - 1));
        setRsvpStatus(null);
        setActionNotice("RSVP removed.");
      } else {
        const wasGoing = rsvpStatus === "going";
        await setRSVP({
          userId: user.uid,
          postId: event.id,
          postTitle: event.title,
          postDate: event.dates,
          postLocation: displayLocation(event.location),
          status,
        });
        if (status === "going" && !wasGoing) setGoingCount((c) => c + 1);
        if (status !== "going" && wasGoing) setGoingCount((c) => Math.max(0, c - 1));
        setRsvpStatus(status);
        setActionNotice(
          status === "going"
            ? "You’re marked as going. This event now appears on your profile."
            : status === "interested"
              ? "Marked interested — this event now appears on your profile."
              : "Marked as can’t go."
        );
      }
    } catch (err) {
      console.error("RSVP failed:", err);
      setActionNotice("Your RSVP could not update. Please try again.");
    } finally {
      setActionLoading("");
    }
  };

  useEffect(() => {
    const intent = searchParams?.get("rsvp");
    if (!user || !event || loading || !["going", "interested", "not_going"].includes(intent || "")) return;
    const clean = new URLSearchParams(searchParams.toString()); clean.delete("rsvp");
    router.replace(`${pathname}${clean.size ? `?${clean}` : ""}`);
    if (rsvpStatus !== intent) void handleRsvp(intent as RSVPStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, event, loading]);

  if (loadError) return <div className="mx-auto max-w-xl p-8 text-center" role="alert"><h1 className="text-2xl font-bold">Event couldn’t load</h1><p className="my-4">{loadError}</p><Button onClick={() => setAttempt(n => n + 1)}>Try again</Button></div>;

  if (loading) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-6 md:px-10 md:py-8">
        <div className="skeleton h-4 w-24 rounded mb-4" />
        <div className="skeleton h-[200px] rounded-2xl mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="min-w-0 md:col-span-2">
            <div className="skeleton h-[150px] rounded-2xl" />
          </div>
          <div>
            <div className="skeleton h-[250px] rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-[600px] mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">&#127914;</p>
        <h2 className="text-2xl font-extrabold text-text mb-2">Event Not Found</h2>
        <p className="text-text-sec mb-6">This event doesn&apos;t exist or may have been removed.</p>
        <Link href="/events">
          <Button primary>Browse Events &#8594;</Button>
        </Link>
      </div>
    );
  }

  const eventTypeLabel = normalizeEventTypeLabel(event.eventType);
  const emoji = "↗";
  const displayDates = getEventDisplayDates(event);
  const priceLabel = displayAmount(event.price);


  const rsvpButtons: { status: RSVPStatus; label: string; icon: string }[] = [
    { status: "going", label: "Going", icon: "\u2714" },
    { status: "interested", label: "Interested", icon: "\u2606" },
    { status: "not_going", label: "Can't Go", icon: "\u2716" },
  ];

  return (
    <div className="max-w-[900px] mx-auto px-4 py-6 md:px-10 md:py-8">
      {/* Back link */}
      <Link
        href="/events"
        className="inline-flex items-center gap-1 text-sm text-text-muted no-underline hover:text-teal mb-4"
      >
        &#8592; Back to Events
      </Link>

      {/* Hero Banner */}
      <div
        className="rounded-2xl mb-6 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(15,43,76,.06), rgba(13,148,136,.1))",
          padding: "clamp(24px, 4vw, 48px)",
        }}
      >
        <div className="text-center">
          <span className="text-6xl sm:text-7xl block mb-4">{emoji}</span>
          <div className="flex flex-wrap justify-center gap-2 mb-3">
            {eventTypeLabel && (
              <Badge text={eventTypeLabel} color="var(--gold)" bg="var(--gold-soft)" small />
            )}
            {priceLabel && priceLabel.toLowerCase() === "free" && (
              <Badge text="Free Event" color="var(--green)" bg="var(--green-soft)" small />
            )}
          </div>
          <h1 className="break-words text-2xl sm:text-4xl font-extrabold text-text mb-2">{event.title}</h1>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-text-sec">
            {displayDates && <span>&#128197; {displayDates}{event.timeZone ? ` · ${event.timeZone}` : ""}</span>}
            {event.location && <span>&#128205; {displayLocation(event.location)}</span>}
            {priceLabel && <span>&#127915; {priceLabel}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="min-w-0 md:col-span-2">
          {event.sourceUrl && <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer" className="mb-5 mr-4 inline-flex min-h-11 items-center font-bold text-teal underline">Organizer information ↗</a>}
          {!event.sourceUrl && !event.imageUrl && !event.rsvpLink && !event.contactEmail && !event.contactPhone && <p className="mb-5 rounded-xl border border-border p-4 text-sm text-text-sec">Organizer contact details have not been supplied. Confirm arrangements before travelling.</p>}
          {event.imageUrl && <a href={event.imageUrl} target="_blank" rel="noopener noreferrer" className="mb-5 inline-flex min-h-11 items-center font-bold text-teal underline">View event poster ↗</a>}
          {/* Description */}
          {event.description && (
            <>
              <h3 className="text-lg font-bold text-text mb-2">About This Event</h3>
              <p className="mb-6 whitespace-pre-line break-words text-sm leading-relaxed text-text-sec">{plainOpportunityText(event.description)}</p>
            </>
          )}

          {/* Highlights */}
          {event.highlights && event.highlights.length > 0 && (
            <>
              <h3 className="text-lg font-bold text-text mb-2">Highlights</h3>
              <div className="flex flex-wrap gap-2 mb-6">
                {event.highlights.map((h, i) => (
                  <span
                    key={i}
                    className="rounded-xl text-[13px] font-semibold text-gold"
                    style={{
                      padding: "8px 14px",
                      background: "rgba(217,119,6,.06)",
                      border: "1.5px solid rgba(217,119,6,.1)",
                    }}
                  >
                    {h}
                  </span>
                ))}
              </div>
            </>
          )}

          {/* Schedule */}
          {event.schedule && event.schedule.length > 0 && (
            <>
              <h3 className="text-lg font-bold text-text mb-3">Schedule</h3>
              <div className="flex flex-col gap-3 mb-6">
                {event.schedule.map((day, i) => (
                  <Card key={i}>
                    <div style={{ padding: 16 }}>
                      <p className="text-sm font-bold text-teal mb-2.5">{day.day}</p>
                      {day.items.map((item, j) => (
                        <div key={j} className="flex gap-2 items-center mb-1.5">
                          <span className="text-xs text-teal">&#9679;</span>
                          <span className="text-[13px] text-text-sec">{item}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Event Info Cards */}
          <div className="flex flex-col gap-3">
            {displayDates && (
              <Card>
                <div style={{ padding: 16 }}>
                  <p className="text-sm font-bold text-teal mb-1">&#128197; Date & Time</p>
                  <p className="text-[13px] text-text-sec">{displayDates}</p>
                </div>
              </Card>
            )}
            {event.location && (
              <Card>
                <div style={{ padding: 16 }}>
                  <p className="text-sm font-bold text-teal mb-1">&#128205; Location</p>
                  <p className="text-[13px] text-text-sec">{displayLocation(event.location)}</p>
                </div>
              </Card>
            )}
            {event.orgName && (
              <Card>
                <div style={{ padding: 16 }}>
                  <p className="text-sm font-bold text-teal mb-1">&#127970; Organizer</p>
                  <p className="text-[13px] text-text-sec">{event.orgName}</p>
                </div>
              </Card>
            )}
            {(event.contactEmail || event.contactPhone) && (
              <Card>
                <div style={{ padding: 16 }}>
                  <p className="text-sm font-bold text-teal mb-1">Contact</p>
                  {event.contactEmail && <p className="text-[13px] text-text-sec mb-1">Email: {event.contactEmail}</p>}
                  {event.contactPhone && <p className="text-[13px] text-text-sec m-0">Phone: {event.contactPhone}</p>}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          {/* RSVP Card */}
          <Card className="mb-4" style={{ position: "sticky", top: 80 }}>
            <div style={{ padding: 20 }}>
              {/* Register Button */}
              {event.rsvpLink && (
                <a
                  href={event.rsvpLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="brand-button flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-bold no-underline cursor-pointer transition-opacity hover:opacity-90 mb-4"
                  style={{
                    background: "var(--button-gradient)",
                    color: "#fff",
                    border: "none",
                  }}
                >
                  &#127915; Register for This Event
                </a>
              )}

              {/* RSVP Buttons */}
              <div className="flex gap-2 mb-3">
                {rsvpButtons.map(({ status, label, icon }) => {
                  const isActive = rsvpStatus === status;
                  const isLoading = actionLoading === `rsvp-${status}`;
                  return (
                    <button
                      key={status}
                      onClick={() => handleRsvp(status)}
                      disabled={actionLoading !== ""}
                      className="flex-1 py-3 rounded-xl text-sm font-bold cursor-pointer transition-all duration-150 hover:opacity-90"
                      style={{
                        background: isActive
                          ? status === "going"
                            ? "var(--green)"
                            : status === "interested"
                              ? "var(--gold)"
                              : "var(--red, #DC2626)"
                          : "var(--card)",
                        color: isActive ? "#fff" : "var(--text-sec)",
                        border: isActive ? "none" : "1.5px solid var(--border)",
                        opacity: isLoading ? 0.7 : 1,
                      }}
                    >
                      <span className="block text-base mb-0.5">{icon}</span>
                      <span className="text-[11px]">{label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Going count */}
              <p className="text-xs text-text-muted text-center mb-4">
                {goingCount} {goingCount === 1 ? "person" : "people"} going
              </p>

              {rsvpStatus && (
                <div className="mb-3 rounded-xl border px-3 py-2 text-center text-xs font-semibold" style={{ borderColor: "color-mix(in srgb, var(--teal) 24%, var(--border))", background: "var(--teal-soft)", color: "var(--teal)" }}>
                  Your RSVP: {rsvpStatus === "going" ? "Going" : rsvpStatus === "interested" ? "Interested" : "Can’t go"}
                </div>
              )}

              {actionNotice && (
                <div className="mb-3 rounded-xl border px-3 py-2 text-xs" style={{ borderColor: "var(--border)", background: "var(--card)", color: "var(--text-sec)" }}>
                  <span role="status">{actionNotice}</span>
                </div>
              )}

              {/* Add to Calendar */}
              <Button
                full
                onClick={() => downloadICS(event)}
                disabled={!createEventCalendar(event)}
                style={{
                  borderRadius: 14,
                  padding: "12px 24px",
                  fontSize: 14,
                  marginBottom: 12,
                }}
              >
                &#128197; Add event dates
              </Button>

              <p className="mb-4 text-xs leading-relaxed text-text-muted">{createEventCalendar(event) ? "Adds the event dates as all-day calendar entries. Confirm times with the organizer." : "Calendar download will be available when event dates are confirmed."}</p>

              {/* Save */}
              <Button
                full
                onClick={handleSave}
                disabled={actionLoading !== ""}
                style={{
                  borderRadius: 14,
                  padding: "12px 24px",
                  fontSize: 14,
                  marginBottom: 16,
                  opacity: actionLoading === "save" ? 0.7 : 1,
                }}
              >
                {saved ? "✔ Saved" : "🔖 Save Event"}
              </Button>

              <div className="border-t border-border pt-4">
                <p className="text-xs font-bold text-text-muted mb-3 tracking-[1px]">EVENT DETAILS</p>
                <div className="flex flex-col gap-2.5">
                  {event.dates && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Dates</span>
                      <span className="text-xs font-semibold text-text">{event.dates}</span>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Location</span>
                      <span className="text-xs font-semibold text-text text-right max-w-[140px]">{displayLocation(event.location)}</span>
                    </div>
                  )}
                  {priceLabel && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Price</span>
                      <span className="text-xs font-semibold text-green">{priceLabel}</span>
                    </div>
                  )}
                  {eventTypeLabel && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Category</span>
                      <span className="text-xs font-semibold text-text">{eventTypeLabel}</span>
                    </div>
                  )}
                  {event.contactEmail && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Contact</span>
                      <a href={`mailto:${event.contactEmail}`} className="text-xs font-semibold text-teal no-underline hover:underline">{event.contactEmail}</a>
                    </div>
                  )}
                  {event.contactPhone && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Phone</span>
                      <a href={`tel:${event.contactPhone}`} className="text-xs font-semibold text-teal no-underline hover:underline">{event.contactPhone}</a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Share Card */}
          <Card>
            <div style={{ padding: 16 }}>
              <p className="text-xs font-bold text-text-muted mb-3 tracking-[1px]">SHARE EVENT</p>
              <ShareButton title={event.title} text="Share Event" full />
            </div>
          </Card>

          {/* Report */}
          <div className="mt-3 text-center">
            <ReportButton
              targetType="post"
              targetId={event.id}
              targetTitle={event.title}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
