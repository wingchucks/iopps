"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { getMemberProfile } from "@/lib/firestore/members";
import {
  followUser,
  unfollowUser,
  isFollowing as checkIsFollowing,
} from "@/lib/firestore/connections";

interface FollowButtonProps {
  targetUserId: string;
  targetUserName?: string;
  small?: boolean;
  onCountChange?: (delta: number) => void;
}

export default function FollowButton({
  targetUserId,
  targetUserName,
  small,
  onCountChange,
}: FollowButtonProps) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    checkIsFollowing(user.uid, targetUserId)
      .then(setFollowing)
      .finally(() => setLoading(false));
  }, [user, targetUserId]);

  if (!user || user.uid === targetUserId) return null;

  const handleClick = async () => {
    if (loading) return;
    const wasFollowing = following;
    // Optimistic update
    setFollowing(!wasFollowing);
    onCountChange?.(wasFollowing ? -1 : 1);

    try {
      if (wasFollowing) {
        await unfollowUser(user.uid, targetUserId);
      } else {
        const myProfile = await getMemberProfile(user.uid);
        await followUser(
          user.uid,
          targetUserId,
          myProfile?.displayName,
          targetUserName
        );
      }
    } catch (err) {
      console.error("Follow action failed:", err);
      // Revert optimistic update
      setFollowing(wasFollowing);
      onCountChange?.(wasFollowing ? 1 : -1);
    }
  };

  if (loading) {
    return (
      <button
        disabled
        className="brand-button font-semibold cursor-default opacity-50"
        style={{
          padding: small ? "8px 16px" : "12px 24px",
          borderRadius: 12,
          border: "1.5px solid var(--border)",
          background: "var(--button-gradient-soft)",
          color: "var(--button-gradient-soft-text)",
          fontSize: small ? 13 : 15,
        }}
      >
        ...
      </button>
    );
  }

  if (following) {
    const isUnfollow = hovering;
    return (
      <button
        onClick={handleClick}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        className="font-semibold cursor-pointer transition-all duration-150"
        style={{
          padding: small ? "8px 16px" : "12px 24px",
          borderRadius: 12,
          border: isUnfollow
            ? "1.5px solid var(--red)"
            : "1.5px solid var(--teal)",
          background: isUnfollow ? "rgba(220,38,38,.08)" : "var(--button-gradient-soft)",
          color: isUnfollow ? "var(--red)" : "var(--button-gradient-soft-text)",
          fontSize: small ? 13 : 15,
        }}
      >
        {isUnfollow ? "Unfollow" : "Following"}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="brand-button font-semibold cursor-pointer transition-all duration-150 hover:opacity-90"
      style={{
        padding: small ? "8px 16px" : "12px 24px",
        borderRadius: 12,
        border: "none",
        background: "var(--button-gradient)",
        color: "#fff",
        fontSize: small ? 13 : 15,
      }}
    >
      Follow
    </button>
  );
}
