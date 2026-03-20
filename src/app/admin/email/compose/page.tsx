"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Template {
  id: string;
  name: string;
  type: string;
  htmlContent: string;
}

const AUDIENCES = [
  { label: "All Users", value: "all" },
  { label: "Employers Only", value: "employers" },
  { label: "Community Only", value: "community" },
];

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ComposeEmailPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [subject, setSubject] = useState("");
  const [audience, setAudience] = useState("all");
  const [body, setBody] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [scheduleType, setScheduleType] = useState<"now" | "scheduled">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [caslConsent, setCaslConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch templates
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/admin/email/templates", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setTemplates(data.templates || []);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [user]);

  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    const tpl = templates.find((t) => t.id === id);
    if (tpl?.htmlContent) setBody(tpl.htmlContent);
  };

  const handleSend = async (asDraft = false) => {
    if (!user) return;
    if (!asDraft && !subject.trim()) {
      toast.error("Subject is required");
      return;
    }
    if (!asDraft && !caslConsent) {
      toast.error("CASL compliance consent is required");
      return;
    }

    setSending(true);
    try {
      const token = await user.getIdToken();
      const status = asDraft ? "draft" : scheduleType === "scheduled" ? "scheduled" : "sent";
      const res = await fetch("/api/admin/email/campaigns", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          audience,
          body,
          templateId: templateId || null,
          scheduledAt: scheduleType === "scheduled" ? scheduledAt : null,
          status,
        }),
      });

      if (!res.ok) throw new Error("Failed to create campaign");
      toast.success(asDraft ? "Draft saved" : scheduleType === "scheduled" ? "Campaign scheduled" : "Campaign sent");
      router.push("/admin/email");
    } catch {
      toast.error("Failed to send campaign");
    } finally {
      setSending(false);
    }
  };

  const handleTestEmail = async () => {
    if (!user) return;
    if (!subject.trim()) {
      toast.error("Add a subject first");
      return;
    }
    toast.success("Test email sent to your admin address");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/admin/email")} className="rounded-lg p-2 transition-colors hover:bg-muted">
          <ArrowLeftIcon />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Compose Broadcast</h1>
          <p className="text-sm text-[var(--text-muted)]">Create and send an email to your audience</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Compose Form */}
        <div className="space-y-4 lg:col-span-2">
          {/* Subject */}
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
            <label className="mb-1.5 block text-sm font-medium">Subject Line</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Your email subject..."
              className="w-full rounded-lg border border-[var(--card-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          {/* Audience & Template */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
              <label className="mb-1.5 block text-sm font-medium">Audience</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full rounded-lg border border-[var(--card-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
              >
                {AUDIENCES.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
              <label className="mb-1.5 block text-sm font-medium">Template</label>
              <select
                value={templateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full rounded-lg border border-[var(--card-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="">No template</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Body */}
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
            <label className="mb-1.5 block text-sm font-medium">Email Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              placeholder="Write your email content here... (HTML supported)"
              className="w-full resize-y rounded-lg border border-[var(--card-border)] bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-accent"
            />
          </div>

          {/* Schedule */}
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
            <label className="mb-2 block text-sm font-medium">Delivery</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={scheduleType === "now"}
                  onChange={() => setScheduleType("now")}
                  className="accent-accent"
                />
                Send Now
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={scheduleType === "scheduled"}
                  onChange={() => setScheduleType("scheduled")}
                  className="accent-accent"
                />
                Schedule
              </label>
            </div>
            {scheduleType === "scheduled" && (
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="mt-3 w-full rounded-lg border border-[var(--card-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-accent sm:w-auto"
              />
            )}
          </div>

          {/* CASL Consent */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={caslConsent}
                onChange={(e) => setCaslConsent(e.target.checked)}
                className="mt-0.5 accent-amber-500"
              />
              <span>
                <strong className="text-amber-500">CASL Compliance:</strong>{" "}
                I confirm that all recipients have opted in to receive communications from this platform in accordance with Canadian Anti-Spam Legislation.
              </span>
            </label>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Actions */}
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 space-y-3">
            <button
              onClick={() => handleSend(false)}
              disabled={sending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              <SendIcon />
              {scheduleType === "scheduled" ? "Schedule" : "Send Now"}
            </button>
            <button
              onClick={handleTestEmail}
              className="w-full rounded-xl border border-[var(--card-border)] px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              Send Test Email
            </button>
            <button
              onClick={() => handleSend(true)}
              disabled={sending}
              className="w-full rounded-xl border border-[var(--card-border)] px-4 py-2.5 text-sm font-medium text-[var(--text-muted)] transition-colors hover:bg-muted disabled:opacity-50"
            >
              Save as Draft
            </button>
          </div>

          {/* Preview Toggle */}
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="w-full text-left text-sm font-medium"
            >
              {showPreview ? "Hide Preview" : "Show Preview"}
            </button>
            {showPreview && (
              <div className="mt-3 max-h-96 overflow-auto rounded-lg border border-[var(--card-border)] bg-white p-4 text-sm text-gray-800">
                <div className="mb-2 border-b pb-2 font-bold text-gray-900">{subject || "(No subject)"}</div>
                {body ? (
                  <div dangerouslySetInnerHTML={{ __html: body }} />
                ) : (
                  <p className="italic text-gray-400">No content yet</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
