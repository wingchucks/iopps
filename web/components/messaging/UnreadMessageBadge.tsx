"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import {
  getConversationsQuery,
  getPeerConversationsQueries,
} from "@/lib/firestore/messaging";
import { cn } from "@/lib/utils";

interface UnreadMessageBadgeProps {
  userId: string;
  className?: string;
}

/**
 * Displays a real-time unread message count badge.
 * Listens via Firestore onSnapshot for employer and peer conversations.
 * Renders nothing when count is 0.
 */
export default function UnreadMessageBadge({
  userId,
  className,
}: UnreadMessageBadgeProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when no user
      setUnreadCount(0);
      return;
    }

    const unsubs: (() => void)[] = [];

    let employerUnread = 0;
    let peerUnread1 = 0;
    let peerUnread2 = 0;

    function updateTotal() {
      setUnreadCount(employerUnread + peerUnread1 + peerUnread2);
    }

    // Employer conversations (where user is the member)
    try {
      const employerQuery = getConversationsQuery(userId, "member");
      const employerUnsub = onSnapshot(
        employerQuery,
        (snapshot) => {
          employerUnread = snapshot.docs.reduce((sum, doc) => {
            const data = doc.data();
            return sum + (data.memberUnreadCount || 0);
          }, 0);
          updateTotal();
        },
        (error) => {
          console.error("UnreadMessageBadge: employer query error:", error);
        }
      );
      unsubs.push(employerUnsub);
    } catch {
      // Firebase may not be initialized
    }

    // Peer conversations
    try {
      const [peerQuery1, peerQuery2] = getPeerConversationsQueries(userId);

      const peerUnsub1 = onSnapshot(
        peerQuery1,
        (snapshot) => {
          peerUnread1 = snapshot.docs.reduce((sum, doc) => {
            const data = doc.data();
            return sum + (data.participant1UnreadCount || 0);
          }, 0);
          updateTotal();
        },
        (error) => {
          console.error("UnreadMessageBadge: peer query 1 error:", error);
        }
      );
      unsubs.push(peerUnsub1);

      const peerUnsub2 = onSnapshot(
        peerQuery2,
        (snapshot) => {
          peerUnread2 = snapshot.docs.reduce((sum, doc) => {
            const data = doc.data();
            return sum + (data.participant2UnreadCount || 0);
          }, 0);
          updateTotal();
        },
        (error) => {
          console.error("UnreadMessageBadge: peer query 2 error:", error);
        }
      );
      unsubs.push(peerUnsub2);
    } catch {
      // Firebase may not be initialized
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [userId]);

  if (unreadCount === 0) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold",
        unreadCount > 9 ? "min-w-[1.25rem] h-5 px-1" : "h-5 w-5",
        className
      )}
    >
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  );
}
