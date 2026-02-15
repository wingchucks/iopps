"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Check, AlertCircle, User, FileText, Briefcase, GraduationCap, Wrench, MapPin, Users, MessageSquare } from "lucide-react";
import type { MemberProfile } from "@/lib/types";

interface ProfileCompletionCardProps {
  profile: MemberProfile | null;
  onNavigateToProfile?: () => void;
  compact?: boolean;
}

interface CompletionSection {
  id: string;
  label: string;
  icon: typeof User;
  isComplete: boolean;
  weight: number;
  tip: string;
  benefit: string;
}

// Profile strength levels
type StrengthLevel = "weak" | "medium" | "strong" | "all-star";

const STRENGTH_CONFIG: Record<StrengthLevel, { label: string; color: string; bgColor: string; minPercent: number }> = {
  weak: {
    label: "Weak",
    color: "text-red-400",
    bgColor: "bg-red-500",
    minPercent: 0,
  },
  medium: {
    label: "Medium",
    color: "text-amber-400",
    bgColor: "bg-amber-500",
    minPercent: 40,
  },
  strong: {
    label: "Strong",
    color: "text-accent",
    bgColor: "bg-accent",
    minPercent: 70,
  },
  "all-star": {
    label: "All-Star",
    color: "text-purple-400",
    bgColor: "bg-gradient-to-r from-purple-500 to-pink-500",
    minPercent: 100,
  },
};

function getStrengthLevel(percent: number): StrengthLevel {
  if (percent >= 100) return "all-star";
  if (percent >= 70) return "strong";
  if (percent >= 40) return "medium";
  return "weak";
}

export function ProfileCompletionCard({ profile, onNavigateToProfile, compact = false }: ProfileCompletionCardProps) {
  const [expanded, setExpanded] = useState(!compact);

  // Calculate completion by sections
  const sections = useMemo<CompletionSection[]>(() => {
    if (!profile) {
      return [];
    }

    return [
      {
        id: "name",
        label: "Display Name",
        icon: User,
        isComplete: Boolean(profile.displayName && profile.displayName.trim().length > 0),
        weight: 15,
        tip: "Add your full name so employers know who you are",
        benefit: "Required for applications",
      },
      {
        id: "photo",
        label: "Profile Photo",
        icon: User,
        isComplete: Boolean(profile.avatarUrl || profile.photoURL),
        weight: 10,
        tip: "Upload a professional photo",
        benefit: "Profiles with photos get 3x more views",
      },
      {
        id: "bio",
        label: "About Me",
        icon: FileText,
        isComplete: Boolean(profile.bio && profile.bio.trim().length > 20),
        weight: 10,
        tip: "Write a brief introduction about yourself",
        benefit: "Helps employers understand your background",
      },
      {
        id: "location",
        label: "Location",
        icon: MapPin,
        isComplete: Boolean(profile.location && profile.location.trim().length > 0),
        weight: 10,
        tip: "Add your city or region",
        benefit: "Get matched with local opportunities",
      },
      {
        id: "affiliation",
        label: "Indigenous Affiliation",
        icon: Users,
        isComplete: Boolean(profile.indigenousAffiliation && profile.indigenousAffiliation.trim().length > 0),
        weight: 5,
        tip: "Share your nation or community",
        benefit: "Connect with your community",
      },
      {
        id: "skills",
        label: "Skills",
        icon: Wrench,
        isComplete: Boolean(profile.skills && profile.skills.length >= 3),
        weight: 15,
        tip: "Add at least 3 skills",
        benefit: "Appear in employer skill searches",
      },
      {
        id: "experience",
        label: "Work Experience",
        icon: Briefcase,
        isComplete: Boolean(profile.experience && profile.experience.length > 0),
        weight: 15,
        tip: "Add your work history",
        benefit: "Show your professional background",
      },
      {
        id: "education",
        label: "Education",
        icon: GraduationCap,
        isComplete: Boolean(profile.education && profile.education.length > 0),
        weight: 10,
        tip: "Add your educational background",
        benefit: "Qualify for more opportunities",
      },
      {
        id: "resume",
        label: "Resume",
        icon: FileText,
        isComplete: Boolean(profile.resumeUrl),
        weight: 10,
        tip: "Upload your resume",
        benefit: "Apply to jobs faster",
      },
    ];
  }, [profile]);

  // Calculate total completion percentage
  const { completionPercent, completedWeight, totalWeight } = useMemo(() => {
    const totalWeight = sections.reduce((sum, s) => sum + s.weight, 0);
    const completedWeight = sections.filter((s) => s.isComplete).reduce((sum, s) => sum + s.weight, 0);
    const percent = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
    return { completionPercent: percent, completedWeight, totalWeight };
  }, [sections]);

  const strengthLevel = getStrengthLevel(completionPercent);
  const strengthConfig = STRENGTH_CONFIG[strengthLevel];

  // Group sections by completion status
  const incompleteSections = sections.filter((s) => !s.isComplete);
  const completedSections = sections.filter((s) => s.isComplete);

  // Get next recommendation
  const nextRecommendation = incompleteSections[0];

  if (!profile) {
    return null;
  }

  if (compact) {
    return (
      <div className="rounded-2xl border border-[var(--card-border)] bg-surface p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--text-secondary)]">Profile Strength</span>
            <span className={`text-xs font-bold ${strengthConfig.color}`}>{strengthConfig.label}</span>
          </div>
          <span className="text-sm font-bold text-white">{completionPercent}%</span>
        </div>

        <div className="h-2 w-full rounded-full bg-surface overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${strengthConfig.bgColor}`}
            style={{ width: `${completionPercent}%` }}
          />
        </div>

        {nextRecommendation && (
          <button
            onClick={onNavigateToProfile}
            className="mt-3 flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-accent transition-colors"
          >
            <AlertCircle className="h-3 w-3" />
            <span>Next: Add {nextRecommendation.label.toLowerCase()}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[var(--card-border)] bg-surface p-6 backdrop-blur">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">Profile Strength</h3>
          <p className="text-sm text-[var(--text-muted)]">
            {completionPercent === 100
              ? "Your profile is complete!"
              : `Complete your profile to stand out to employers`}
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-bold ${strengthConfig.color} bg-surface`}>
          {strengthConfig.label}
        </div>
      </div>

      {/* Progress Ring & Stats */}
      <div className="flex items-center gap-6 mb-6">
        {/* Progress Circle */}
        <div className="relative flex h-24 w-24 items-center justify-center flex-shrink-0">
          <svg className="h-24 w-24 -rotate-90 transform">
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-[var(--text-primary)]"
            />
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="url(#progressGradient)"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - completionPercent / 100)}`}
              className="transition-all duration-700"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#14b8a6" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-white">{completionPercent}%</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">Completed</span>
            <span className="text-accent font-medium">{completedSections.length} of {sections.length} sections</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">Weight</span>
            <span className="text-[var(--text-secondary)] font-medium">{completedWeight} / {totalWeight} points</span>
          </div>
          {completionPercent < 100 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">To {STRENGTH_CONFIG[completionPercent < 40 ? "medium" : completionPercent < 70 ? "strong" : "all-star"].label}</span>
              <span className="text-amber-400 font-medium">
                {completionPercent < 40 ? 40 - completionPercent : completionPercent < 70 ? 70 - completionPercent : 100 - completionPercent}% more
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Expandable Section List */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-3 border-t border-[var(--card-border)] text-sm font-medium text-[var(--text-secondary)] hover:text-white transition-colors"
      >
        <span>{expanded ? "Hide" : "Show"} Details</span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded && (
        <div className="space-y-2 pt-2">
          {/* Incomplete sections first with tips */}
          {incompleteSections.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.id}
                className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3"
              >
                <div className="rounded-lg bg-amber-500/20 p-2 flex-shrink-0">
                  <Icon className="h-4 w-4 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">{section.label}</p>
                    <span className="text-xs text-amber-400">+{section.weight}%</span>
                  </div>
                  <p className="text-xs text-foreground0 mt-0.5">{section.tip}</p>
                  <p className="text-xs text-accent mt-1">{section.benefit}</p>
                </div>
              </div>
            );
          })}

          {/* Completed sections */}
          {completedSections.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.id}
                className="flex items-center gap-3 rounded-xl border border-accent/20 bg-accent/5 p-3"
              >
                <div className="rounded-lg bg-accent/20 p-2 flex-shrink-0">
                  <Check className="h-4 w-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--text-secondary)]">{section.label}</p>
                </div>
                <span className="text-xs text-accent flex-shrink-0">Complete</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Button */}
      {completionPercent < 100 && onNavigateToProfile && (
        <button
          onClick={onNavigateToProfile}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/50"
        >
          Complete Your Profile
        </button>
      )}

      {completionPercent === 100 && (
        <div className="mt-4 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 p-4 text-center">
          <p className="text-purple-400 font-medium">Your profile is complete!</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">You&apos;re more likely to be discovered by employers</p>
        </div>
      )}
    </div>
  );
}
