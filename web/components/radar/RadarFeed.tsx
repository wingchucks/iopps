"use client";

import { useEffect, useState } from "react";
import { Opportunity, JobPosting, Scholarship, PowwowEvent } from "@/lib/types";
import { OpportunityCard } from "./OpportunityCard";
import { Loader2 } from "lucide-react";

export function RadarFeed() {
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [loading, setLoading] = useState(true);

    const [activeFilter, setActiveFilter] = useState("Hot");

    const filters = [
        { label: "Hot", icon: "🔥", color: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
        { label: "Community", icon: "🐮", color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
        { label: "Opportunities", icon: "💼", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
        { label: "Wins", icon: "🎉", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
    ];

    useEffect(() => {
        async function fetchRadar() {
            // Mocking fetch logic for MVP until firestore/radar export exists
            // In real implementation, these would be Promise.all from fetchers

            // Placeholder data generation
            const mockOpportunities: Opportunity[] = [
                {
                    id: "1",
                    type: "job",
                    title: "Marketing Coordinator",
                    organizationName: "SaskTel",
                    organizationId: "org1",
                    location: "Saskatoon, SK",
                    postedAt: new Date(Date.now() - 3600000), // 1 hour ago
                    tags: ["Full-time", "Marketing"],
                    salary: "$55k - $65k",
                    connectionCount: 4,
                    matchScore: 95,
                    trcAligned: true,
                    originalObject: {} as JobPosting,
                },
                {
                    id: "2",
                    type: "event",
                    title: "Saskatoon Pow Wow 2025",
                    organizationName: "SaskTel Centre",
                    organizationId: "org2",
                    location: "Saskatoon, SK",
                    postedAt: new Date(Date.now() - 86400000), // 1 day ago
                    tags: ["Cultural", "Live Music", "Family"],
                    connectionCount: 34,
                    matchScore: 88,
                    imageUrl: "https://images.unsplash.com/photo-1533174072545-e8d4aa97edf9?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=60",
                    originalObject: {} as PowwowEvent,
                },
                {
                    id: "3",
                    type: "scholarship",
                    title: "Indigenous Youth Clean Energy Grant",
                    organizationName: "Clean Energy Canada",
                    organizationId: "org3",
                    location: "National",
                    postedAt: new Date(Date.now() - 172800000), // 2 days ago
                    tags: ["Education", "Environment", "$5000"],
                    matchScore: 72,
                    originalObject: {} as Scholarship,
                },
                {
                    id: "4",
                    type: "job",
                    title: "Project Manager",
                    organizationName: "Nutrien",
                    organizationId: "org4",
                    location: "Saskatoon, SK",
                    postedAt: new Date(Date.now() - 200000000),
                    tags: ["Full-time", "Management"],
                    salary: "$70k - $85k",
                    connectionCount: 7,
                    matchScore: 82,
                    originalObject: {} as JobPosting,
                }
            ];

            setOpportunities(mockOpportunities);
            setLoading(false);
        }

        fetchRadar();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-20">
            {/* Daily Drop Header */}
            {/* Daily Drop Header */}
            <div className="mb-4">
                {/* Filter Pills */}
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {filters.map((filter) => (
                        <button
                            key={filter.label}
                            onClick={() => setActiveFilter(filter.label)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeFilter === filter.label
                                ? filter.color + " shadow-lg shadow-black/20"
                                : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600"
                                }`}
                        >
                            <span>{filter.icon}</span>
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {opportunities.map((opp) => (
                    <OpportunityCard key={opp.id} opportunity={opp} />
                ))}
            </div>

            <div className="text-center py-8">
                <p className="text-slate-500 text-sm">That's all for now.</p>
                <button className="mt-2 text-teal-400 text-sm font-medium">Refine Tags</button>
            </div>
        </div>
    );
}
