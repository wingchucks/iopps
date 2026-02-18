"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { submitReport, type ContentReport } from "@/lib/firestore/reports";
import Button from "./Button";

interface ReportButtonProps {
  targetType: ContentReport["targetType"];
  targetId: string;
  targetTitle?: string;
}

const REASONS: { value: ContentReport["reason"]; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "inappropriate", label: "Inappropriate Content" },
  { value: "misinformation", label: "Misinformation" },
  { value: "other", label: "Other" },
];

export default function ReportButton({
  targetType,
  targetId,
  targetTitle,
}: ReportButtonProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ContentReport["reason"] | "">("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!user || !reason) return;
    setSubmitting(true);
    try {
      await submitReport({
        reporterId: user.uid,
        reporterName: user.displayName || undefined,
        targetType,
        targetId,
        targetTitle,
        reason,
        details: details.trim() || undefined,
      });
      setSubmitted(true);
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setReason("");
        setDetails("");
      }, 1500);
    } catch (err) {
      console.error("Failed to submit report:", err);
      showToast("Failed to submit report. Please try again.", "error");
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
                <div className="text-center py-6">
                  <p className="text-3xl mb-2">&#10003;</p>
                  <p className="text-base font-bold text-text mb-1">
                    Report Submitted
                  </p>
                  <p className="text-sm text-text-muted">
                    Thank you. Our team will review this.
                  </p>
                </div>
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
                    className="w-full rounded-xl text-sm text-text mb-4 resize-none"
                    style={{
                      padding: "10px 14px",
                      background: "var(--bg)",
                      border: "1.5px solid var(--border)",
                      outline: "none",
                    }}
                  />

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
