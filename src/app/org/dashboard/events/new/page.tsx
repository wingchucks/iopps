"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import OrgRoute from "@/components/OrgRoute";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import { getMemberProfile } from "@/lib/firestore/members";
import type { MemberProfile } from "@/lib/firestore/members";
import { getOrganization } from "@/lib/firestore/organizations";
import type { Organization } from "@/lib/firestore/organizations";
import { createEvent } from "@/lib/firestore/events";
import type { Event } from "@/lib/firestore/events";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const EVENT_CATEGORIES = [
  { id: "powwow", label: "Pow Wow", icon: "🪶", color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  { id: "hockey", label: "Hockey Tournament", icon: "🏒", color: "#60A5FA", bg: "rgba(96,165,250,0.12)" },
  { id: "career_fair", label: "Career Fair", icon: "💼", color: "var(--teal)", bg: "rgba(13,148,136,0.12)" },
  { id: "round_dance", label: "Round Dance", icon: "💫", color: "#A78BFA", bg: "rgba(167,139,250,0.12)" },
  { id: "conference", label: "Conference", icon: "🎤", color: "#F472B6", bg: "rgba(244,114,182,0.12)" },
  { id: "workshop", label: "Workshop / Training", icon: "📚", color: "#34D399", bg: "rgba(52,211,153,0.12)" },
  { id: "fundraiser", label: "Fundraiser", icon: "❤️", color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
  { id: "other", label: "Other / General", icon: "📌", color: "var(--text-muted)", bg: "rgba(136,146,167,0.12)" },
];

/* ------------------------------------------------------------------ */
/*  Form state                                                         */
/* ------------------------------------------------------------------ */

interface FormState {
  category: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: string;
  isFree: boolean;
  price: string;
  rsvpLink: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  highlights: string[];
}

const emptyForm: FormState = {
  category: "",
  title: "",
  description: "",
  startDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  location: "",
  isFree: true,
  price: "",
  rsvpLink: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  highlights: [],
};

/* ------------------------------------------------------------------ */
/*  Micro-components                                                   */
/* ------------------------------------------------------------------ */

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

function Section({
  number,
  title,
  subtitle,
  children,
}: {
  number: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "rgba(13,148,136,0.12)",
            color: "var(--teal)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {number}
        </div>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>
            {title}
          </h3>
          {subtitle && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div style={{ paddingLeft: 38 }}>{children}</div>
    </div>
  );
}

function Label({
  children,
  required,
  hint,
}: {
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div style={{ marginBottom: 6 }}>
      <label
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--text)",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        {children}
        {required && <span style={{ color: "#EF4444", fontSize: 13 }}>*</span>}
      </label>
      {hint && (
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0", lineHeight: 1.4 }}>
          {hint}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Preview Card                                                       */
/* ------------------------------------------------------------------ */

function EventPreviewCard({ form }: { form: FormState }) {
  const cat = EVENT_CATEGORIES.find((c) => c.id === form.category);

  return (
    <div
      style={{
        background: "var(--card)",
        borderRadius: 12,
        border: "1px solid var(--border)",
        overflow: "hidden",
      }}
    >
      {/* Cover image area */}
      <div
        style={{
          height: 140,
          background: cat
            ? `linear-gradient(135deg, ${cat.bg}, var(--bg))`
            : "linear-gradient(135deg, var(--bg), var(--card))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <div style={{ fontSize: 48, opacity: 0.5 }}>{cat?.icon || "📅"}</div>
        {cat && (
          <div
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              background: cat.bg,
              color: cat.color,
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>{cat.icon}</span> {cat.label}
          </div>
        )}
      </div>

      <div style={{ padding: 16 }}>
        <h4
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "var(--text)",
            margin: "0 0 8px",
            opacity: form.title ? 1 : 0.3,
          }}
        >
          {form.title || "Event Title"}
        </h4>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: form.startDate ? "var(--text-sec)" : "var(--text-muted)",
            }}
          >
            <span style={{ fontSize: 14 }}>📅</span>
            {form.startDate ? (
              <>
                {new Date(form.startDate + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                {form.endDate && form.endDate !== form.startDate && (
                  <>
                    {" – "}
                    {new Date(form.endDate + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </>
                )}
                {form.startTime && (
                  <span style={{ color: "var(--text-muted)" }}> · {form.startTime}</span>
                )}
              </>
            ) : (
              "Date TBD"
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: form.location ? "var(--text-sec)" : "var(--text-muted)",
            }}
          >
            <span style={{ fontSize: 14 }}>📍</span>
            {form.location || "Location TBD"}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "var(--text-sec)",
            }}
          >
            <span style={{ fontSize: 14 }}>🎟️</span>
            {form.isFree ? (
              <span style={{ color: "#34D399", fontWeight: 600 }}>Free</span>
            ) : form.price ? (
              <span style={{ fontWeight: 600 }}>{form.price}</span>
            ) : (
              <span style={{ color: "var(--text-muted)" }}>Admission TBD</span>
            )}
          </div>
        </div>

        {form.description && (
          <p
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              margin: "10px 0 0",
              lineHeight: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {form.description}
          </p>
        )}

        {form.rsvpLink && (
          <div
            style={{
              marginTop: 12,
              padding: "8px 16px",
              background: "rgba(13,148,136,0.12)",
              borderRadius: 8,
              textAlign: "center",
              color: "var(--teal)",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Register / RSVP →
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function NewEventPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Load org & profile
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/employer/dashboard", {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data.profile as MemberProfile);
          setOrg(data.org as Organization);
          setLoading(false);
          return;
        }
      } catch {
        // fall through
      }
      const mp = await getMemberProfile(user.uid);
      if (mp?.orgId) {
        setProfile(mp);
        const organization = await getOrganization(mp.orgId);
        setOrg(organization);
      }
      setLoading(false);
    })();
  }, [user]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  /* ---- Progress ---- */
  const filledCount = [
    form.category,
    form.title,
    form.startDate,
    form.location,
    form.description,
    form.isFree || form.price,
  ].filter(Boolean).length;
  const totalRequired = 6;
  const progress = Math.round((filledCount / totalRequired) * 100);

  /* ---- Validation ---- */
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.description.trim()) e.description = "Description is required";
    if (!form.startDate) e.startDate = "Start date is required";
    if (!form.location.trim()) e.location = "Location is required";
    if (!form.category) e.category = "Please select a category";
    if (!form.isFree && !form.price.trim()) e.price = "Price is required for paid events";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ---- Save ---- */
  const handleSave = async (status: "active" | "draft") => {
    if (status === "active" && !validate()) return;
    if (!profile?.orgId || !user) return;
    setSaving(true);
    setSaveError("");
    try {
      const slug =
        form.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") +
        "-" +
        Date.now().toString(36);

      // Build date range display string
      let dates = "";
      if (form.startDate) {
        const fmt = (d: string) =>
          new Date(d + "T00:00:00").toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
        dates = fmt(form.startDate);
        if (form.endDate && form.endDate !== form.startDate) {
          dates += ` – ${fmt(form.endDate)}`;
        }
      }

      const cat = EVENT_CATEGORIES.find((c) => c.id === form.category);

      // Build payload — only include optional fields when they have values
      // (Firestore setDoc rejects explicit `undefined` values)
      const payload: Record<string, unknown> = {
        title: form.title,
        slug,
        description: form.description,
        date: form.startDate,
        dates,
        startDate: form.startDate,
        location: form.location,
        category: form.category,
        eventType: cat?.label || form.category,
        isFree: form.isFree,
        price: form.isFree ? "Free" : form.price,
        highlights: form.highlights.filter((h) => h.trim()),
        status,
        active: status === "active",
        orgId: profile.orgId,
        authorId: user.uid,
      };
      if (form.endDate) payload.endDate = form.endDate;
      if (form.startTime) payload.startTime = form.startTime;
      if (form.endTime) payload.endTime = form.endTime;
      if (form.rsvpLink) payload.rsvpLink = form.rsvpLink;
      if (form.contactName) payload.contactName = form.contactName;
      if (form.contactEmail) payload.contactEmail = form.contactEmail;
      if (form.contactPhone) payload.contactPhone = form.contactPhone;
      if (org?.name) payload.orgName = org.name;
      if (org?.shortName) payload.orgShort = org.shortName;

      await createEvent(payload as Omit<Event, "id" | "createdAt" | "order">);

      router.push("/org/dashboard/events?created=1");
    } catch (err) {
      console.error("Failed to create event:", err);
      setSaveError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  /* ---- Highlights helpers ---- */
  const addHighlight = () => {
    if (form.highlights.length < 6) {
      set("highlights", [...form.highlights, ""]);
    }
  };

  const updateHighlight = (idx: number, val: string) => {
    const next = [...form.highlights];
    next[idx] = val;
    set("highlights", next);
  };

  const removeHighlight = (idx: number) => {
    set(
      "highlights",
      form.highlights.filter((_, i) => i !== idx)
    );
  };

  /* ---- Render ---- */
  const cardStyle: React.CSSProperties = {
    background: "var(--card)",
    borderRadius: 16,
    border: "1px solid var(--border)",
    padding: 28,
  };

  return (
    <OrgRoute>
      <AppShell>
        <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
          {loading ? (
            <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
              <div className="skeleton" style={{ height: 32, width: 240, borderRadius: 10, marginBottom: 16 }} />
              <div className="skeleton" style={{ height: 500, borderRadius: 16 }} />
            </div>
          ) : (
            <>
              {/* ── Sticky Header ── */}
              <div
                style={{
                  background: "var(--card)",
                  borderBottom: "1px solid var(--border)",
                  padding: "12px 24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  position: "sticky",
                  top: 0,
                  zIndex: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    onClick={() => router.push("/org/dashboard/events")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--teal)",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    ← Back
                  </button>
                  <div
                    style={{
                      width: 1,
                      height: 20,
                      background: "var(--border)",
                    }}
                  />
                  <div>
                    <h1 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: 0 }}>
                      Create Event
                    </h1>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                      {org?.name ? `Posting as ${org.name}` : "Share a gathering with the community"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowPreview(!showPreview)}
                  style={{
                    padding: "8px 16px",
                    background: showPreview ? "rgba(13,148,136,0.12)" : "transparent",
                    border: `1px solid ${showPreview ? "var(--teal)" : "var(--border)"}`,
                    borderRadius: 8,
                    color: showPreview ? "var(--teal)" : "var(--text-muted)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  👁️ {showPreview ? "Hide" : "Show"} Preview
                </button>
              </div>

              {/* ── Progress Bar ── */}
              <div
                style={{
                  padding: "10px 24px",
                  background: "var(--card)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {filledCount} of {totalRequired} required fields
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: progress === 100 ? "#34D399" : "var(--teal)",
                    }}
                  >
                    {progress}%
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    background: "var(--border)",
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${progress}%`,
                      background: progress === 100 ? "#34D399" : "var(--teal)",
                      borderRadius: 4,
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>

              {/* ── Main Layout ── */}
              <div
                style={{
                  display: "flex",
                  gap: 24,
                  padding: 24,
                  maxWidth: 1200,
                  margin: "0 auto",
                  flexDirection: showPreview ? "row" : "column",
                  alignItems: showPreview ? "flex-start" : "stretch",
                }}
              >
                {/* ── Form Column ── */}
                <div
                  style={{
                    flex: 1,
                    maxWidth: showPreview ? 680 : 720,
                    margin: showPreview ? 0 : "0 auto",
                  }}
                >
                  {/* ━━ SECTION 1: Category ━━ */}
                  <Section number="1" title="What type of event?" subtitle="Choose the category that best fits">
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                        gap: 8,
                      }}
                    >
                      {EVENT_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => set("category", cat.id)}
                          style={{
                            padding: "12px 14px",
                            background: form.category === cat.id ? cat.bg : "var(--bg)",
                            border: `2px solid ${form.category === cat.id ? cat.color : "var(--border)"}`,
                            borderRadius: 10,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            transition: "all 0.2s",
                            textAlign: "left",
                          }}
                        >
                          <span style={{ fontSize: 22 }}>{cat.icon}</span>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: form.category === cat.id ? 700 : 500,
                              color: form.category === cat.id ? cat.color : "var(--text-sec)",
                            }}
                          >
                            {cat.label}
                          </span>
                        </button>
                      ))}
                    </div>
                    {errors.category && (
                      <p style={{ margin: "8px 0 0", fontSize: 12, color: "#EF4444" }}>
                        {errors.category}
                      </p>
                    )}
                  </Section>

                  {/* ━━ SECTION 2: Basic Info ━━ */}
                  <Section number="2" title="Basic Information" subtitle="Tell people what this event is about">
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div>
                        <Label required>Event Title</Label>
                        <input
                          type="text"
                          placeholder="e.g. Treaty 6 Spring Powwow 2026"
                          value={form.title}
                          onChange={(e) => set("title", e.target.value)}
                          style={inputStyle}
                        />
                        {errors.title && (
                          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#EF4444" }}>
                            {errors.title}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label required hint="What should people know about this event?">
                          Description
                        </Label>
                        <textarea
                          placeholder="Describe the event — what to expect, who should attend, what to bring..."
                          value={form.description}
                          onChange={(e) => set("description", e.target.value)}
                          rows={5}
                          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                        />
                        {errors.description && (
                          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#EF4444" }}>
                            {errors.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </Section>

                  {/* ━━ SECTION 3: When & Where ━━ */}
                  <Section number="3" title="When & Where" subtitle="Date, time, and location details">
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <Label required>Start Date</Label>
                          <input
                            type="date"
                            value={form.startDate}
                            onChange={(e) => set("startDate", e.target.value)}
                            style={inputStyle}
                          />
                          {errors.startDate && (
                            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#EF4444" }}>
                              {errors.startDate}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label>End Date</Label>
                          <input
                            type="date"
                            value={form.endDate}
                            onChange={(e) => set("endDate", e.target.value)}
                            style={inputStyle}
                          />
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <Label>Start Time</Label>
                          <input
                            type="time"
                            value={form.startTime}
                            onChange={(e) => set("startTime", e.target.value)}
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <Label>End Time</Label>
                          <input
                            type="time"
                            value={form.endTime}
                            onChange={(e) => set("endTime", e.target.value)}
                            style={inputStyle}
                          />
                        </div>
                      </div>
                      <div>
                        <Label required>Location / Venue</Label>
                        <input
                          type="text"
                          placeholder="e.g. SaskTel Centre, Saskatoon, SK"
                          value={form.location}
                          onChange={(e) => set("location", e.target.value)}
                          style={inputStyle}
                        />
                        {errors.location && (
                          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#EF4444" }}>
                            {errors.location}
                          </p>
                        )}
                      </div>
                    </div>
                  </Section>

                  {/* ━━ SECTION 4: Admission ━━ */}
                  <Section number="4" title="Admission" subtitle="Is there a cost to attend?">
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        {[
                          { id: true, label: "Free Event", icon: "🎉" },
                          { id: false, label: "Paid Event", icon: "🎟️" },
                        ].map((opt) => (
                          <button
                            key={String(opt.id)}
                            type="button"
                            onClick={() => set("isFree", opt.id)}
                            style={{
                              flex: 1,
                              padding: "12px 16px",
                              background:
                                form.isFree === opt.id
                                  ? "rgba(13,148,136,0.12)"
                                  : "var(--bg)",
                              border: `2px solid ${form.isFree === opt.id ? "var(--teal)" : "var(--border)"}`,
                              borderRadius: 10,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 8,
                              color:
                                form.isFree === opt.id
                                  ? "var(--teal)"
                                  : "var(--text-muted)",
                              fontSize: 14,
                              fontWeight: form.isFree === opt.id ? 700 : 500,
                              transition: "all 0.2s",
                            }}
                          >
                            <span>{opt.icon}</span> {opt.label}
                          </button>
                        ))}
                      </div>

                      {!form.isFree && (
                        <div>
                          <Label required hint='e.g. "$25" or "Early bird: $199 / Regular: $350"'>
                            Price
                          </Label>
                          <input
                            type="text"
                            placeholder='e.g. $25 or "Free for Elders, $10 General"'
                            value={form.price}
                            onChange={(e) => set("price", e.target.value)}
                            style={inputStyle}
                          />
                          {errors.price && (
                            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#EF4444" }}>
                              {errors.price}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </Section>

                  {/* ━━ SECTION 5: Highlights ━━ */}
                  <Section
                    number="5"
                    title="Event Highlights"
                    subtitle="Key things attendees should know (optional)"
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {form.highlights.map((h, i) => (
                        <div
                          key={i}
                          style={{ display: "flex", gap: 8, alignItems: "center" }}
                        >
                          <span
                            style={{ color: "var(--teal)", fontSize: 16, flexShrink: 0 }}
                          >
                            ✦
                          </span>
                          <input
                            type="text"
                            placeholder={
                              i === 0
                                ? "e.g. Grand Entry at 1:00 PM"
                                : i === 1
                                  ? "e.g. Feast for all attendees"
                                  : i === 2
                                    ? "e.g. Free camping available"
                                    : "Add a highlight..."
                            }
                            value={h}
                            onChange={(e) => updateHighlight(i, e.target.value)}
                            style={{ ...inputStyle, flex: 1 }}
                          />
                          <button
                            type="button"
                            onClick={() => removeHighlight(i)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#EF4444",
                              cursor: "pointer",
                              fontSize: 18,
                              padding: 4,
                              flexShrink: 0,
                              opacity: 0.7,
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {form.highlights.length < 6 && (
                        <button
                          type="button"
                          onClick={addHighlight}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--teal)",
                            cursor: "pointer",
                            fontSize: 13,
                            fontWeight: 600,
                            padding: "4px 0",
                            textAlign: "left",
                            marginLeft: 24,
                          }}
                        >
                          + Add Highlight
                        </button>
                      )}
                    </div>
                  </Section>

                  {/* ━━ SECTION 6: Registration & Contact ━━ */}
                  <Section
                    number="6"
                    title="Registration & Contact"
                    subtitle="How people can register or get more info"
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div>
                        <Label hint="Link to external registration page, Eventbrite, etc.">
                          RSVP / Registration Link
                        </Label>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={form.rsvpLink}
                          onChange={(e) => set("rsvpLink", e.target.value)}
                          style={inputStyle}
                        />
                      </div>

                      <div
                        style={{
                          background: "var(--bg)",
                          borderRadius: 10,
                          border: "1px solid var(--border)",
                          padding: 16,
                        }}
                      >
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--text-sec)",
                            margin: "0 0 12px",
                          }}
                        >
                          Contact Information (optional)
                        </p>
                        <div
                          style={{ display: "flex", flexDirection: "column", gap: 10 }}
                        >
                          <input
                            type="text"
                            placeholder="Contact name"
                            value={form.contactName}
                            onChange={(e) => set("contactName", e.target.value)}
                            style={inputStyle}
                          />
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: 10,
                            }}
                          >
                            <input
                              type="email"
                              placeholder="Email"
                              value={form.contactEmail}
                              onChange={(e) => set("contactEmail", e.target.value)}
                              style={inputStyle}
                            />
                            <input
                              type="tel"
                              placeholder="Phone"
                              value={form.contactPhone}
                              onChange={(e) => set("contactPhone", e.target.value)}
                              style={inputStyle}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Section>

                  {/* ━━ Error Banner ━━ */}
                  {saveError && (
                    <div
                      style={{
                        margin: "0 0 16px 38px",
                        padding: "12px 16px",
                        background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.3)",
                        borderRadius: 10,
                        color: "#EF4444",
                        fontSize: 13,
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 16 }}>⚠</span>
                      {saveError}
                    </div>
                  )}

                  {/* ━━ Action Buttons ━━ */}
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      paddingTop: 16,
                      borderTop: "1px solid var(--border)",
                      marginLeft: 38,
                    }}
                  >
                    <button
                      onClick={() => handleSave("active")}
                      disabled={saving}
                      style={{
                        padding: "12px 28px",
                        background: "var(--teal)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 10,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: saving ? "default" : "pointer",
                        opacity: saving ? 0.5 : 1,
                      }}
                    >
                      {saving ? "Publishing..." : "Publish Event"}
                    </button>
                    <button
                      onClick={() => handleSave("draft")}
                      disabled={saving}
                      style={{
                        padding: "12px 28px",
                        background: "var(--bg)",
                        color: "var(--text-sec)",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: saving ? "default" : "pointer",
                        opacity: saving ? 0.5 : 1,
                      }}
                    >
                      Save as Draft
                    </button>
                    <button
                      onClick={() => router.push("/org/dashboard/events")}
                      style={{
                        padding: "12px 20px",
                        background: "transparent",
                        color: "var(--text-muted)",
                        border: "none",
                        borderRadius: 10,
                        fontSize: 14,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                {/* ── Preview Column ── */}
                {showPreview && (
                  <div
                    style={{
                      width: 340,
                      position: "sticky",
                      top: 120,
                      flexShrink: 0,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: 12,
                      }}
                    >
                      Feed Preview
                    </p>
                    <EventPreviewCard form={form} />
                    <p
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginTop: 10,
                        textAlign: "center",
                        lineHeight: 1.4,
                      }}
                    >
                      This is how your event will appear in the community feed
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </AppShell>
    </OrgRoute>
  );
}
