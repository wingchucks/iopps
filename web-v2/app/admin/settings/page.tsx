"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent } from "@/components/ui";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaymentToggle {
  id: string;
  module: string;
  label: string;
  description: string;
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INITIAL_PAYMENT_TOGGLES: PaymentToggle[] = [
  {
    id: "jobs",
    module: "Jobs",
    label: "Require payment for job posts",
    description:
      "When enabled, employers must pay to publish job listings on the platform.",
    enabled: true,
  },
  {
    id: "conferences",
    module: "Conferences",
    label: "Require payment for featured conferences",
    description:
      "When enabled, conference organizers must pay for featured placement.",
    enabled: false,
  },
  {
    id: "shop-indigenous",
    module: "Shop Indigenous",
    label: "Require payment for vendor listing",
    description:
      "When enabled, vendors must pay to list their business in the directory.",
    enabled: false,
  },
  {
    id: "training",
    module: "Training",
    label: "Require payment for training programs",
    description:
      "When enabled, training providers must pay to list their programs.",
    enabled: false,
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Toggle switch: h-7 w-12 track, h-5 w-5 knob */
function Toggle({
  enabled,
  onToggle,
  label,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={onToggle}
      className={[
        "relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        enabled
          ? "bg-accent"
          : "border-2 border-[var(--card-border)] bg-transparent",
      ].join(" ")}
    >
      <span
        className={[
          "pointer-events-none inline-block h-5 w-5 rounded-full shadow-sm transition-transform duration-200",
          enabled
            ? "translate-x-[22px] translate-y-[2px] bg-white"
            : "translate-x-[2px] translate-y-[2px] bg-text-muted",
        ].join(" ")}
      />
    </button>
  );
}

/** Payment setting row with toggle */
function PaymentSettingRow({
  setting,
  onToggle,
}: {
  setting: PaymentToggle;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-md bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
            {setting.module}
          </span>
        </div>
        <p className="mt-1.5 text-sm font-medium text-text-primary">
          {setting.label}
        </p>
        <p className="mt-0.5 text-xs text-text-muted">{setting.description}</p>
      </div>
      <Toggle
        enabled={setting.enabled}
        onToggle={onToggle}
        label={setting.label}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminSettingsPage() {
  useAuth();

  const [paymentToggles, setPaymentToggles] = useState<PaymentToggle[]>(
    INITIAL_PAYMENT_TOGGLES,
  );

  const handleToggle = (id: string) => {
    setPaymentToggles((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t)),
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
            Platform Settings
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Configure payment requirements and platform features.
          </p>
        </div>

        {/* Payment Settings */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="mb-2">
              <h2 className="text-lg font-semibold text-text-primary">
                Payment Settings
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                Control which modules require payment for listing.
              </p>
            </div>

            <div className="divide-y divide-card-border">
              {paymentToggles.map((setting) => (
                <PaymentSettingRow
                  key={setting.id}
                  setting={setting}
                  onToggle={() => handleToggle(setting.id)}
                />
              ))}
            </div>

            {/* Save note */}
            <div className="mt-4 rounded-lg border border-info/20 bg-info/5 p-3 text-xs text-info">
              Settings will be saved to Firestore. Toggle changes are visual
              only until the API is connected.
            </div>
          </CardContent>
        </Card>

        {/* Feature Flags */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-text-primary">
              Feature Flags
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Toggle platform features on and off.
            </p>
            <div className="mt-6 flex h-32 items-center justify-center rounded-xl border border-dashed border-card-border bg-surface">
              <div className="text-center">
                <svg
                  className="mx-auto h-8 w-8 text-text-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5"
                  />
                </svg>
                <p className="mt-2 text-sm font-medium text-text-primary">
                  Coming soon
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Feature flag management will be available in a future update.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Maintenance */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-text-primary">
              Maintenance
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Platform maintenance and diagnostic tools.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-card-border bg-card px-4 py-2 text-sm font-medium text-text-secondary transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
                Clear Cache
              </button>
              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-card-border bg-card px-4 py-2 text-sm font-medium text-text-secondary transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.42 15.17l-5.384 3.118A1.5 1.5 0 014.5 17.059V6.941a1.5 1.5 0 011.536-1.229l5.384 3.118m0 6.34V8.83m0 6.34a1.5 1.5 0 001.536-.001l5.384-3.118A1.5 1.5 0 0019.5 10.5V13.5a1.5 1.5 0 01-1.536 1.229l-5.384-3.118m0-6.34a1.5 1.5 0 00-1.536-.001"
                  />
                </svg>
                Run Diagnostics
              </button>
            </div>
            <p className="mt-3 text-xs text-text-muted">
              These actions will be enabled once the maintenance API endpoints
              are available.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
