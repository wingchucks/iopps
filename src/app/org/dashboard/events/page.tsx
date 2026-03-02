"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import OrgRoute from "@/components/OrgRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { displayLocation } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { getMemberProfile } from "@/lib/firestore/members";
import type { MemberProfile } from "@/lib/firestore/members";
import { getOrganization } from "@/lib/firestore/organizations";
import type { Organization } from "@/lib/firestore/organizations";
import {
  getEventsByOrg,
  createEvent,
  updateEvent,
  deleteEvent,
  type Event,
} from "@/lib/firestore/events";
import OrgDashboardNav from "@/components/OrgDashboardNav";
import Avatar from "@/components/Avatar";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type EventStatus = "draft" | "active" | "closed";

const EVENT_TYPES = [
  "Conference",
  "Workshop",
  "Powwow",
  "Career Fair",
  "Networking",
  "Webinar",
  "Other",
];

const emptyForm = {
  title: "",
  slug: "",
  description: "",
  date: "",
  dates: "",
  location: "",
  eventType: "",
  price: "",
  highlights: [""],
  status: "draft" as EventStatus,
};

type FormData = typeof emptyForm;

function ListEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
        {label}
      </label>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 mb-2">
          <input
            type="text"
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
            className="flex-1 px-3 py-2 rounded-lg text-sm"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="px-2 rounded-lg border-none cursor-pointer text-sm font-semibold"
            style={{ background: "rgba(220,38,38,.1)", color: "#DC2626" }}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="text-sm font-semibold cursor-pointer border-none rounded-lg px-3 py-1.5"
        style={{ background: "rgba(13,148,136,.1)", color: "var(--teal)" }}
      >
        + Add {label.replace(/ies$/, "y").replace(/s$/, "")}
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status?: EventStatus }) {
  const colors: Record<string, { bg: string; color: string }> = {
    active: { bg: "rgba(16,185,129,.12)", color: "#10B981" },
    draft: { bg: "rgba(245,158,11,.12)", color: "#F59E0B" },
    closed: { bg: "rgba(107,114,128,.12)", color: "#6B7280" },
  };
  const s = status || "active";
  const c = colors[s] || colors.active;
  return (
    <span
      className="px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
      style={{ background: c.bg, color: c.color }}
    >
      {s}
    </span>
  );
}

function EventForm({
  initial,
  orgId,
  orgName,
  orgShort,
  onSave,
  onCancel,
  forceCreate,
}: {
  initial: FormData;
  orgId: string;
  orgName: string;
  orgShort: string;
  onSave: () => void;
  onCancel: () => void;
  forceCreate?: boolean;
}) {
  const [form, setForm] = useState<FormData>(initial);
  const [saving, setSaving] = useState(false);
  const isEdit = !forceCreate && initial.title !== "";

  const handleSubmit = async (publishStatus: EventStatus) => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const slug = form.slug || slugify(form.title);
      const data = {
        title: form.title,
        slug,
        description: form.description,
        date: form.date,
        dates: form.dates,
        location: form.location,
        eventType: form.eventType,
        price: form.price,
        highlights: form.highlights.filter((h) => h.trim()),
        status: publishStatus,
        orgId,
        orgName,
        orgShort,
      };
      if (isEdit) {
        await updateEvent(slug, data);
      } else {
        await createEvent(data);
      }
      onSave();
    } catch (err) {
      console.error("Failed to save event:", err);
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof FormData, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const inputStyle = {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    color: "var(--text)",
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold mb-4" style={{ color: "var(--text)" }}>
        {isEdit ? "Edit Event" : "Create Event"}
      </h3>
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
            Title *
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => {
              set("title", e.target.value);
              if (!isEdit) set("slug", slugify(e.target.value));
            }}
            placeholder="e.g. Indigenous Career Fair 2026"
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
            Slug
          </label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => set("slug", e.target.value)}
            placeholder="auto-generated-from-title"
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={inputStyle}
            disabled={isEdit}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Describe the event..."
            rows={4}
            className="w-full px-3 py-2 rounded-lg text-sm resize-y"
            style={inputStyle}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
              Date
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
              Date Range Display
            </label>
            <input
              type="text"
              value={form.dates}
              onChange={(e) => set("dates", e.target.value)}
              placeholder="e.g. Jun 15-17, 2026"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={inputStyle}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
              Location
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="e.g. Winnipeg, MB"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
              Event Type
            </label>
            <select
              value={form.eventType}
              onChange={(e) => set("eventType", e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={inputStyle}
            >
              <option value="">Select type...</option>
              {EVENT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
            Price
          </label>
          <input
            type="text"
            value={form.price}
            onChange={(e) => set("price", e.target.value)}
            placeholder='e.g. "Free" or "$50"'
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={inputStyle}
          />
        </div>
        <ListEditor
          label="Highlights"
          items={form.highlights}
          onChange={(items) => set("highlights", items)}
        />
        <div className="flex gap-3 pt-2">
          <Button
            primary
            onClick={() => handleSubmit("active")}
            className={saving ? "opacity-50 pointer-events-none" : ""}
          >
            {saving ? "Saving..." : "Publish"}
          </Button>
          <Button
            onClick={() => handleSubmit("draft")}
            className={saving ? "opacity-50 pointer-events-none" : ""}
          >
            Save as Draft
          </Button>
          <Button onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </Card>
  );
}

export default function OrgDashboardEventsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const memberProfile = await getMemberProfile(user.uid);
        if (!memberProfile?.orgId) return;
        setProfile(memberProfile);

        const [organization, orgEvents] = await Promise.all([
          getOrganization(memberProfile.orgId),
          getEventsByOrg(memberProfile.orgId),
        ]);
        setOrg(organization);
        setEvents(orgEvents);
      } catch (err) {
        console.error("Failed to load events:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleDelete = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    await deleteEvent(eventId);
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setIsDuplicating(false);
    setShowForm(true);
  };

  const handleDuplicate = (event: Event) => {
    const cloned = {
      ...event,
      id: "",
      title: `Copy of ${event.title}`,
      slug: slugify(`copy-of-${event.title}-${Date.now()}`),
      status: "draft",
    };
    setEditingEvent(cloned as Event);
    setIsDuplicating(true);
    setShowForm(true);
  };

  const handleToggleStatus = async (event: Event) => {
    const newStatus: EventStatus =
      (event.status || "active") === "active" ? "closed" : "active";
    await updateEvent(event.id, { status: newStatus });
    setEvents((prev) =>
      prev.map((e) => (e.id === event.id ? { ...e, status: newStatus } : e))
    );
  };

  const handleFormSave = async () => {
    setShowForm(false);
    setEditingEvent(null);
    setIsDuplicating(false);
    if (!profile?.orgId) return;
    setLoading(true);
    const orgEvents = await getEventsByOrg(profile.orgId);
    setEvents(orgEvents);
    setLoading(false);
  };

  const formatDate = (ts: unknown): string => {
    if (!ts) return "N/A";
    if (typeof ts === "string") return new Date(ts).toLocaleDateString();
    if (typeof ts === "object" && ts !== null) {
      if ("toDate" in ts) {
        return (ts as { toDate: () => Date }).toDate().toLocaleDateString();
      }
      if ("_seconds" in ts) {
        return new Date((ts as { _seconds: number })._seconds * 1000).toLocaleDateString();
      }
    }
    return "N/A";
  };

  const stats = {
    total: events.length,
    active: events.filter((e) => (e.status || "active") === "active").length,
    draft: events.filter((e) => e.status === "draft").length,
  };

  return (
    <OrgRoute>
      <AppShell>
        <div className="min-h-screen bg-bg">
          <div className="max-w-[1100px] mx-auto px-4 py-8 md:px-10">
            {loading ? (
              <div className="flex flex-col gap-4">
                <div className="h-10 w-64 rounded-xl skeleton" />
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 rounded-2xl skeleton" />
                  ))}
                </div>
                <div className="h-64 rounded-2xl skeleton" />
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar name={org?.shortName || org?.name || ""} size={48} src={org?.logoUrl || org?.logo} />
                    <div>
                      <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
                        Events
                      </h1>
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                        Create and manage your organization&apos;s events
                      </p>
                    </div>
                  </div>
                  <OrgDashboardNav orgSlug={org?.slug} />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  {[
                    { label: "Total Events", value: stats.total },
                    { label: "Active", value: stats.active },
                    { label: "Drafts", value: stats.draft },
                  ].map(({ label, value }) => (
                    <Card key={label} className="p-5">
                      <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                        {label}
                      </p>
                      <p className="text-3xl font-bold" style={{ color: "var(--text)" }}>
                        {value}
                      </p>
                    </Card>
                  ))}
                </div>

                {/* Create button */}
                {!showForm && (
                  <div className="mb-6">
                    <button
                      onClick={() => router.push("/org/dashboard/events/new")}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-none cursor-pointer transition-all hover:opacity-80"
                      style={{ background: "var(--teal)", color: "#fff" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Create Event
                    </button>
                  </div>
                )}

                {/* Form */}
                {showForm && (
                  <div className="mb-8">
                    <EventForm
                      initial={
                        editingEvent
                          ? {
                              title: editingEvent.title,
                              slug: editingEvent.slug || editingEvent.id,
                              description: editingEvent.description || "",
                              date: editingEvent.date || "",
                              dates: editingEvent.dates || "",
                              location: displayLocation(editingEvent.location) || "",
                              eventType: editingEvent.eventType || "",
                              price: editingEvent.price || "",
                              highlights: editingEvent.highlights?.length
                                ? editingEvent.highlights
                                : [""],
                              status: (editingEvent.status as EventStatus) || "draft",
                            }
                          : emptyForm
                      }
                      orgId={profile?.orgId || ""}
                      orgName={org?.name || ""}
                      orgShort={org?.shortName || ""}
                      onSave={handleFormSave}
                      onCancel={() => {
                        setShowForm(false);
                        setEditingEvent(null);
                        setIsDuplicating(false);
                      }}
                      forceCreate={isDuplicating}
                    />
                  </div>
                )}

                {/* Events list */}
                <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text)" }}>
                  Your Events
                </h2>
                {events.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      No events yet. Click &quot;Create Event&quot; to add your first event.
                    </p>
                  </Card>
                ) : (
                  <div className="flex flex-col gap-3">
                    {events.map((event) => (
                      <Card key={event.id} className="p-5">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1 flex-wrap">
                              <h3 className="text-base font-bold truncate" style={{ color: "var(--text)" }}>
                                {event.title}
                              </h3>
                              <StatusBadge status={event.status as EventStatus} />
                              {event.eventType && (
                                <span
                                  className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                                  style={{ background: "rgba(139,92,246,.12)", color: "#8B5CF6" }}
                                >
                                  {event.eventType}
                                </span>
                              )}
                            </div>
                            <div
                              className="flex items-center gap-4 text-xs flex-wrap"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {event.dates && <span>{event.dates}</span>}
                              {event.location && <span>{displayLocation(event.location)}</span>}
                              {event.price && <span>{event.price}</span>}
                              <span>Created: {formatDate(event.createdAt)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleToggleStatus(event)}
                              className="px-3 py-1.5 rounded-lg border-none cursor-pointer text-xs font-semibold"
                              style={{
                                background:
                                  (event.status || "active") === "active"
                                    ? "rgba(107,114,128,.1)"
                                    : "rgba(16,185,129,.1)",
                                color:
                                  (event.status || "active") === "active"
                                    ? "#6B7280"
                                    : "#10B981",
                              }}
                            >
                              {(event.status || "active") === "active" ? "Close" : "Reopen"}
                            </button>
                            <button
                              onClick={() => handleEdit(event)}
                              className="px-3 py-1.5 rounded-lg border-none cursor-pointer text-xs font-semibold"
                              style={{ background: "rgba(13,148,136,.1)", color: "var(--teal)" }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDuplicate(event)}
                              className="px-3 py-1.5 rounded-lg border-none cursor-pointer text-xs font-semibold"
                              style={{ background: "rgba(139,92,246,.1)", color: "#8B5CF6" }}
                            >
                              Duplicate
                            </button>
                            <button
                              onClick={() => handleDelete(event.id)}
                              className="px-3 py-1.5 rounded-lg border-none cursor-pointer text-xs font-semibold"
                              style={{ background: "rgba(220,38,38,.1)", color: "#DC2626" }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </AppShell>
    </OrgRoute>
  );
}
