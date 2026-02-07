"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { CheckBadgeIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { VerificationStatusBadge, IndigenousBadgeExpanded } from "@/components/IndigenousBadge";
import type { IndigenousVerification } from "@/lib/types";

interface IndigenousVerificationRequestProps {
  verification?: IndigenousVerification;
  onUpdate?: (verification: IndigenousVerification) => void;
}

export default function IndigenousVerificationRequest({
  verification,
  onUpdate,
}: IndigenousVerificationRequestProps) {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [isIndigenousOwned, setIsIndigenousOwned] = useState(false);
  const [isIndigenousLed, setIsIndigenousLed] = useState(false);
  const [nationAffiliation, setNationAffiliation] = useState("");
  const [certifications, setCertifications] = useState("");
  const [requestNotes, setRequestNotes] = useState("");

  const currentStatus = verification?.status || "not_requested";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/organization/verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isIndigenousOwned,
          isIndigenousLed,
          nationAffiliation: nationAffiliation.trim() || null,
          certifications: certifications
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean),
          requestNotes: requestNotes.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit request");
      }

      const data = await res.json();
      setShowForm(false);
      if (onUpdate) {
        onUpdate(data.verification);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/organization/verification", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel request");
      }

      if (onUpdate) {
        onUpdate({ status: "not_requested" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Already approved - show the badge
  if (currentStatus === "approved" && verification) {
    return <IndigenousBadgeExpanded verification={verification} />;
  }

  // Pending - show status and option to cancel
  if (currentStatus === "pending") {
    return (
      <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <CheckBadgeIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">
                Verification Request Pending
              </h4>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Your Indigenous business verification request is being reviewed by
                our team. This typically takes 2-5 business days.
              </p>
              {verification?.requestedAt && (
                <p className="text-xs text-foreground0 mt-2">
                  Submitted:{" "}
                  {(() => {
                    const ts = verification.requestedAt;
                    if (ts && typeof ts === 'object' && 'toDate' in ts) {
                      return (ts as { toDate: () => Date }).toDate().toLocaleDateString();
                    }
                    if (ts && typeof ts === 'object' && '_seconds' in ts) {
                      return new Date((ts as { _seconds: number })._seconds * 1000).toLocaleDateString();
                    }
                    return new Date(ts as number).toLocaleDateString();
                  })()}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="text-[var(--text-muted)] hover:text-red-400 transition-colors p-1"
            title="Cancel request"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        {error && (
          <p className="mt-3 text-sm text-red-400">{error}</p>
        )}
      </div>
    );
  }

  // Rejected - show status and option to reapply
  if (currentStatus === "rejected") {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-red-500/20">
            <CheckBadgeIcon className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-foreground">
              Verification Not Approved
            </h4>
            {verification?.rejectionReason && (
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Reason: {verification.rejectionReason}
              </p>
            )}
            <p className="text-sm text-[var(--text-muted)] mt-2">
              You may submit a new request with additional documentation.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              Submit New Request →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Not requested - show CTA or form
  if (!showForm) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20">
            <CheckBadgeIcon className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-foreground">
              Get Verified as an Indigenous Business
            </h4>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Earn a verified badge to showcase your Indigenous ownership or
              leadership. Verified businesses stand out to job seekers and build
              trust within the community.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-400 hover:bg-amber-500/30 transition-colors"
            >
              <CheckBadgeIcon className="w-4 h-4" />
              Request Verification
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show verification request form
  return (
    <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-foreground flex items-center gap-2">
          <CheckBadgeIcon className="w-5 h-5 text-amber-400" />
          Indigenous Business Verification
        </h4>
        <button
          onClick={() => setShowForm(false)}
          className="text-[var(--text-muted)] hover:text-foreground transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Ownership/Leadership */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-[var(--text-secondary)]">
            Please indicate (select all that apply):
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isIndigenousOwned}
              onChange={(e) => setIsIndigenousOwned(e.target.checked)}
              className="h-4 w-4 rounded border-amber-500/50 bg-surface text-amber-500 focus:ring-amber-500"
            />
            <span className="text-sm text-[var(--text-secondary)]">
              Majority Indigenous Owned (51%+)
            </span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isIndigenousLed}
              onChange={(e) => setIsIndigenousLed(e.target.checked)}
              className="h-4 w-4 rounded border-amber-500/50 bg-surface text-amber-500 focus:ring-amber-500"
            />
            <span className="text-sm text-[var(--text-secondary)]">
              Indigenous Leadership / Management
            </span>
          </label>
        </div>

        {/* Nation Affiliation */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
            Nation / Community Affiliation (Optional)
          </label>
          <input
            type="text"
            value={nationAffiliation}
            onChange={(e) => setNationAffiliation(e.target.value)}
            placeholder="e.g., Cree Nation, Métis Nation of Ontario"
            className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground placeholder-slate-500 focus:border-amber-500 focus:outline-none"
          />
        </div>

        {/* Certifications */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
            Certifications (Optional)
          </label>
          <input
            type="text"
            value={certifications}
            onChange={(e) => setCertifications(e.target.value)}
            placeholder="e.g., CCAB Certified, CAMSC, PAR (separate with commas)"
            className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground placeholder-slate-500 focus:border-amber-500 focus:outline-none"
          />
          <p className="text-xs text-foreground0 mt-1">
            Separate multiple certifications with commas
          </p>
        </div>

        {/* Additional Notes */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
            Additional Information (Optional)
          </label>
          <textarea
            value={requestNotes}
            onChange={(e) => setRequestNotes(e.target.value)}
            placeholder="Any additional details to support your verification request..."
            rows={3}
            className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground placeholder-slate-500 focus:border-amber-500 focus:outline-none resize-none"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || (!isIndigenousOwned && !isIndigenousLed)}
            className="flex-1 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Submitting..." : "Submit Verification Request"}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="rounded-lg border border-[var(--card-border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-surface transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
