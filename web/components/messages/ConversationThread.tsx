"use client";

import { useEffect, useRef, useState } from "react";
import { getMessages, markAsRead } from "@/lib/firestore/messages";
import type { Message } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import MessageInput from "./MessageInput";

interface Props {
  conversationId: string;
}

export default function ConversationThread({ conversationId }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = getMessages(conversationId, (msgs) => {
      setMessages(msgs);
      // Mark as read
      markAsRead(conversationId, user.uid);
    });
    return unsub;
  }, [conversationId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!user) return null;

  function formatTime(ts: { seconds: number }) {
    return new Date(ts.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.senderUid === user.uid;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                  isMe ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                {msg.attachments?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {msg.attachments.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block text-xs underline ${isMe ? "text-blue-200" : "text-blue-600"}`}
                      >
                        📎 Attachment {i + 1}
                      </a>
                    ))}
                  </div>
                )}
                <p className={`text-[10px] mt-1 ${isMe ? "text-blue-200" : "text-gray-400"}`}>
                  {msg.createdAt && formatTime(msg.createdAt)}
                  {isMe && msg.readBy?.length > 1 && " ✓✓"}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <MessageInput conversationId={conversationId} />
    </div>
  );
}
