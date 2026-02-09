"use client";

import { useState } from "react";
import Link from "next/link";

const TABS = ["Saved", "Applied", "Following", "Shared"] as const;
type Tab = (typeof TABS)[number];

function EmptyState({
  icon,
  message,
  cta,
}: {
  icon: React.ReactNode;
  message: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center text-center py-12">
      <div className="text-[var(--text-muted)]">{icon}</div>
      <p className="text-sm text-[var(--text-secondary)] mt-3">{message}</p>
      {cta && (
        <Link
          href={cta.href}
          className="rounded-full bg-accent text-white px-5 py-2.5 text-sm font-medium mt-4 hover:opacity-90 transition-opacity"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}

const TAB_CONFIG: Record<Tab, { icon: React.ReactNode; message: string; cta?: { label: string; href: string } }> = {
  Saved: {
    icon: (
      <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    ),
    message: "No saved opportunities yet. Browse jobs to save some.",
    cta: { label: "Browse Jobs", href: "/home/jobs" },
  },
  Applied: {
    icon: (
      <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    message: "No applications yet. Find opportunities to apply.",
    cta: { label: "Find Opportunities", href: "/discover" },
  },
  Following: {
    icon: (
      <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    message: "Not following any organizations. Discover orgs to follow.",
    cta: { label: "Discover", href: "/discover" },
  },
  Shared: {
    icon: (
      <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
    ),
    message: "Nothing shared with you yet.",
  },
};

export default function MyOpportunitiesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Saved");

  const config = TAB_CONFIG[activeTab];

  return (
      <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto">
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-6">My Opportunities</h1>

        {/* Tab bar */}
        <div className="border-b border-[var(--border)] mb-6">
          <div className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-t-lg px-4 py-2 text-sm transition-colors ${
                  activeTab === tab
                    ? "bg-accent text-white font-medium"
                    : "text-[var(--text-secondary)] hover:bg-[var(--background)]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-sm">
          <EmptyState icon={config.icon} message={config.message} cta={config.cta} />
        </div>
      </div>
  );
}
