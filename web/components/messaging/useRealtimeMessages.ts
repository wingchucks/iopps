/* eslint-disable react-hooks/set-state-in-effect -- intentional: setState in snapshot subscription callbacks */
"use client";

import { useState, useEffect } from "react";
import { onSnapshot } from "firebase/firestore";
import { getMessagesQuery } from "@/lib/firestore/messaging";
import type { Message } from "@/lib/types";

export function useRealtimeMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = getMessagesQuery(conversationId);
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Message)
        );
        // Query is ordered desc for limit efficiency; reverse to chronological order
        setMessages(msgs.reverse());
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to messages:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [conversationId]);

  return { messages, loading };
}
