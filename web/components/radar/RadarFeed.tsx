"use client";

import { useEffect, useState } from "react";
import { Opportunity, JobPosting, Scholarship, PowwowEvent } from "@/lib/types";
import { OpportunityCard } from "./OpportunityCard";
import { Loader2 } from "lucide-react";

export function RadarFeed() {
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("All");

    const [activeFilter, setActiveFilter] = useState("Hot");

    const filters = [
        { label: "Hot", icon: "🔥", color: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
        { label: "Community", icon: "🐮", color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
        { label: "Opportunities", icon: "💼", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
        { label: "Wins", icon: "🎉", color: "text-accent bg-accent/10 border-accent/20" },
    ];

    useEffect(() => {
        async function fetchRadar() {
            // Mocking fetch logic for MVP until firestore/radar export exists
            // In real implementation, these would be Promise.all from fetchers

            // Placeholder data generation
            const mockOpportunities: Opportunity[] = [
                // JOBS
                {
                    id: "1",
                    type: "job",
                    title: "Senior Project Manager",
                    organizationName: "SaskTel",
                    organizationId: "org1",
                    location: "Saskatoon, SK",
                    postedAt: new Date(Date.now() - 3600000), // 1 hour ago
                    tags: ["Full-time", "Management", "100% Remote"],
                    salary: "$85k - $110k",
                    connectionCount: 4,
                    matchScore: 98,
                    trcAligned: true,
                    originalObject: {} as JobPosting,
                },
                {
                    id: "4",
                    type: "job",
                    title: "Community Engagement Lead",
                    organizationName: "Nutrien",
                    organizationId: "org4",
                    location: "Saskatoon, SK",
                    postedAt: new Date(Date.now() - 7200000), // 2 hours ago
                    tags: ["Community", "Relations"],
                    salary: "$75k - $90k",
                    connectionCount: 12,
                    matchScore: 85,
                    originalObject: {} as JobPosting,
                },
                {
                    id: "j3",
                    type: "job",
                    title: "Frontend Developer (React)",
                    organizationName: "Vendasta",
                    organizationId: "org7",
                    location: "Saskatoon, SK",
                    postedAt: new Date(Date.now() - 86400000 * 2),
                    tags: ["Tech", "Remote Hybrid"],
                    salary: "$70k - $95k",
                    matchScore: 60,
                    originalObject: {} as JobPosting,
                },

                // EVENTS
                {
                    id: "2",
                    type: "event",
                    title: "Saskatoon Pow Wow 2025",
                    organizationName: "SaskTel Centre",
                    organizationId: "org2",
                    location: "Saskatoon, SK",
                    postedAt: new Date(Date.now() - 86400000),
                    tags: ["Cultural", "Live Music", "Family"],
                    connectionCount: 34,
                    matchScore: 92,
                    imageUrl: "https://images.unsplash.com/photo-1533174072545-e8d4aa97edf9?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=60",
                    originalObject: {} as PowwowEvent,
                },
                {
                    id: "e2",
                    type: "event",
                    title: "Indigenous Tech Summit",
                    organizationName: "First Nations Tech Council",
                    organizationId: "org9",
                    location: "Vancouver, BC",
                    postedAt: new Date(Date.now() - 86400000 * 4),
                    tags: ["Tech", "Networking", "Innovation"],
                    connectionCount: 8,
                    matchScore: 78,
                    imageUrl: "https://images.unsplash.com/photo-1544531586-fde5298cdd40?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=60",
                    originalObject: {} as PowwowEvent,
                },

                // EDUCATION
                {
                    id: "3",
                    type: "scholarship",
                    title: "Indigenous Youth Clean Energy Grant",
                    organizationName: "Clean Energy Canada",
                    organizationId: "org3",
                    location: "National",
                    postedAt: new Date(Date.now() - 172800000),
                    tags: ["Education", "Environment", "$5000"],
                    matchScore: 72,
                    originalObject: {} as Scholarship,
                },
                {
                    id: "s2",
                    type: "scholarship",
                    title: "MBA Indigenous Leadership Award",
                    organizationName: "Edwards School of Business",
                    organizationId: "org5",
                    location: "University of Saskatchewan",
                    postedAt: new Date(Date.now() - 86400000 * 5),
                    tags: ["Masters", "Business", "$15,000"],
                    matchScore: 45,
                    originalObject: {} as Scholarship,
                },

                // TRAINING
                {
                    id: "t1",
                    type: "training",
                    title: "Intro to Python Programming",
                    organizationName: "ComIT",
                    organizationId: "org6",
                    location: "Online",
                    postedAt: new Date(Date.now() - 86400000 * 1),
                    tags: ["Free", "Coding", "Beginner"],
                    matchScore: 88,
                    imageUrl: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=60",
                } as any, // casting as any temporarily for training type

                // BUSINESS 
                {
                    id: "b1",
                    type: "business",
                    title: "Birch & Bear Co.",
                    organizationName: "Clothing & Apparel",
                    organizationId: "org8",
                    location: "Winnipeg, MB",
                    postedAt: new Date(Date.now() - 86400000 * 3),
                    tags: ["Indigenous Owned", "Retail", "Sustainable"],
                    matchScore: 99,
                    imageUrl: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=60",
                    originalObject: {} as any,
                },
                {
                    id: "b2",
                    type: "business",
                    title: "Red River Consulting",
                    organizationName: "Professional Services",
                    organizationId: "org10",
                    location: "Remote / National",
                    postedAt: new Date(Date.now() - 86400000 * 6),
                    tags: ["Consulting", "Strategy", "HR"],
                    matchScore: 75,
                    originalObject: {} as any,
                },
            ];

            setOpportunities(mockOpportunities);
            setLoading(false);
        }

        fetchRadar();
    }, []);

    const tabs = ["All", "Careers", "Education", "Business", "Events"];

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
        );
    }

    const filteredOpportunities = opportunities.filter(opp => {
        if (activeTab === "All") return true;
        if (activeTab === "Careers") return opp.type === "job";
        if (activeTab === "Education") return opp.type === "scholarship" || opp.type === "training";
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
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${activeTab === tab
                                ? "bg-accent text-slate-900 shadow-lg shadow-teal-500/20"
                                : "bg-surface text-[var(--text-muted)] border border-[var(--card-border)] hover:border-[var(--card-border)]"
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Secondary Filter Pills (optional, kept as per user pref) */}
                {activeTab === 'All' && (
                    <div className="flex gap-2 overflow-x-auto pb-1 mt-2 no-scrollbar">
                        {filters.map((filter) => (
                            <button
                                key={filter.label}
                                onClick={() => setActiveFilter(filter.label)}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeFilter === filter.label
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
                    <div className="text-center py-12">
                        <p className="text-foreground0">No {activeTab.toLowerCase()} items found yet.</p>
                    </div>
                )}
            </div>

            <div className="text-center py-8">
                <p className="text-foreground0 text-sm">That's all for now.</p>
            </div>
        </div>
    );
}
