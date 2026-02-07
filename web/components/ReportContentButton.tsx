"use client";

import { useState } from "react";
import { FlagIcon, XMarkIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import type { FlaggedContentType, FlagReason } from "@/lib/types";

interface ReportContentButtonProps {
  contentType: FlaggedContentType;
  contentId: string;
  contentTitle?: string;
  contentPreview?: string;
  variant?: "icon" | "text" | "full";
  className?: string;
}

const REASON_OPTIONS: { value: FlagReason; label: string; description: string }[] = [
  { value: "spam", label: "Spam", description: "Unwanted promotional content" },
  { value: "inappropriate", label: "Inappropriate", description: "Content not suitable for the platform" },
  { value: "misleading", label: "Misleading", description: "False or deceptive information" },
  { value: "offensive", label: "Offensive", description: "Hateful, harmful, or abusive content" },
  { value: "scam", label: "Scam/Fraud", description: "Fraudulent or suspicious activity" },
  { value: "duplicate", label: "Duplicate", description: "Same content posted multiple times" },
  { value: "cultural_concern", label: "Cultural Concern", description: "Misrepresentation of Indigenous culture or practices" },
  { value: "other", label: "Other", description: "Other issue not listed above" },
];

export default function ReportContentButton({
  contentType,
  contentId,
  contentTitle,
  contentPreview,
  variant = "icon",
  className = "",
}: ReportContentButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<FlagReason | "">("");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) return;

    setSubmitting(true);
    setResult(null);

    try {
      const response = await fetch("/api/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType,
          contentId,
          contentTitle,
          contentPreview,
          reporterEmail: email || undefined,
          reason: selectedReason,
          reasonDetails: details || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: data.message || "Report submitted successfully",
        });
        // Reset form after success
        setTimeout(() => {
          setIsOpen(false);
          setSelectedReason("");
          setDetails("");
          setEmail("");
          setResult(null);
        }, 2000);
      } else {
        setResult({
          success: false,
          message: data.error || "Failed to submit report",
        });
      }
    } catch {
      setResult({
        success: false,
        message: "Something went wrong. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const buttonContent = {
    icon: <FlagIcon className="h-5 w-5" />,
    text: "Report",
    full: (
      <>
        <FlagIcon className="h-4 w-4" />
        Report Content
      </>
    ),
  };

  const buttonStyles = {
    icon: "p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors",
    text: "text-sm text-slate-500 hover:text-red-400 transition-colors",
    full: "flex items-center gap-2 px-3 py-1.5 text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors",
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`${buttonStyles[variant]} ${className}`}
        title="Report this content"
      >
        {buttonContent[variant]}
      </button>

      {/* Report Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                  <FlagIcon className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Report Content</h2>
                  <p className="text-sm text-slate-400">Help us maintain community standards</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Success/Error Message */}
            {result && (
              <div
                className={`mt-4 rounded-lg p-4 ${
                  result.success
                    ? "bg-emerald-500/10 border border-emerald-500/20"
                    : "bg-red-500/10 border border-red-500/20"
                }`}
              >
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircleIcon className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <XMarkIcon className="h-5 w-5 text-red-400" />
                  )}
                  <p className={result.success ? "text-emerald-400" : "text-red-400"}>
                    {result.message}
                  </p>
                </div>
              </div>
            )}

            {/* Form */}
            {!result?.success && (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {/* Reason Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Why are you reporting this? *
                  </label>
                  <div className="space-y-2">
                    {REASON_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                          selectedReason === option.value
                            ? "border-teal-500 bg-teal-500/10"
                            : "border-slate-700 hover:border-slate-600"
                        }`}
                      >
                        <input
                          type="radio"
                          name="reason"
                          value={option.value}
                          checked={selectedReason === option.value}
                          onChange={() => setSelectedReason(option.value)}
                          className="mt-1 h-4 w-4 text-teal-500 border-slate-600 focus:ring-teal-500 bg-slate-800"
                        />
                        <div>
                          <p className="font-medium text-slate-200">{option.label}</p>
                          <p className="text-sm text-slate-500">{option.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Additional Details */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Additional details (optional)
                  </label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={3}
                    placeholder="Please provide any additional context..."
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-teal-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Your email (optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-teal-500 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Only if you&apos;d like us to follow up with you
                  </p>
                </div>

                {/* Submit */}
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedReason || submitting}
                    className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
