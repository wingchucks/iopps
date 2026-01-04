"use client";

import { useEffect, useState } from "react";
import { Opportunity, JobPosting, Scholarship, PowwowEvent } from "@/lib/types";
import { OpportunityCard } from "./OpportunityCard";
import { Loader2 } from "lucide-react";

export function RadarFeed() {
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchRadar() {
            // Mocking fetch logic for MVP until firestore/radar export exists
            // In real implementation, these would be Promise.all from fetchers

            // Placeholder data generation
            const mockOpportunities: Opportunity[] = [
                {
                    id: "1",
                    type: "job",
                    title: "Senior React Native Developer",
                    organizationName: "Tech North Solutions",
                    organizationId: "org1",
                    location: "Remote / Winnipeg, MB",
                    postedAt: new Date(Date.now() - 3600000), // 1 hour ago
                    tags: ["Tech", "Remote", "Senior"],
                    matchScore: 95,
                    trcAligned: true,
                    originalObject: {} as JobPosting,
                },
                {
                    id: "2",
                    type: "event",
                    title: "Summer Solstice Pow Wow",
                    organizationName: "Rolling River First Nation",
                    organizationId: "org2",
                    location: "Rolling River, MB",
                    postedAt: new Date(Date.now() - 86400000), // 1 day ago
                    tags: ["Cultural", "Live Music", "Family"],
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
            <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-2">Daily Drop 💧</h2>
                <p className="text-slate-400 text-sm">Fresh opportunities selected for you.</p>
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
