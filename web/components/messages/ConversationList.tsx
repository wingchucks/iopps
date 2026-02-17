"use client";

import { useEffect, useState } from "react";
import { getConversations } from "@/lib/firestore/messages";
import { getUserProfile } from "@/lib/firestore/users";
import type { Conversation } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

interface ConversationWithMeta extends Conversation {
  otherName: string;
  otherPhoto: string | null;
}

export default function ConversationList({ selectedId, onSelect }: Props) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const convos = await getConversations(user.uid);
      const withMeta = await Promise.all(
        convos.map(async (c) => {
          const otherId = c.participants.find((p) => p !== user.uid) ?? c.participants[0];
          const profile = await getUserProfile(otherId);
          return {
            ...c,
            otherName: profile?.displayName ?? "Unknown",
            otherPhoto: profile?.photoURL ?? null,
          };
        })
      );
      setConversations(withMeta);
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="w-80 border-r border-gray-200 p-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border-r border-gray-200 overflow-y-auto">
      {conversations.length === 0 ? (
        <p className="p-4 text-sm text-gray-500">No conversations yet</p>
      ) : (
        conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`w-full text-left p-4 hover:bg-gray-50 border-b border-gray-100 transition-colors ${
              selectedId === c.id ? "bg-blue-50" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                {c.otherPhoto ? (
                  <img src={c.otherPhoto} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm font-medium">
                    {c.otherName.charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{c.otherName}</p>
                <p className="text-xs text-gray-500 truncate">{c.lastMessage || "No messages"}</p>
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  );
}
