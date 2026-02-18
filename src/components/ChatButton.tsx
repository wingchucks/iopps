"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { onUnreadCount } from "@/lib/firestore/messages";

export default function ChatButton() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    const unsub = onUnreadCount(user.uid, setUnread);
    return unsub;
  }, [user]);

  return (
    <Link href="/messages" className="no-underline">
      <button
        className="relative w-10 h-10 rounded-[10px] border-none cursor-pointer text-lg text-white"
        style={{ background: "rgba(255,255,255,.08)" }}
        aria-label={`Messages${unread > 0 ? ` (${unread} unread)` : ""}`}
      >
        &#128172;
        {unread > 0 && (
          <span
            className="absolute top-0.5 right-0.5 min-w-4 h-4 rounded-full bg-teal text-white flex items-center justify-center"
            style={{ fontSize: 9, fontWeight: 700 }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </Link>
  );
}
