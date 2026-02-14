"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { addReaction, removeReaction } from "@/lib/firestore/social";
import type { ReactionType, ReactionsCount } from "@/lib/types";
import { MessageCircle, Share2 } from "lucide-react";
import toast from "react-hot-toast";

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: "love", emoji: "\u2764\uFE0F", label: "Love" },
  { type: "honor", emoji: "\uD83E\uDEB6", label: "Honor" },
  { type: "fire", emoji: "\uD83D\uDD25", label: "Fire" },
];

interface ReactionBarProps {
  postId: string;
  reactionsCount: ReactionsCount;
  commentsCount: number;
  sharesCount: number;
  userReaction: ReactionType | null;
  onCommentClick?: () => void;
  onShareClick?: () => void;
}

export default function ReactionBar({
  postId,
  reactionsCount,
  commentsCount,
  sharesCount,
  userReaction: initialReaction,
  onCommentClick,
  onShareClick,
}: ReactionBarProps) {
  const { user } = useAuth();
  const [currentReaction, setCurrentReaction] = useState<ReactionType | null>(initialReaction);
  const [counts, setCounts] = useState<ReactionsCount>(reactionsCount);
  const [saving, setSaving] = useState(false);

  const handleReaction = async (type: ReactionType) => {
    if (!user || saving) return;

    const prevReaction = currentReaction;
    const prevCounts = { ...counts };

    try {
      setSaving(true);

      if (currentReaction === type) {
        // Remove reaction
        setCurrentReaction(null);
        setCounts((prev) => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }));
        await removeReaction(postId, user.uid);
      } else {
        // Add/replace reaction
        setCurrentReaction(type);
        setCounts((prev) => {
          const updated = { ...prev, [type]: prev[type] + 1 };
          if (currentReaction) {
            updated[currentReaction] = Math.max(0, updated[currentReaction] - 1);
          }
          return updated;
        });
        await addReaction(postId, user.uid, type);
      }
    } catch (error) {
      // Revert on failure
      setCurrentReaction(prevReaction);
      setCounts(prevCounts);
      console.error("Error updating reaction:", error);
      toast.error("Failed to update reaction");
    } finally {
      setSaving(false);
    }
  };

  const totalReactions = counts.love + counts.honor + counts.fire;

  return (
    <div className="flex items-center justify-between border-t border-[var(--card-border)] pt-3">
      <div className="flex items-center gap-1">
        {REACTIONS.map(({ type, emoji, label }) => (
          <button
            key={type}
            onClick={() => handleReaction(type)}
            disabled={saving || !user}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ${
              currentReaction === type
                ? "bg-accent/20 text-emerald-300"
                : "text-[var(--text-muted)] hover:bg-surface"
            }`}
            title={label}
          >
            <span className="text-base">{emoji}</span>
            {counts[type] > 0 && (
              <span className="text-xs font-medium">{counts[type]}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onCommentClick}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-[var(--text-muted)] hover:bg-surface transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          {commentsCount > 0 && (
            <span className="text-xs font-medium">{commentsCount}</span>
          )}
        </button>

        <button
          onClick={onShareClick}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-[var(--text-muted)] hover:bg-surface transition-colors"
        >
          <Share2 className="h-4 w-4" />
          {sharesCount > 0 && (
            <span className="text-xs font-medium">{sharesCount}</span>
          )}
        </button>
      </div>
    </div>
  );
}
