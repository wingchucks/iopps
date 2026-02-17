"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import ConversationList from "@/components/messages/ConversationList";
import ConversationThread from "@/components/messages/ConversationThread";

export default function MessagesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <>
      <ConversationList selectedId={selectedId} onSelect={setSelectedId} />
      {selectedId ? (
        <ConversationThread conversationId={selectedId} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          Select a conversation
        </div>
      )}
    </>
  );
}
