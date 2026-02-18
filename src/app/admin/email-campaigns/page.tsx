"use client";

import { useState, useEffect, useCallback } from "react";
import AdminRoute from "@/components/AdminRoute";
import NavBar from "@/components/NavBar";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Link from "next/link";
import {
  queueEmail,
  getEmailQueue,
  getEmailStats,
  type EmailMessage,
} from "@/lib/firestore/emailQueue";

export default function EmailCampaignsPage() {
  return (
    <AdminRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <EmailCampaignsContent />
      </div>
    </AdminRoute>
  );
}

function EmailCampaignsContent() {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [stats, setStats] = useState({ pending: 0, sent: 0, error: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  // Compose form state
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipientFilter, setRecipientFilter] = useState<"all" | "custom">("all");
  const [customRecipients, setCustomRecipients] = useState("");
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Preview modal
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [queue, emailStats] = await Promise.all([
        getEmailQueue(20),
        getEmailStats(),
      ]);
      setEmails(queue);
      setStats(emailStats);
    } catch (err) {
      console.error("Failed to load email data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSend() {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    setSuccessMsg("");
    try {
      if (recipientFilter === "custom") {
        const recipients = customRecipients
          .split(",")
          .map((e) => e.trim())
          .filter((e) => e.includes("@"));
        for (const to of recipients) {
          await queueEmail(to, subject, body);
        }
        setSuccessMsg(`Queued ${recipients.length} email(s) successfully.`);
      } else {
        // "All members" — queue a single entry that a Cloud Function / extension
        // would fan out. For now, queue with a special "all" marker.
        await queueEmail("all-members@iopps.ca", subject, body);
        setSuccessMsg("Campaign queued for all members.");
      }
      setSubject("");
      setBody("");
      setCustomRecipients("");
      await loadData();
    } catch (err) {
      console.error("Failed to send campaign:", err);
      setSuccessMsg("Error queueing emails. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function handlePreview() {
    if (!body.trim()) return;
    setPreviewHtml(wrapPreviewHtml(subject, body));
  }

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-6 md:px-10 md:py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link
            href="/admin"
            className="text-sm text-text-muted no-underline hover:underline mb-1 inline-block"
          >
            &larr; Admin Panel
          </Link>
          <h2 className="text-2xl font-extrabold text-text mb-1">
            Email Campaigns
          </h2>
          <p className="text-sm text-text-sec m-0">
            Send announcements and manage the email queue
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-7">
        {[
          { label: "Total Emails", value: stats.total, icon: "mail" },
          { label: "Pending", value: stats.pending, icon: "clock" },
          { label: "Sent", value: stats.sent, icon: "check" },
          { label: "Failed", value: stats.error, icon: "alert" },
        ].map((s, i) => (
          <Card key={i} style={{ padding: 20 }}>
            <p className="text-2xl font-extrabold text-text mt-0 mb-0.5">
              {s.value}
            </p>
            <p className="text-[13px] font-semibold text-text mb-0">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Send Announcement Form */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ padding: "20px 24px" }}>
          <h3 className="text-base font-bold text-text mb-4">
            Send Announcement
          </h3>

          {/* Subject */}
          <label className="block text-sm font-semibold text-text mb-1">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject line"
            className="w-full rounded-lg px-3 py-2 text-sm bg-bg text-text mb-4"
            style={{ border: "1px solid var(--border)", outline: "none" }}
          />

          {/* Body */}
          <label className="block text-sm font-semibold text-text mb-1">
            HTML Body
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="<p>Your email content here...</p>"
            rows={8}
            className="w-full rounded-lg px-3 py-2 text-sm bg-bg text-text mb-4 font-mono"
            style={{
              border: "1px solid var(--border)",
              outline: "none",
              resize: "vertical",
            }}
          />

          {/* Recipient Filter */}
          <label className="block text-sm font-semibold text-text mb-1">
            Recipients
          </label>
          <div className="flex gap-3 mb-3">
            <label className="flex items-center gap-1.5 text-sm text-text cursor-pointer">
              <input
                type="radio"
                name="recipientFilter"
                checked={recipientFilter === "all"}
                onChange={() => setRecipientFilter("all")}
              />
              All Members
            </label>
            <label className="flex items-center gap-1.5 text-sm text-text cursor-pointer">
              <input
                type="radio"
                name="recipientFilter"
                checked={recipientFilter === "custom"}
                onChange={() => setRecipientFilter("custom")}
              />
              Custom List
            </label>
          </div>

          {recipientFilter === "custom" && (
            <textarea
              value={customRecipients}
              onChange={(e) => setCustomRecipients(e.target.value)}
              placeholder="email1@example.com, email2@example.com"
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-sm bg-bg text-text mb-4"
              style={{
                border: "1px solid var(--border)",
                outline: "none",
                resize: "vertical",
              }}
            />
          )}

          {successMsg && (
            <p
              className="text-sm font-semibold mb-3"
              style={{
                color: successMsg.includes("Error")
                  ? "var(--red, #dc2626)"
                  : "var(--teal)",
              }}
            >
              {successMsg}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              primary
              onClick={handleSend}
              style={{ fontSize: 14, opacity: sending ? 0.6 : 1 }}
            >
              {sending ? "Sending..." : "Send Campaign"}
            </Button>
            <Button onClick={handlePreview} style={{ fontSize: 14 }}>
              Preview
            </Button>
          </div>
        </div>
      </Card>

      {/* Email Queue */}
      <h3 className="text-base font-bold text-text mb-3">Email Queue</h3>
      {loading ? (
        <p className="text-sm text-text-muted">Loading...</p>
      ) : emails.length === 0 ? (
        <Card style={{ padding: 24 }}>
          <p className="text-sm text-text-muted text-center m-0">
            No emails in queue yet.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          {emails.map((email) => (
            <Card key={email.id}>
              <div style={{ padding: "14px 20px" }}>
                <div className="flex justify-between items-start mb-1.5">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[15px] font-bold text-text mb-1 truncate">
                      {email.message?.subject || email.template?.name || "Template Email"}
                    </h4>
                    <div className="flex gap-2 items-center flex-wrap">
                      <Badge
                        text={email.status}
                        color={
                          email.status === "sent"
                            ? "var(--teal)"
                            : email.status === "error"
                            ? "var(--red, #dc2626)"
                            : "var(--gold, #d97706)"
                        }
                        bg={
                          email.status === "sent"
                            ? "var(--teal-soft)"
                            : email.status === "error"
                            ? "#dc262615"
                            : "var(--gold-soft, #d9770615)"
                        }
                        small
                      />
                      <span className="text-xs text-text-muted truncate">
                        To: {email.to}
                      </span>
                    </div>
                  </div>
                  {email.message?.html && (
                    <button
                      onClick={() =>
                        setPreviewHtml(
                          wrapPreviewHtml(
                            email.message?.subject || "",
                            email.message?.html || ""
                          )
                        )
                      }
                      className="px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                      style={{
                        background: "var(--border)",
                        color: "var(--teal)",
                        border: "none",
                      }}
                    >
                      Preview
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewHtml && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setPreviewHtml(null)}
        >
          <div
            className="bg-card rounded-2xl overflow-hidden w-full max-w-[640px] mx-4"
            style={{ border: "1px solid var(--border)", maxHeight: "80vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex justify-between items-center px-5 py-3"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <h3 className="text-base font-bold text-text m-0">
                Email Preview
              </h3>
              <button
                onClick={() => setPreviewHtml(null)}
                className="text-text-muted text-lg cursor-pointer bg-transparent border-none"
              >
                &#10005;
              </button>
            </div>
            <div style={{ overflow: "auto", maxHeight: "calc(80vh - 52px)" }}>
              <iframe
                srcDoc={previewHtml}
                title="Email Preview"
                className="w-full border-none"
                style={{ height: 500 }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Wrap raw HTML body in the IOPPS email layout for preview */
function wrapPreviewHtml(subject: string, htmlBody: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
<tr><td style="background:#0F2B4C;padding:24px 32px;text-align:center;">
  <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">IOPPS</span>
</td></tr>
<tr><td style="padding:32px;color:#1f2937;font-size:15px;line-height:1.6;">
  <h2 style="margin:0 0 16px;font-size:18px;color:#0F2B4C;">${subject}</h2>
  ${htmlBody}
</td></tr>
<tr><td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:12px;">
  Indigenous Opportunity Portal &amp; Partnerships System
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
