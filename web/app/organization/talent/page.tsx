"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { PageShell } from "@/components/PageShell";
import TalentCard from "@/components/organization/TalentCard";
import TalentPoolPaywall from "@/components/organization/TalentPoolPaywall";
import {
    searchMembers,
    getEmployerProfile,
    getOrCreateConversation,
    sendMessage,
} from "@/lib/firestore";
import { MemberProfile, EmployerProfile } from "@/lib/types";

function TalentSearchPageContent() {
    const { user, role, loading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [members, setMembers] = useState<MemberProfile[]>([]);
    const [employerProfile, setEmployerProfile] = useState<EmployerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);

    // Modal state
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null);
    const [inviteMessage, setInviteMessage] = useState("");
    const [sending, setSending] = useState(false);

    // Check for success/canceled query params
    useEffect(() => {
        if (searchParams.get("success") === "true") {
            setShowSuccessMessage(true);
            // Clear the URL params
            router.replace("/organization/talent");
            // Hide message after 5 seconds
            setTimeout(() => setShowSuccessMessage(false), 5000);
        }
    }, [searchParams, router]);

    // Initial load
    useEffect(() => {
        if (user && role === "employer") {
            fetchEmployerProfile();
        }
    }, [user, role]);

    // Fetch talent only when we have access
    useEffect(() => {
        if (hasTalentAccess && user) {
            fetchTalent();
        }
    }, [employerProfile]);

    // Check if employer has talent pool access
    const hasTalentAccess = employerProfile?.talentPoolAccess?.active &&
        employerProfile?.talentPoolAccess?.expiresAt &&
        (employerProfile.talentPoolAccess.expiresAt instanceof Date
            ? employerProfile.talentPoolAccess.expiresAt > new Date()
            : (employerProfile.talentPoolAccess.expiresAt as { toDate: () => Date }).toDate() > new Date());

    const fetchEmployerProfile = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const profile = await getEmployerProfile(user.uid);
            setEmployerProfile(profile);
        } catch (err) {
            console.error("Failed to load employer profile", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchTalent = async () => {
        try {
            const results = await searchMembers({ availableOnly: true, limit: 20 });
            setMembers(results);
        } catch (err) {
            console.error("Failed to load talent", err);
        }
    };

    const filteredMembers = members.filter((m) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        const skills = m.skills?.join(" ").toLowerCase() || "";
        const name = m.displayName?.toLowerCase() || "";
        return name.includes(term) || skills.includes(term);
    });

    const handleInviteClick = (memberId: string) => {
        const member = members.find((m) => m.id === memberId);
        if (member) {
            setSelectedMember(member);
            setInviteMessage(
                `Hi ${member.displayName || "there"},\n\nI came across your profile on IOPPS and was impressed by your background. I'd love to connect and discuss potential opportunities with ${employerProfile?.organizationName || "our organization"}.\n\nWould you be interested in having a conversation?\n\nBest regards`
            );
            setShowInviteModal(true);
        }
    };

    const handleSendInvite = async () => {
        if (!user || !selectedMember || !inviteMessage.trim()) return;

        setSending(true);
        try {
            // Create or get existing conversation
            const conversation = await getOrCreateConversation({
                employerId: user.uid,
                memberId: selectedMember.id,
                employerName: employerProfile?.organizationName,
                memberName: selectedMember.displayName,
            });

            // Send the message
            await sendMessage({
                conversationId: conversation.id,
                senderId: user.uid,
                senderType: "employer",
                content: inviteMessage.trim(),
            });

            // Close modal and redirect to messages
            setShowInviteModal(false);
            setSelectedMember(null);
            setInviteMessage("");

            // Redirect to the conversation
            router.push(`/organization/messages?id=${conversation.id}`);
        } catch (err) {
            console.error("Failed to send invite:", err);
            alert("Failed to send message. Please try again.");
        } finally {
            setSending(false);
        }
    };

    const closeModal = () => {
        setShowInviteModal(false);
        setSelectedMember(null);
        setInviteMessage("");
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-[#020306] flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
            </div>
        );
    }

    if (role !== "employer") {
        return (
            <PageShell>
                <div className="mx-auto max-w-4xl px-4 py-12 text-center text-slate-300">
                    <p>Access restricted to vetted Employers.</p>
                </div>
            </PageShell>
        );
    }

    // Show paywall if no talent pool access
    if (!hasTalentAccess && user) {
        return (
            <div className="min-h-screen bg-[#020306]">
                <TalentPoolPaywall employerId={user.uid} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020306]">
            {/* Success Message */}
            {showSuccessMessage && (
                <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 transform">
                    <div className="rounded-lg bg-emerald-500 px-6 py-3 text-white shadow-lg">
                        <span className="font-semibold">Success!</span> You now have access to the Indigenous Talent Pool.
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="border-b border-slate-800 bg-[#08090C] py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-50">
                                Indigenous Talent Search
                            </h1>
                            <p className="mt-2 text-slate-400">
                                Proactively find and invite qualified professionals to your opportunities.
                            </p>
                        </div>
                        {employerProfile?.talentPoolAccess?.expiresAt && (
                            <div className="text-right text-sm text-slate-400">
                                <span className="text-teal-400">Active Access</span>
                                <p>
                                    Expires: {
                                        (employerProfile.talentPoolAccess.expiresAt instanceof Date
                                            ? employerProfile.talentPoolAccess.expiresAt
                                            : (employerProfile.talentPoolAccess.expiresAt as { toDate: () => Date }).toDate()
                                        ).toLocaleDateString()
                                    }
                                </p>
                            </div>
                        )}
                    </div>
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
                                onInvite={handleInviteClick}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Invite Modal */}
            {showInviteModal && selectedMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
                    <div className="w-full max-w-2xl rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 p-8 shadow-2xl">
                        <div className="mb-6 flex items-start justify-between">
                            <div>
                                <h3 className="text-2xl font-bold text-white">
                                    Contact {selectedMember.displayName || "Candidate"}
                                </h3>
                                <p className="mt-1 text-sm text-slate-400">
                                    Send a personalized message to introduce yourself
                                </p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Candidate Preview */}
                        <div className="mb-6 rounded-xl border border-slate-700 bg-slate-900/50 p-4">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-lg font-bold text-[#14B8A6]">
                                    {(selectedMember.displayName || "?")
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")
                                        .toUpperCase()
                                        .substring(0, 2)}
                                </div>
                                <div>
                                    <p className="font-semibold text-white">{selectedMember.displayName}</p>
                                    <p className="text-sm text-slate-400">{selectedMember.location || "Location not specified"}</p>
                                </div>
                                {selectedMember.availableForInterviews && (
                                    <span className="ml-auto rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                                        Available
                                    </span>
                                )}
                            </div>
                            {selectedMember.skills && selectedMember.skills.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {selectedMember.skills.slice(0, 5).map((skill) => (
                                        <span
                                            key={skill}
                                            className="rounded-md border border-slate-700 bg-slate-800/50 px-2 py-1 text-xs text-slate-300"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Message Input */}
                        <div className="mb-6">
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                                Your Message
                            </label>
                            <textarea
                                value={inviteMessage}
                                onChange={(e) => setInviteMessage(e.target.value)}
                                rows={8}
                                placeholder="Write a personalized message..."
                                className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleSendInvite}
                                disabled={!inviteMessage.trim() || sending}
                                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/50 disabled:opacity-50"
                            >
                                {sending ? "Sending..." : "Send Message"}
                            </button>
                            <button
                                onClick={closeModal}
                                className="rounded-xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-300 transition-all hover:border-slate-600 hover:text-white"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function TalentSearchPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#020306] flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
            </div>
        }>
            <TalentSearchPageContent />
        </Suspense>
    );
}
