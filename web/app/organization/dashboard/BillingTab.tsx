"use client";

import { useState } from "react";
import JobBillingContent from "./JobBillingContent";
import ConferenceBillingTab from "./ConferenceBillingTab";

type BillingView = "jobs" | "conferences";

export default function BillingTab() {
    const [activeView, setActiveView] = useState<BillingView>("jobs");

    return (
        <div className="space-y-6">
            {/* Tab Selector */}
            <div className="flex gap-2 border-b border-[var(--card-border)] pb-px">
                <button
                    onClick={() => setActiveView("jobs")}
                    className={`whitespace-nowrap rounded-t-lg px-4 py-3 text-sm font-medium transition-all ${activeView === "jobs"
                            ? "border-b-2 border-accent bg-accent/10 text-accent"
                            : "border-b-2 border-transparent text-[var(--text-muted)] hover:border-[var(--card-border)] hover:text-[var(--text-secondary)]"
                        }`}
                >
                    💼 Job Postings
                </button>
                <button
                    onClick={() => setActiveView("conferences")}
                    className={`whitespace-nowrap rounded-t-lg px-4 py-3 text-sm font-medium transition-all ${activeView === "conferences"
                            ? "border-b-2 border-accent bg-accent/10 text-accent"
                            : "border-b-2 border-transparent text-[var(--text-muted)] hover:border-[var(--card-border)] hover:text-[var(--text-secondary)]"
                        }`}
                >
                    🎟️ Conferences
                </button>
            </div>

            {/* Content */}
            {activeView === "jobs" && <JobBillingContent />}
            {activeView === "conferences" && <ConferenceBillingTab />}
        </div>
    );
}
