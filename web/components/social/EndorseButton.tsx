"use client";

import { useState } from "react";
import { Award, X, Shield, ChevronDown } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { giveEndorsement } from "@/lib/firestore/endorsements";
import type { EndorsementRelationship } from "@/lib/types";
import toast from "react-hot-toast";

interface EndorseButtonProps {
  targetUserId: string;
  targetSkills?: string[];
  className?: string;
}

const RELATIONSHIPS: { value: EndorsementRelationship; label: string }[] = [
  { value: "colleague", label: "Colleague" },
  { value: "mentor", label: "Mentor" },
  { value: "mentee", label: "Mentee" },
  { value: "supervisor", label: "Supervisor" },
  { value: "community_member", label: "Community Member" },
  { value: "elder", label: "Elder" },
  { value: "other", label: "Other" },
];

export function EndorseButton({ targetUserId, targetSkills = [], className }: EndorseButtonProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [skill, setSkill] = useState("");
  const [customSkill, setCustomSkill] = useState("");
  const [relationship, setRelationship] = useState<EndorsementRelationship | "">("");
  const [isElder, setIsElder] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!user || user.uid === targetUserId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalSkill = skill === "__custom__" ? customSkill.trim() : skill;
    if (!finalSkill || !relationship) return;

    setSubmitting(true);
    try {
      await giveEndorsement({
        endorserId: user.uid,
        endorseeId: targetUserId,
        skill: finalSkill,
        relationship,
        isElder,
        message: message.trim() || undefined,
        endorserName: user.displayName || "Member",
        endorserPhotoURL: user.photoURL || undefined,
      });

      toast.success("Endorsement submitted!");
      setIsOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit endorsement");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSkill("");
    setCustomSkill("");
    setRelationship("");
    setIsElder(false);
    setMessage("");
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent transition-colors ${className || ""}`}
      >
        <Award className="h-4 w-4" />
        Endorse
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--card-border)] bg-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <Award className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Endorse Skills</h2>
                  <p className="text-sm text-[var(--text-muted)]">Recognize their abilities</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-surface hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Skill Selection */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Skill *
                </label>
                {targetSkills.length > 0 ? (
                  <div className="relative">
                    <select
                      value={skill}
                      onChange={(e) => setSkill(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 pr-10 text-sm text-foreground focus:border-accent focus:outline-none"
                    >
                      <option value="">Select a skill...</option>
                      {targetSkills.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                      <option value="__custom__">Other (custom)</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={customSkill}
                    onChange={(e) => {
                      setCustomSkill(e.target.value);
                      setSkill("__custom__");
                    }}
                    placeholder="e.g., Leadership, Beadwork, Grant Writing"
                    className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground placeholder-slate-500 focus:border-accent focus:outline-none"
                  />
                )}
                {skill === "__custom__" && targetSkills.length > 0 && (
                  <input
                    type="text"
                    value={customSkill}
                    onChange={(e) => setCustomSkill(e.target.value)}
                    placeholder="Enter custom skill..."
                    className="mt-2 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground placeholder-slate-500 focus:border-accent focus:outline-none"
                  />
                )}
              </div>

              {/* Relationship */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Your Relationship *
                </label>
                <div className="relative">
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value as EndorsementRelationship)}
                    className="w-full appearance-none rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 pr-10 text-sm text-foreground focus:border-accent focus:outline-none"
                  >
                    <option value="">Select relationship...</option>
                    {RELATIONSHIPS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                </div>
              </div>

              {/* Elder Toggle */}
              <div className="flex items-center justify-between rounded-lg border border-[var(--card-border)] bg-surface p-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-amber-400" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Elder Endorsement</p>
                    <p className="text-xs text-foreground0">Designate as an Elder-level endorsement</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isElder}
                  onClick={() => setIsElder(!isElder)}
                  className={`relative h-7 w-12 rounded-full transition-colors ${
                    isElder ? "bg-accent" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-[var(--card-bg)] transition-transform ${
                      isElder ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Message (optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  placeholder="Share why you're endorsing this skill..."
                  className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-foreground placeholder-slate-500 focus:border-accent focus:outline-none resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    resetForm();
                  }}
                  className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !relationship ||
                    (skill === "__custom__" ? !customSkill.trim() : !skill)
                  }
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Endorsing..." : "Submit Endorsement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
