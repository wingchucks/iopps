"use client";

import { useState, useEffect } from "react";
import { SectionEditWrapper } from "@/components/shared/inline-edit";
import { upsertMemberProfile, getTopSkills } from "@/lib/firestore";
import { EndorseButton } from "@/components/social/EndorseButton";
import type { MemberProfile } from "@/lib/types";
import { Sparkles, Plus, X } from "lucide-react";
import toast from "react-hot-toast";

interface SkillsSectionProps {
  profile: MemberProfile;
  isOwner: boolean;
  userId: string;
  onProfileUpdate: (updates: Partial<MemberProfile>) => void;
}

export default function SkillsSection({
  profile,
  isOwner,
  userId,
  onProfileUpdate,
}: SkillsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [skillCounts, setSkillCounts] = useState<Map<string, number>>(new Map());
  const skills = profile.skills || [];

  useEffect(() => {
    if (userId) {
      getTopSkills(userId, 50).then(top => {
        const counts = new Map<string, number>();
        top.forEach(s => counts.set(s.skill, s.count));
        setSkillCounts(counts);
      }).catch(() => {});
    }
  }, [userId]);

  const handleAddSkill = async () => {
    const trimmed = skillInput.trim();
    if (!trimmed || skills.includes(trimmed)) {
      setSkillInput("");
      return;
    }

    const updated = [...skills, trimmed];
    try {
      await upsertMemberProfile(userId, { skills: updated });
      onProfileUpdate({ skills: updated });
      setSkillInput("");
      toast.success("Skill added!");
    } catch (error) {
      console.error("Error adding skill:", error);
      toast.error("Failed to add skill.");
    }
  };

  const handleRemoveSkill = async (skill: string) => {
    const updated = skills.filter((s) => s !== skill);
    try {
      await upsertMemberProfile(userId, { skills: updated });
      onProfileUpdate({ skills: updated });
      toast.success("Skill removed.");
    } catch (error) {
      console.error("Error removing skill:", error);
      toast.error("Failed to remove skill.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSkill();
    }
    if (e.key === "Escape") {
      setIsAdding(false);
      setSkillInput("");
    }
  };

  return (
    <SectionEditWrapper
      title="Skills"
      canEdit={isOwner}
      onEdit={() => setIsAdding(true)}
    >
      {skills.length === 0 && !isAdding ? (
        <div className="text-center py-6">
          <Sparkles className="h-10 w-10 mx-auto text-[var(--text-muted)] mb-2" />
          <p className="text-[var(--text-muted)] text-sm">
            {isOwner
              ? "Add skills to showcase your expertise."
              : "No skills listed."}
          </p>
          {isOwner && (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:underline"
            >
              <Plus className="h-4 w-4" />
              Add Skills
            </button>
          )}
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill}
                className="group inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-3 py-1 text-sm text-[var(--accent)]"
              >
                {skill}
                {skillCounts.get(skill) ? (
                  <span className="rounded-full bg-accent/20 px-1.5 text-[10px] font-semibold text-accent">
                    {skillCounts.get(skill)}
                  </span>
                ) : null}
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--accent)] hover:text-red-400"
                    aria-label={`Remove ${skill}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </span>
            ))}
          </div>

          {/* Add skill input */}
          {isOwner && isAdding && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="flex-1 rounded-lg border border-[var(--card-border)] bg-[var(--input-bg,var(--card-bg))] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                placeholder="Type a skill and press Enter"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setSkillInput("");
                }}
                className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--border-lt)]"
              >
                Done
              </button>
            </div>
          )}

          {isOwner && !isAdding && (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:underline"
            >
              <Plus className="h-4 w-4" />
              Add Skill
            </button>
          )}

          {!isOwner && skills.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
              <EndorseButton targetUserId={userId} targetSkills={skills} />
            </div>
          )}
        </div>
      )}
    </SectionEditWrapper>
  );
}
