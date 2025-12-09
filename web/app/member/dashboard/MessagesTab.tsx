"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getMemberConversations, getConversation } from "@/lib/firestore";
import type { Conversation } from "@/lib/types";
import ConversationList from "@/components/messaging/ConversationList";
import MessageThread from "@/components/messaging/MessageThread";
import Link from "next/link";

export default function MessagesTab() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user]);

  async function loadConversations() {
    if (!user) return;

    try {
      setLoading(true);
      const convos = await getMemberConversations(user.uid);
      setConversations(convos);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectConversation(conversation: Conversation) {
    setSelectedConversation(conversation);
  }

  function handleMessageSent() {
    // Refresh conversations to update last message
    loadConversations();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-400">Loading messages...</div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-12 text-center">
        <div className="mx-auto max-w-md">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
            <svg
              className="h-8 w-8 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">
            No messages yet
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            When you apply to jobs or connect with employers, your conversations
            will appear here.
          </p>
          <Link
            href="/jobs"
            className="mt-6 inline-block rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white transition hover:shadow-lg hover:shadow-emerald-500/30"
          >
            Browse Jobs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Messages</h2>
        <span className="text-sm text-slate-400">
          {conversations.length} conversation
          {conversations.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="grid h-[calc(100vh-400px)] min-h-[500px] md:grid-cols-[320px_1fr]">
          {/* Conversation List */}
          <div className="border-r border-slate-800 overflow-y-auto">
            <div className="border-b border-slate-800 p-4">
              <h3 className="font-semibold text-white">Conversations</h3>
            </div>
            <ConversationList
              conversations={conversations}
              selectedId={selectedConversation?.id}
              onSelect={handleSelectConversation}
              userType="member"
              loading={loading}
            />
          </div>

          {/* Message Thread */}
          <div className="hidden md:block">
            {selectedConversation ? (
              <MessageThread
                conversation={selectedConversation}
                currentUserId={user!.uid}
                userType="member"
                onMessageSent={handleMessageSent}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">
                <div className="text-center">
                  <svg
                    className="mx-auto h-16 w-16 text-slate-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <p className="mt-4">Select a conversation to view messages</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Employers will message you here about your job applications
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Mobile: Show thread if selected */}
          {selectedConversation && (
            <div className="absolute inset-0 z-10 bg-[#020306] md:hidden">
              <div className="h-full">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/50 px-4 py-3 text-sm text-slate-400"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Back to conversations
                </button>
                <div className="h-[calc(100%-48px)]">
                  <MessageThread
                    conversation={selectedConversation}
                    currentUserId={user!.uid}
                    userType="member"
                    onMessageSent={handleMessageSent}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
