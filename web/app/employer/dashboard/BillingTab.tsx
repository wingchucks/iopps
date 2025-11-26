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
            <div className="flex gap-2 border-b border-slate-800 pb-px">
                <button
                    onClick={() => setActiveView("jobs")}
                    className={`whitespace-nowrap rounded-t-lg px-4 py-3 text-sm font-medium transition-all ${activeView === "jobs"
                            ? "border-b-2 border-emerald-500 bg-emerald-500/10 text-emerald-400"
                            : "border-b-2 border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-300"
                        }`}
                >
                    💼 Job Postings
                </button>
                <button
                    onClick={() => setActiveView("conferences")}
                    className={`whitespace-nowrap rounded-t-lg px-4 py-3 text-sm font-medium transition-all ${activeView === "conferences"
                            ? "border-b-2 border-emerald-500 bg-emerald-500/10 text-emerald-400"
                            : "border-b-2 border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-300"
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
