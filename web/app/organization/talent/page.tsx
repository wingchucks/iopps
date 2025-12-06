"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { PageShell } from "@/components/PageShell";
import TalentCard from "@/components/organization/TalentCard";
import { searchMembers } from "@/lib/firestore";
import { MemberProfile } from "@/lib/types";

export default function TalentSearchPage() {
    const { user, role, loading: authLoading } = useAuth();
    const [members, setMembers] = useState<MemberProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Initial load
    useEffect(() => {
        if (user && role === "employer") {
            fetchTalent();
        }
    }, [user, role]);

    const fetchTalent = async () => {
        setLoading(true);
        try {
            // In a real app, we'd pass searchTerm to the backend index search
            // For now, we fetch a batch and filter client-side or assume firestore.ts handles basic filtering
            const results = await searchMembers({ availableOnly: true, limit: 20 });
            setMembers(results);
        } catch (err) {
            console.error("Failed to load talent", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredMembers = members.filter((m) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        const skills = m.skills?.join(" ").toLowerCase() || "";
        const name = m.displayName?.toLowerCase() || "";
        return name.includes(term) || skills.includes(term);
    });

    if (authLoading) return null;

    if (role !== "employer") {
        return (
            <PageShell>
                <div className="mx-auto max-w-4xl px-4 py-12 text-center text-slate-300">
                    <p>Access restricted to vetted Employers.</p>
                </div>
            </PageShell>
        );
    }

    return (
        <div className="min-h-screen bg-[#020306]">
            {/* Header */}
            <div className="border-b border-slate-800 bg-[#08090C] py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-bold text-slate-50">
                        Indigenous Talent Search
                    </h1>
                    <p className="mt-2 text-slate-400">
                        Proactively find and invite qualified professionals to your opportunities.
                    </p>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Search Bar */}
                <div className="mb-8 flex gap-4">
                    <input
                        type="text"
                        placeholder="Search by keywords, skills, or job title..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none"
                    />
                    <button
                        onClick={fetchTalent}
                        className="rounded-xl bg-slate-800 px-6 font-semibold text-slate-300 hover:bg-slate-700"
                    >
                        Refresh
                    </button>
                </div>

                {/* Results Grid */}
                {loading ? (
                    <div className="text-center text-slate-500 py-12">Searching database...</div>
                ) : members.length === 0 ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center">
                        <p className="text-slate-400">No candidates found matching your criteria.</p>
                        <p className="text-sm text-slate-500 mt-2">Try adjusting your filters or search terms.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredMembers.map((member) => (
                            <TalentCard
                                key={member.id}
                                member={member}
                                onInvite={(id) => console.log('Invite', id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
