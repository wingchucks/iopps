"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  REPORT_DETAILS_MAX_LENGTH,
  submitReport,
  type ReportReason,
  type ReportTargetType,
} from "@/lib/firestore/reports";
import Button from "./Button";

interface ReportButtonProps {
  targetType: ReportTargetType;
  targetId: string;
  targetTitle?: string;
}

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "inappropriate", label: "Inappropriate Content" },
  { value: "misinformation", label: "Misinformation" },
  { value: "other", label: "Other" },
];

function reportErrorMessage(error: unknown): string {
  const status = error && typeof error === "object" && "status" in error ? (error as { status?: unknown }).status : undefined;
  if (status === 401) return "Please sign in again to report this content.";
  if (status === 403) return "Your account can't send reports right now. Contact IOPPS for help.";
  if (status === 429) return "You have sent several reports recently. Please try again later.";
  if (status === 400) return "This report could not be sent. Check the details and try again.";
  return "Failed to submit report. Please try again.";
}

// Return here after signing in; the dialog only renders after a click in the browser.
function signInHref(): string {
  return `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
}

export default function ReportButton({
  targetType,
  targetId,
  targetTitle,
}: ReportButtonProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | "">("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [duplicate, setDuplicate] = useState(false);

  const handleSubmit = async () => {
    if (!user || !reason || submitting) return;
    setSubmitting(true);
    try {
      const result = await submitReport(user, { targetType, targetId, targetTitle, reason, details });
      setDuplicate(result.duplicate);
      setSubmitted(true);
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setDuplicate(false);
        setReason("");
        setDetails("");
      }, 1500);
    } catch (err) {
      console.error("Failed to submit report:", err);
      showToast(reportErrorMessage(err), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer hover:text-red transition-colors duration-150"
        style={{ background: "none", border: "none", padding: "4px 0" }}
        title="Report"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" y1="22" x2="4" y2="15" />
        </svg>
        Report
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          <div
            className="bg-card rounded-2xl w-full max-w-md mx-4"
            style={{ border: "1px solid var(--border)" }}
          >
            <div style={{ padding: "20px 24px" }}>
              {submitted ? (
                <div className="text-center py-6" role="status">
                  <p className="text-3xl mb-2">&#10003;</p>
                  <p className="text-base font-bold text-text mb-1">
                    {duplicate ? "Already Reported" : "Report Submitted"}
                  </p>
                  <p className="text-sm text-text-muted">
                    {duplicate
                      ? "You already reported this. Our team will review it."
                      : "Thank you. Our team will review this."}
                  </p>
                </div>
              ) : !user ? (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-text m-0">
                      Report Content
                    </h3>
                    <button
                      onClick={() => setOpen(false)}
                      className="text-text-muted cursor-pointer hover:text-text"
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: 20,
                        lineHeight: 1,
                      }}
                      aria-label="Close report dialog"
                    >
                      &#215;
                    </button>
                  </div>
                  <p className="text-sm text-text-sec mb-4">
                    Sign in to report content. Reports are reviewed by the IOPPS moderation team.
                  </p>
                  <div className="flex gap-2.5">
                    <Button onClick={() => setOpen(false)} style={{ flex: 1 }}>
                      Not Now
                    </Button>
                    <Link
                      href={signInHref()}
                      className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[14px] button-gradient px-5 text-sm font-semibold text-white no-underline"
                    >
                      Sign In to Report
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-text m-0">
                      Report Content
                    </h3>
                    <button
                      onClick={() => setOpen(false)}
                      className="text-text-muted cursor-pointer hover:text-text"
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: 20,
                        lineHeight: 1,
                      }}
                      aria-label="Close report dialog"
                    >
                      &#215;
                    </button>
                  </div>

                  {targetTitle && (
                    <p className="text-xs text-text-muted mb-3">
                      Reporting: {targetTitle}
                    </p>
                  )}

                  <p className="text-sm font-semibold text-text mb-2">
                    Reason
                  </p>
                  <div className="flex flex-col gap-1.5 mb-4">
                    {REASONS.map((r) => (
                      <label
                        key={r.value}
                        className="flex items-center gap-2.5 cursor-pointer rounded-xl px-3 py-2.5 transition-colors"
                        style={{
                          background:
                            reason === r.value
                              ? "rgba(13,148,136,.08)"
                              : "transparent",
                          border:
                            reason === r.value
                              ? "1.5px solid var(--teal)"
                              : "1.5px solid var(--border)",
                        }}
                      >
                        <input
                          type="radio"
                          name="reason"
                          value={r.value}
                          checked={reason === r.value}
                          onChange={() => setReason(r.value)}
                          className="accent-[var(--teal)]"
                        />
                        <span className="text-sm text-text">{r.label}</span>
                      </label>
                    ))}
                  </div>

                  <p className="text-sm font-semibold text-text mb-2">
                    Additional Details (optional)
                  </p>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Provide any additional context..."
                    rows={3}
                    maxLength={REPORT_DETAILS_MAX_LENGTH}
                    aria-describedby="report-details-count"
                    className="w-full rounded-xl text-sm text-text resize-none"
                    style={{
                      padding: "10px 14px",
                      background: "var(--bg)",
                      border: "1.5px solid var(--border)",
                      outline: "none",
                    }}
                  />
                  <p id="report-details-count" className="text-xs text-text-muted text-right mt-1 mb-4">
                    {details.length}/{REPORT_DETAILS_MAX_LENGTH}
                  </p>

                  <div className="flex gap-2.5">
                    <Button
                      onClick={() => setOpen(false)}
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </Button>
                    <Button
                      primary
                      onClick={handleSubmit}
                      disabled={!reason || submitting}
                      style={{
                        flex: 1,
                        background: "var(--red)",
                        opacity: !reason || submitting ? 0.6 : 1,
                      }}
                    >
                      {submitting ? "Submitting..." : "Submit Report"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
