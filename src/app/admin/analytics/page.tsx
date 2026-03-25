"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent } from "@/components/ui";

const KPI_CARDS = [
  {
    label: "Primary KPI",
    value: "Unique visitors",
    detail: "Use the last 30 days on production.",
  },
  {
    label: "Source of truth",
    value: "Vercel Web Analytics",
    detail: "No custom charts live in the admin for v1.",
  },
  {
    label: "Supporting metrics",
    value: "Pageviews + light conversions",
    detail: "Partner interest, contact intent, apply intent, signup completed.",
  },
];

const KPI_DEFINITIONS = [
  {
    title: "Unique visitors",
    detail: "The number to quote to prospects. Use a rolling 30-day production window.",
  },
  {
    title: "Pageviews",
    detail: "Use as secondary proof of engagement alongside unique visitors.",
  },
  {
    title: "Partner interest",
    detail: "Tracked from public partner CTA clicks on the homepage partner strip and partners page.",
  },
  {
    title: "Contact intent",
    detail: "Tracked from contact form mailto opens and contact mailto link clicks.",
  },
  {
    title: "Apply intent",
    detail: "Tracked from public apply buttons on jobs, programs, scholarships, and schools.",
  },
  {
    title: "Signup completed",
    detail: "Tracked after successful community or organization signup paths complete.",
  },
];

export default function AdminAnalyticsPage() {
  useAuth();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
            Platform Analytics
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Vercel Web Analytics is the source of truth for public traffic and
            customer-facing visitor counts.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {KPI_CARDS.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-card-border bg-card p-5"
            >
              <p className="text-sm text-text-muted">{card.label}</p>
              <p className="mt-2 text-2xl font-bold text-text-primary">
                {card.value}
              </p>
              <p className="mt-2 text-sm text-text-secondary">{card.detail}</p>
            </div>
          ))}
        </div>

        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-text-primary">
              Where To Find The Numbers
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Open the Vercel project dashboard and use Analytics for all v1
              traffic reporting.
            </p>
            <ol className="mt-6 list-decimal space-y-3 pl-5 text-sm text-text-secondary">
              <li>Go to the Vercel dashboard for the live IOPPS project.</li>
              <li>Open <strong>Analytics</strong> in the project sidebar.</li>
              <li>
                Use the production view and a <strong>Last 30 days</strong>{" "}
                window.
              </li>
              <li>
                Quote unique visitors first, then pageviews and light
                conversion events if needed.
              </li>
            </ol>
            <a
              href="https://vercel.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white no-underline hover:opacity-90"
            >
              Open Vercel Dashboard
            </a>
          </CardContent>
        </Card>

        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-text-primary">
                KPI Definitions
              </h2>
              <div className="space-y-4">
                {KPI_DEFINITIONS.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-xl border border-card-border bg-surface p-4"
                  >
                    <p className="text-sm font-semibold text-text-primary">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm text-text-secondary">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-text-primary">
                Customer-Facing Wording
              </h2>
              <div className="rounded-xl border border-card-border bg-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Recommended Script
                </p>
                <p className="mt-3 text-base font-semibold text-text-primary">
                  We had X unique visitors and Y pageviews in the last 30 days.
                </p>
              </div>
              <div className="mt-4 rounded-xl border border-card-border bg-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Notes
                </p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text-secondary">
                  <li>Do not use placeholder data or admin mock stats.</li>
                  <li>Do not use &quot;hits&quot; as a sales metric.</li>
                  <li>
                    Historical data starts from the date Vercel Analytics was
                    deployed.
                  </li>
                </ul>
              </div>
              <div className="mt-4 rounded-xl border border-info/20 bg-info/5 p-4 text-sm text-info">
                If you do not see traffic yet, confirm Web Analytics is enabled
                in the Vercel project settings.
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-text-primary">
              What Changed In v1
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {[
                "Automatic pageview and visitor tracking across the full site",
                "Partner interest tracking on public partner CTAs",
                "Contact intent tracking on public contact flows",
                "Apply intent tracking on public opportunity pages",
                "Signup completion tracking for community and organization flows",
                "Removal of fabricated analytics cards and charts from admin",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-card-border bg-surface p-4 text-sm text-text-secondary"
                >
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
