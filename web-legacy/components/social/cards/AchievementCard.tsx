"use client";

import { Trophy, Briefcase, GraduationCap, Award, Rocket, Sparkles } from "lucide-react";
import type { Post, AchievementType } from "@/lib/types";

interface AchievementCardProps {
  post: Post;
}

const ACHIEVEMENT_CONFIG: Record<
  AchievementType,
  { emoji: string; label: string; icon: React.ElementType; gradient: string; borderColor: string }
> = {
  new_job: {
    emoji: "\uD83C\uDF89",
    label: "Got a New Job",
    icon: Briefcase,
    gradient: "from-teal-500/10 to-emerald-500/10",
    borderColor: "border-teal-500/30",
  },
  completed_training: {
    emoji: "\uD83C\uDF93",
    label: "Completed Training",
    icon: GraduationCap,
    gradient: "from-blue-500/10 to-indigo-500/10",
    borderColor: "border-blue-500/30",
  },
  earned_certification: {
    emoji: "\uD83C\uDFC5",
    label: "Earned a Certification",
    icon: Award,
    gradient: "from-amber-500/10 to-yellow-500/10",
    borderColor: "border-amber-500/30",
  },
  promotion: {
    emoji: "\uD83D\uDE80",
    label: "Got a Promotion",
    icon: Rocket,
    gradient: "from-purple-500/10 to-pink-500/10",
    borderColor: "border-purple-500/30",
  },
  graduation: {
    emoji: "\uD83C\uDF93",
    label: "Graduated",
    icon: GraduationCap,
    gradient: "from-indigo-500/10 to-blue-500/10",
    borderColor: "border-indigo-500/30",
  },
  custom: {
    emoji: "\u2728",
    label: "Achievement",
    icon: Sparkles,
    gradient: "from-accent/10 to-emerald-500/10",
    borderColor: "border-accent/30",
  },
};

/**
 * Celebration card for when someone shares an achievement.
 * Features decorative styling with achievement-type-specific colors and icons.
 */
export function AchievementCard({ post }: AchievementCardProps) {
  const achType = post.achievementType || "custom";
  const config = ACHIEVEMENT_CONFIG[achType] || ACHIEVEMENT_CONFIG.custom;
  const IconComp = config.icon;

  return (
    <div className="space-y-3">
      {/* Celebration banner */}
      <div
        className={`relative rounded-lg border ${config.borderColor} bg-gradient-to-br ${config.gradient} overflow-hidden p-4`}
      >
        {/* Decorative elements */}
        <div className="absolute top-2 right-3 text-2xl opacity-20 select-none">
          {config.emoji}
        </div>
        <div className="absolute bottom-1 left-4 text-lg opacity-10 select-none rotate-12">
          {config.emoji}
        </div>

        <div className="relative z-10">
          {/* Achievement type badge */}
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-full bg-surface/80 flex items-center justify-center">
              <IconComp className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="h-3 w-3" />
                {config.label}
              </p>
            </div>
          </div>

          {/* User's message */}
          {post.content && (
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {post.content}
            </p>
          )}
        </div>
      </div>

      {/* Media (if attached) */}
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <div className="rounded-lg overflow-hidden">
          <img
            src={post.mediaUrls[0]}
            alt="Achievement"
            className="w-full h-auto object-cover max-h-96"
          />
        </div>
      )}
    </div>
  );
}
