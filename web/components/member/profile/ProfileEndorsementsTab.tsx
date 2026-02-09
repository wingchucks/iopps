"use client";

import { useState, useEffect } from "react";
import { Award, User, Shield } from "lucide-react";
import { getEndorsementsForUser } from "@/lib/firestore/endorsements";
import { EndorseButton } from "@/components/social/EndorseButton";
import type { Endorsement } from "@/lib/types";
import type { MemberProfile } from "@/lib/types";

const RELATIONSHIP_LABELS: Record<string, string> = {
  colleague: "Colleague",
  mentor: "Mentor",
  mentee: "Mentee",
  supervisor: "Supervisor",
  community_member: "Community Member",
  elder: "Elder",
  other: "Other",
};

const RELATIONSHIP_COLORS: Record<string, string> = {
  elder: "bg-amber-500/15 text-amber-500 border-amber-500/20",
  colleague: "bg-accent/15 text-accent border-accent/20",
  supervisor: "bg-blue-500/15 text-blue-500 border-blue-500/20",
  community_member: "bg-purple-500/15 text-purple-500 border-purple-500/20",
  mentor: "bg-green-500/15 text-green-500 border-green-500/20",
  mentee: "bg-cyan-500/15 text-cyan-500 border-cyan-500/20",
  other: "bg-[var(--border-lt)] text-[var(--text-muted)] border-[var(--card-border)]",
};

interface ProfileEndorsementsTabProps {
  userId: string;
  profile: MemberProfile;
  isOwner: boolean;
}

export default function ProfileEndorsementsTab({ userId, profile, isOwner }: ProfileEndorsementsTabProps) {
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEndorsementsForUser(userId)
      .then(setEndorsements)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  // Group by skill
  const groupedBySkill = endorsements.reduce<Record<string, Endorsement[]>>((acc, e) => {
    if (!acc[e.skill]) acc[e.skill] = [];
    acc[e.skill].push(e);
    return acc;
  }, {});

  const sortedSkills = Object.entries(groupedBySkill).sort((a, b) => b[1].length - a[1].length);

  // Count by relationship
  const relationshipCounts = endorsements.reduce<Record<string, number>>((acc, e) => {
    acc[e.relationship] = (acc[e.relationship] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="text-center py-12 text-[var(--text-muted)] text-sm">
        Loading endorsements...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Award className="h-5 w-5 text-accent" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Community Endorsements</h3>
          <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
            {endorsements.length}
          </span>
        </div>
        {!isOwner && (
          <EndorseButton targetUserId={userId} targetSkills={profile.skills || []} />
        )}
      </div>

      {/* Relationship breakdown pills */}
      {endorsements.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(relationshipCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([rel, count]) => (
              <span
                key={rel}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${RELATIONSHIP_COLORS[rel] || RELATIONSHIP_COLORS.other}`}
              >
                {rel === "elder" && <Shield className="h-3 w-3" />}
                {RELATIONSHIP_LABELS[rel] || rel}: {count}
              </span>
            ))}
        </div>
      )}

      {/* Endorsement cards grouped by skill */}
      {sortedSkills.length === 0 ? (
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--border-lt)] p-8 text-center">
          <Award className="mx-auto h-10 w-10 text-[var(--text-muted)] mb-3" />
          <p className="text-[var(--text-muted)] text-sm">No endorsements yet.</p>
          <p className="text-[var(--text-muted)] text-xs mt-1">
            Endorsements from community connections will appear here.
          </p>
          {!isOwner && (
            <div className="mt-4">
              <EndorseButton targetUserId={userId} targetSkills={profile.skills || []} />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedSkills.map(([skill, skillEndorsements]) => (
            <div
              key={skill}
              className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-accent" />
                  <h4 className="font-semibold text-[var(--text-primary)]">{skill}</h4>
                </div>
                <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded-full">
                  {skillEndorsements.length} endorsement{skillEndorsements.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-3">
                {skillEndorsements.map((e) => (
                  <div key={e.id} className="flex items-start gap-3 rounded-xl bg-[var(--border-lt)] p-3">
                    {e.endorserPhotoURL ? (
                      <img
                        src={e.endorserPhotoURL}
                        alt={e.endorserName}
                        className="h-9 w-9 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 flex-shrink-0">
                        <User className="h-4 w-4 text-accent" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {e.endorserName}
                        </span>
                        {e.endorserNation && (
                          <span className="text-xs text-[var(--text-muted)]">
                            {e.endorserNation}
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${RELATIONSHIP_COLORS[e.relationship] || RELATIONSHIP_COLORS.other}`}>
                          {e.isElder && <Shield className="h-2.5 w-2.5" />}
                          {RELATIONSHIP_LABELS[e.relationship] || e.relationship}
                        </span>
                      </div>
                      {e.message && (
                        <blockquote className="mt-1.5 text-xs italic text-[var(--text-muted)] border-l-2 border-accent/30 pl-2">
                          &ldquo;{e.message}&rdquo;
                        </blockquote>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
