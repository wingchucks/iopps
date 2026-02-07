"use client";

import { useEffect, useState } from "react";
import { Opportunity } from "@/lib/types";
import { OpportunityCard } from "./OpportunityCard";
import {
  listJobPostings,
  listScholarships,
  listPowwowEvents,
} from "@/lib/firestore";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export function RadarFeed() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [activeFilter, setActiveFilter] = useState("Hot");

  const filters = [
    { label: "Hot", icon: "\u{1F525}", color: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
    { label: "Community", icon: "\u{1F42E}", color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
    { label: "Opportunities", icon: "\u{1F4BC}", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
    { label: "Wins", icon: "\u{1F389}", color: "text-accent bg-accent/10 border-accent/20" },
  ];

  useEffect(() => {
    async function fetchRadar() {
      try {
        const [jobs, scholarships, powwows] = await Promise.all([
          listJobPostings().catch(() => []),
          listScholarships().catch(() => []),
          listPowwowEvents().catch(() => []),
        ]);

        const mapped: Opportunity[] = [
          ...jobs.slice(0, 10).map((job) => ({
            id: job.id,
            type: "job" as const,
            title: job.title,
            organizationName: job.organizationName || job.company || "",
            organizationId: job.employerId || "",
            location: job.location || "",
            postedAt: job.createdAt || new Date(),
            tags: [
              job.employmentType || "Full-time",
              ...(job.isRemote ? ["Remote"] : []),
            ].filter(Boolean),
            salary: job.salary || undefined,
            trcAligned: job.trcAlignment?.aligned || false,
            originalObject: job,
          })),
          ...scholarships.slice(0, 5).map((s) => ({
            id: s.id,
            type: "scholarship" as const,
            title: s.title || s.name || "",
            organizationName: s.provider || s.organizationName || "",
            organizationId: s.organizationId || "",
            location: s.location || "National",
            postedAt: s.createdAt || new Date(),
            tags: [
              "Education",
              s.amount ? `$${s.amount}` : "",
            ].filter(Boolean),
            originalObject: s,
          })),
          ...powwows.slice(0, 5).map((p) => ({
            id: p.id,
            type: "event" as const,
            title: p.name || p.title || "",
            organizationName: p.organizer || p.organizationName || "",
            organizationId: p.organizationId || "",
            location: p.location || "",
            postedAt: p.createdAt || new Date(),
            tags: ["Cultural", "Community"],
            originalObject: p,
          })),
        ];

        setOpportunities(mapped);
      } catch {
        setOpportunities([]);
      } finally {
        setLoading(false);
      }
    }

    fetchRadar();
  }, []);

  const tabs = ["All", "Careers", "Education", "Business", "Events"];

  if (loading) {
    return <LoadingSpinner size="md" />;
  }

  const filteredOpportunities = opportunities.filter((opp) => {
    if (activeTab === "All") return true;
    if (activeTab === "Careers") return opp.type === "job";
    if (activeTab === "Education") return opp.type === "scholarship";
    if (activeTab === "Business") return opp.type === "business";
    if (activeTab === "Events") return opp.type === "event";
    return true;
  });

  return (
    <div className="space-y-4 pb-20">
      {/* Sticky Header with Tabs */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md pt-2 pb-2 -mx-4 px-4 border-b border-[var(--card-border)]/50">
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab
                  ? "bg-accent text-[var(--text-primary)] shadow-lg shadow-teal-500/20"
                  : "bg-surface text-[var(--text-muted)] border border-[var(--card-border)] hover:border-[var(--card-border)]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "All" && (
          <div className="flex gap-2 overflow-x-auto pb-1 mt-2 no-scrollbar">
            {filters.map((filter) => (
              <button
                key={filter.label}
                onClick={() => setActiveFilter(filter.label)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeFilter === filter.label
                    ? filter.color + " shadow-lg shadow-black/20"
                    : "bg-surface text-foreground0 border border-[var(--card-border)]/50"
                }`}
              >
                <span>{filter.icon}</span>
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {filteredOpportunities.length > 0 ? (
          filteredOpportunities.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} />
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-foreground0">
              No {activeTab === "All" ? "" : activeTab.toLowerCase() + " "}opportunities found yet. Check back soon!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
