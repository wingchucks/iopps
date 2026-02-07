"use client";

import { useState, useEffect } from "react";

export type TabId = "employers" | "education" | "events" | "vendors" | "streaming";

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const tabs: Tab[] = [
  { id: "employers", label: "Employers", icon: "💼" },
  { id: "education", label: "Education & Training", icon: "🎓" },
  { id: "events", label: "Event Organizers", icon: "📅" },
  { id: "vendors", label: "Vendors", icon: "🏪" },
  { id: "streaming", label: "Live Streaming", icon: "📺" },
];

interface PricingTabsProps {
  children: (activeTab: TabId) => React.ReactNode;
}

export default function PricingTabs({ children }: PricingTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("employers");

  // Read tab from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1) as TabId;
    if (hash && tabs.some(t => t.id === hash)) {
      setActiveTab(hash);
    }
  }, []);

  // Update URL hash when tab changes
  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    window.history.replaceState(null, "", `#${tabId}`);
  };

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b border-[var(--card-border)]">
        {/* Desktop tabs */}
        <nav className="hidden sm:flex gap-1 overflow-x-auto" role="tablist" aria-label="Pricing categories">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-[#14B8A6] text-[#14B8A6]"
                  : "border-transparent text-[var(--text-muted)] hover:text-foreground hover:border-[var(--card-border)]"
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Mobile dropdown */}
        <div className="sm:hidden p-4">
          <label htmlFor="pricing-tab-select" className="sr-only">
            Select pricing category
          </label>
          <select
            id="pricing-tab-select"
            value={activeTab}
            onChange={(e) => handleTabChange(e.target.value as TabId)}
            className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-3 text-foreground focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.icon} {tab.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab Panel */}
      <div
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        className="py-8"
      >
        {children(activeTab)}
      </div>
    </div>
  );
}
