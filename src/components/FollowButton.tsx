"use client";

import { useState, useEffect, useRef } from "react";
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
  if (!user || user.uid === targetUserId) return null;
  return (
    <FollowButtonForUser
      key={`${user.uid}:${targetUserId}`}
      userId={user.uid}
      targetUserId={targetUserId}
      targetUserName={targetUserName}
      small={small}
      onCountChange={onCountChange}
    />
  );
}

function FollowButtonForUser({ userId, targetUserId, targetUserName, small, onCountChange }:
  FollowButtonProps & { userId: string }) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hovering, setHovering] = useState(false);
  const [lookupError, setLookupError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const mounted = useRef(false);
  const busy = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    checkIsFollowing(userId, targetUserId)
      .then(value => { if (!cancelled) setFollowing(value); })
      .catch(() => { if (!cancelled) setLookupError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, targetUserId, attempt]);

  const handleClick = async () => {
    if (loading || busy.current) return;
    if (lookupError) {
      setLookupError(false);
      setLoading(true);
      setAttempt(value => value + 1);
      return;
    }
    busy.current = true;
    setLoading(true);
    const wasFollowing = following;
    // Optimistic update
    setFollowing(!wasFollowing);
    onCountChange?.(wasFollowing ? -1 : 1);

    try {
      if (wasFollowing) {
        await unfollowUser(userId, targetUserId);
      } else {
        const myProfile = await getMemberProfile(userId);
        if (!mounted.current) return;
        await followUser(
          userId,
          targetUserId,
          myProfile?.displayName,
          targetUserName
        );
      }
    } catch (err) {
      console.error("Follow action failed:", err);
      // Revert optimistic update
      if (mounted.current) {
        setFollowing(wasFollowing);
        onCountChange?.(wasFollowing ? 1 : -1);
      }
    } finally {
      busy.current = false;
      if (mounted.current) setLoading(false);
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
      {lookupError ? "Retry follow status" : "Follow"}
    </button>
  );
}
