"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import OrgRoute from "@/components/OrgRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { getMemberProfile } from "@/lib/firestore/members";
import {
  getOrganization,
  updateOrganization,
} from "@/lib/firestore/organizations";

const STATUS_CONFIGS = [
  {
    key: "reviewing",
    label: "Reviewing",
    description: "Sent when you move an application to 'Reviewing'",
    defaultText:
      "Thank you for applying. We have received your application and our team is currently reviewing it. We will be in touch with next steps.",
    color: "#F59E0B",
  },
  {
    key: "shortlisted",
    label: "Shortlisted",
    description: "Sent when you shortlist a candidate",
    defaultText:
      "Great news! Your application has been shortlisted. We were impressed with your qualifications and would like to move forward in the process.",
    color: "#0D9488",
  },
  {
    key: "interview",
    label: "Interview",
    description: "Sent when you move a candidate to the interview stage",
    defaultText:
      "Congratulations! We would like to invite you for an interview. Please check your email for scheduling details, or reach out to us to arrange a time.",
    color: "#8B5CF6",
  },
  {
    key: "offered",
    label: "Offer",
    description: "Sent when you extend an offer to a candidate",
    defaultText:
      "We are pleased to extend an offer for this position! We believe you would be a great fit for our team. Please review the details and let us know your decision.",
    color: "#10B981",
  },
  {
    key: "rejected",
    label: "Rejection",
    description: "Sent when you decline a candidate",
    defaultText:
      "Thank you for your interest in this position. After careful consideration, we have decided to move forward with other candidates. We encourage you to apply for future openings.",
    color: "#DC2626",
  },
];

export default function EmailTemplatesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [orgId, setOrgId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [previewKey, setPreviewKey] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const profile = await getMemberProfile(user.uid);
      if (!profile?.orgId) return;
      setOrgId(profile.orgId);

      const org = await getOrganization(profile.orgId);
      if (org) {
        // Load saved templates or use defaults
        const saved = org.emailTemplates;
        const merged: Record<string, string> = {};
        for (const cfg of STATUS_CONFIGS) {
          merged[cfg.key] = saved?.[cfg.key] || cfg.defaultText;
        }
        setTemplates(merged);
      }
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      await updateOrganization(orgId, {
        emailTemplates: templates,
      });
      showToast("Templates saved", "success");
    } catch (err) {
      console.error("Save failed:", err);
      showToast("Failed to save templates", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = (key: string) => {
    const cfg = STATUS_CONFIGS.find((c) => c.key === key);
    if (cfg) {
      setTemplates((prev) => ({ ...prev, [key]: cfg.defaultText }));
    }
  };

  const inputStyle: React.CSSProperties = {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    color: "var(--text)",
  };

  return (
    <OrgRoute>
      <AppShell>
        <div className="min-h-screen bg-bg">
          <div className="max-w-[900px] mx-auto px-4 py-8 md:px-10">
            <Link
              href="/org/dashboard"
              className="text-sm font-semibold mb-6 inline-block no-underline"
              style={{ color: "var(--teal)" }}
            >
              &larr; Back to Dashboard
            </Link>

            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div>
                <h1
                  className="text-2xl font-bold"
                  style={{ color: "var(--text)" }}
                >
                  Email Templates
                </h1>
                <p
                  className="text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  Customize the emails sent to candidates when you update their application status
                </p>
              </div>
              <Button
                primary
                onClick={handleSave}
                className={saving ? "opacity-50 pointer-events-none" : ""}
              >
                {saving ? "Saving..." : "Save All Templates"}
              </Button>
            </div>

            {loading ? (
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-40 rounded-2xl skeleton" />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {STATUS_CONFIGS.map((cfg) => (
                  <Card key={cfg.key} className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: cfg.color }}
                      />
                      <h3
                        className="text-base font-bold"
                        style={{ color: "var(--text)" }}
                      >
                        {cfg.label}
                      </h3>
                    </div>
                    <p
                      className="text-xs mb-3"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {cfg.description}
                    </p>
                    <textarea
                      value={templates[cfg.key] || ""}
                      onChange={(e) =>
                        setTemplates((prev) => ({
                          ...prev,
                          [cfg.key]: e.target.value,
                        }))
                      }
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-xl text-sm resize-y mb-2"
                      style={inputStyle}
                      placeholder="Enter your custom message..."
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReset(cfg.key)}
                        className="text-xs font-semibold cursor-pointer border-none rounded-lg px-3 py-1.5"
                        style={{
                          background: "var(--bg)",
                          color: "var(--text-muted)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        Reset to Default
                      </button>
                      <button
                        onClick={() =>
                          setPreviewKey(
                            previewKey === cfg.key ? null : cfg.key
                          )
                        }
                        className="text-xs font-semibold cursor-pointer border-none rounded-lg px-3 py-1.5"
                        style={{
                          background: "rgba(13,148,136,.1)",
                          color: "var(--teal)",
                        }}
                      >
                        {previewKey === cfg.key ? "Hide Preview" : "Preview"}
                      </button>
                      {templates[cfg.key] !== cfg.defaultText && (
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: "rgba(245,158,11,.1)",
                            color: "#F59E0B",
                          }}
                        >
                          Customized
                        </span>
                      )}
                    </div>
                    {/* Preview panel */}
                    {previewKey === cfg.key && (
                      <div
                        className="mt-3 p-4 rounded-xl text-sm leading-relaxed"
                        style={{
                          background: "var(--bg)",
                          border: "1px solid var(--border)",
                          color: "var(--text-sec)",
                        }}
                      >
                        <p
                          className="text-xs font-bold mb-2 tracking-wider uppercase"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Email Preview
                        </p>
                        <p className="mb-2">
                          <strong>Subject:</strong> Application Update:{" "}
                          {cfg.label}
                        </p>
                        <div
                          className="rounded-lg p-3"
                          style={{
                            background: "var(--card)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          <p className="mb-2">Hi [Candidate Name],</p>
                          <p className="mb-2">
                            Your application for{" "}
                            <strong>[Job Title]</strong>{" "}
                            has been updated.
                          </p>
                          <div
                            className="rounded-lg p-3 my-3"
                            style={{
                              background: "rgba(13,148,136,.05)",
                              borderLeft: `3px solid ${cfg.color}`,
                            }}
                          >
                            {templates[cfg.key]}
                          </div>
                          <p
                            className="text-xs"
                            style={{ color: "var(--text-muted)" }}
                          >
                            — {"{"}Your Organization Name{"}"}
                          </p>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </AppShell>
    </OrgRoute>
  );
}
