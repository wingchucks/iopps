"use client";

import Link from "next/link";
import { MemberProfile } from "@/lib/types";

interface TalentCardProps {
    member: MemberProfile;
    onInvite?: (memberId: string) => void;
}

export default function TalentCard({ member, onInvite }: TalentCardProps) {
    // Obfuscate name if needed, or show full name if public
    // For now, let's assume if they are in this list, they agreed to be seen.
    const displayName = member.displayName || "Indigenous Professional";
    const initials = displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);

    return (
        <div className="group relative overflow-hidden rounded-xl border border-[var(--card-border)] bg-surface p-6 transition-all hover:border-[#14B8A6]/50 hover:bg-slate-900/80">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-lg font-bold text-[#14B8A6]">
                        {initials}
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">{displayName}</h3>
                        <p className="text-sm text-[var(--text-muted)]">
                            {member.location || "Location not specified"}
                        </p>
                    </div>
                </div>
                {member.availableForInterviews && (
                    <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                        Available
                    </span>
                )}
            </div>

            <div className="mt-4">
                <h4 className="text-xs font-medium uppercase tracking-wider text-foreground0">
                    Skills
                </h4>
                <div className="mt-2 flex flex-wrap gap-2">
                    {member.skills && member.skills.length > 0 ? (
                        member.skills.slice(0, 5).map((skill) => (
                            <span
                                key={skill}
                                className="rounded-md border border-[var(--card-border)] bg-surface px-2 py-1 text-xs text-[var(--text-secondary)]"
                            >
                                {skill}
                            </span>
                        ))
                    ) : (
                        <span className="text-xs text-foreground0 italic">
                            No skills listed
                        </span>
                    )}
                </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-[var(--card-border)] pt-4">
                <div className="flex gap-2">
                    {member.resumeUrl && (
                        <a
                            href={member.resumeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium text-[var(--text-muted)] hover:text-[#14B8A6]"
                        >
                            View Resume
                        </a>
                    )}
                </div>

                <button
                    onClick={() => onInvite && onInvite(member.id)}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-[#16cdb8]"
                >
                    Contact / Invite
                </button>
            </div>
        </div>
    );
}
