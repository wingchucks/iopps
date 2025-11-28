"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getMemberConversations, getConversation } from "@/lib/firestore";
import type { Conversation } from "@/lib/types";
import ConversationList from "@/components/messaging/ConversationList";
import MessageThread from "@/components/messaging/MessageThread";
import { Suspense } from "react";

function MemberMessagesContent() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationIdParam = searchParams?.get("id");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user || role !== "community") {
      router.push("/");
      return;
    }

    loadConversations();
  }, [user, role, authLoading, router]);

  useEffect(() => {
    // Load specific conversation from URL param
    if (conversationIdParam && user) {
      loadConversationById(conversationIdParam);
    }
  }, [conversationIdParam, user]);

  async function loadConversations() {
    if (!user) return;

    try {
      setLoading(true);
      const convos = await getMemberConversations(user.uid);
      setConversations(convos);

      // If there's a conversation ID in URL, select it
      if (conversationIdParam) {
        const selected = convos.find((c) => c.id === conversationIdParam);
        if (selected) {
          setSelectedConversation(selected);
        }
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadConversationById(id: string) {
    try {
      const convo = await getConversation(id);
      if (convo && convo.memberId === user?.uid) {
        setSelectedConversation(convo);
        // Add to list if not already there
        setConversations((prev) => {
          if (prev.find((c) => c.id === id)) return prev;
          return [convo, ...prev];
        });
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  }

  function handleSelectConversation(conversation: Conversation) {
    setSelectedConversation(conversation);
    // Update URL without full navigation
    const url = new URL(window.location.href);
    url.searchParams.set("id", conversation.id);
    window.history.pushState({}, "", url.toString());
  }

  function handleMessageSent() {
    // Refresh conversations to update last message
    loadConversations();
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#020306] px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-slate-400">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (!user || role !== "community") {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#020306]">
      {/* Header */}
      <div className="border-b border-slate-800 bg-[#08090C]">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/member/dashboard"
                className="text-sm text-slate-400 hover:text-[#14B8A6]"
              >
                ← Dashboard
              </Link>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">
                Messages
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Messages from employers about your applications
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="grid h-[calc(100vh-280px)] min-h-[500px] md:grid-cols-[320px_1fr]">
            {/* Conversation List */}
            <div className="border-r border-slate-800 overflow-y-auto">
              <div className="border-b border-slate-800 p-4">
                <h2 className="font-semibold text-white">Conversations</h2>
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
                  currentUserId={user.uid}
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
                      currentUserId={user.uid}
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
    </div>
  );
}

export default function MemberMessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020306] px-4 py-10">
          <div className="mx-auto max-w-7xl">
            <p className="text-slate-400">Loading messages...</p>
          </div>
        </div>
      }
    >
      <MemberMessagesContent />
    </Suspense>
  );
}
