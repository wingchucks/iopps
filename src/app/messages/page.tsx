"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  onConversations,
  onMessages,
  sendMessage,
  markConversationRead,
  getConversationPeer,
  type ConversationPeer,
  type Conversation,
  type Message,
} from "@/lib/firestore/messages";

import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Avatar from "@/components/Avatar";

const EMPTY_MESSAGES: Message[] = [];
const EMPTY_CONVERSATIONS: Conversation[] = [];

export default function MessagesPage() {
  return (
    <ProtectedRoute>
      <AppShell>
      <div className="min-h-screen bg-bg">
        <MessagesContent />
      </div>
    </AppShell>
    </ProtectedRoute>
  );
}

function MessagesContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [inboxConversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messageState, setMessageState] = useState<{
    key: string;
    messages: Message[];
    failed: boolean;
  } | null>(null);
  const [messageRetry, setMessageRetry] = useState(0);
  const [profiles, setProfiles] = useState<Record<string, ConversationPeer>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const draftKey = JSON.stringify([user?.uid, activeConvId]);
  const messageKey = JSON.stringify([user?.uid, activeConvId, messageRetry]);
  const currentMessages = messageState?.key === messageKey ? messageState : null;
  const messages = currentMessages?.messages || EMPTY_MESSAGES;
  const messagesLoading = !currentMessages;
  const messagesFailed = currentMessages?.failed === true;
  const newMessage = drafts[draftKey] || "";
  const setNewMessage = (text: string) => setDrafts(previous => ({ ...previous, [draftKey]: text }));
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inboxFailed, setInboxFailed] = useState(false);
  const [inboxRetry, setInboxRetry] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const consumedRecipients = useRef(new Set<string>());
  const [inboxOwner, setInboxOwner] = useState<string | null>(null);
  const conversations = inboxOwner === user?.uid ? inboxConversations : EMPTY_CONVERSATIONS;
  const viewer = useRef(user?.uid);
  viewer.current = user?.uid;
  useEffect(() => { setActiveConvId(null); }, [user?.uid]);

  // Legacy recipient links can open only a conversation already in this inbox.
  const toParam = searchParams?.get("to");
  useEffect(() => {
    if (!user || !toParam || inboxOwner !== user.uid || inboxFailed || loading) return;
    const key = JSON.stringify([user.uid, toParam]);
    if (consumedRecipients.current.has(key)) return;
    consumedRecipients.current.add(key);
    const existing = conversations.find(c => c.participants.includes(toParam));
    if (existing) setActiveConvId(existing.id);
  }, [user, toParam, conversations, inboxOwner, inboxFailed, loading]);

  // Real-time conversations listener
  useEffect(() => {
    if (!user) return;
    let active = true;
    setInboxOwner(null); setConversations([]); setProfiles({}); setLoading(true); setInboxFailed(false);
    const current = () => active && viewer.current === user.uid;
    const unsub = onConversations(user.uid, (convs) => {
      if (!current()) return;
      setConversations(convs);
      setInboxOwner(user.uid);
      setLoading(false);

      // Resolve only the minimal identity projection of existing participants.
      Promise.all(convs.map(async c => {
        try { return await getConversationPeer(c.id); } catch { return null; }
      })).then(peers => {
        if (!current()) return;
        const next: Record<string, ConversationPeer> = {};
        for (const peer of peers) if (peer) next[peer.uid] = peer;
        setProfiles(next);
      });
    }, error => {
      console.error("Failed to load conversations:", error);
      if (current()) { setInboxOwner(user.uid); setInboxFailed(true); setLoading(false); }
    });
    return () => { active = false; unsub(); };
  }, [user, inboxRetry]);

  // Real-time messages listener for active conversation
  useEffect(() => {
    if (!activeConvId || !user) return;
    let active = true;
    const unsub = onMessages(activeConvId, (msgs) => {
      if (active) setMessageState({ key: messageKey, messages: msgs, failed: false });
    }, (error) => {
      console.error("Failed to load messages:", error);
      if (active) setMessageState({ key: messageKey, messages: [], failed: true });
    });
    return () => { active = false; unsub(); };
  }, [activeConvId, user, messageKey]);

  // Incoming messages in the open conversation must also clear its unread badge.
  useEffect(() => {
    if (!user || !activeConvId) return;
    const conv = conversations.find((c) => c.id === activeConvId && c.participants.includes(user.uid));
    if (conv?.unreadBy === user.uid) {
      Promise.resolve(markConversationRead(activeConvId)).catch(error => console.error("Failed to mark conversation read:", error));
    }
  }, [activeConvId, user, conversations]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getOtherUser = (conv: Conversation) => {
    const otherId = conv.participants.find((p) => p !== user?.uid) || "";
    return profiles[otherId];
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !activeConvId || !user || sending) return;
    const conv = conversations.find((c) => c.id === activeConvId);
    if (!conv) return;
    const recipientId = conv.participants.find((p) => p !== user.uid) || "";

    setSending(true);
    try {
      await sendMessage(activeConvId, user.uid, newMessage.trim(), recipientId);
      // Clear only the submitted draft, never text typed while the send awaited.
      setDrafts(previous => previous[draftKey] === newMessage
        ? { ...previous, [draftKey]: "" }
        : previous);
      // Real-time listeners will auto-update messages and conversations
    } catch (err) {
      console.error("Failed to send:", err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts: unknown) => {
    if (!ts || typeof ts !== "object") return "";
    const d = ts as { seconds?: number };
    if (!d.seconds) return "";
    const diff = Math.floor((Date.now() / 1000 - d.seconds) / 60);
    if (diff < 1) return "Now";
    if (diff < 60) return `${diff}m`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h`;
    return `${Math.floor(diff / 1440)}d`;
  };

  const formatMsgTime = (ts: unknown) => {
    if (!ts || typeof ts !== "object") return "";
    const d = ts as { seconds?: number };
    if (!d.seconds) return "";
    return new Date(d.seconds * 1000).toLocaleTimeString("en-CA", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const activeOther = activeConv ? getOtherUser(activeConv) : null;

  return (
    <div className="max-w-[900px] mx-auto px-4 py-4 md:px-10 md:py-6">
      <div className="flex gap-4" style={{ height: "calc(100vh - 100px)" }}>
        {/* Conversation List */}
        <div
          className={`w-full md:w-[300px] shrink-0 flex flex-col ${
            activeConvId ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-extrabold text-text">Messages</h2>

          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {inboxFailed && inboxOwner === user?.uid ? <div role="alert" className="p-4"><p>Conversations could not be loaded. Please try again.</p><button className="text-teal mt-2" onClick={() => setInboxRetry(value => value + 1)}>Retry</button></div> : loading || inboxOwner !== user?.uid ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-xl skeleton" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <Card style={{ padding: 32, textAlign: "center" }}>
                <p className="text-3xl mb-2">&#128172;</p>
                <p className="text-sm font-bold text-text mb-1">
                  No conversations yet
                </p>
                <p className="text-sm text-text-muted mb-4">
                  Your existing private conversations will appear here.
                </p>

              </Card>
            ) : (
              <div className="space-y-1">
                {conversations.map((conv) => {
                  const other = getOtherUser(conv);
                  const isActive = conv.id === activeConvId;
                  const isUnread = conv.unreadBy === user?.uid;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => { setMessageState(null); setActiveConvId(conv.id); setMessageRetry(previous => previous + 1); }}
                      className="flex items-center gap-3 rounded-xl cursor-pointer transition-colors"
                      style={{
                        padding: "12px 14px",
                        background: isActive
                          ? "var(--teal-soft)"
                          : "transparent",
                      }}
                    >
                      <Avatar
                        name={other?.displayName || "?"}
                        size={40}
                        src={other?.photoURL}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p
                            className="text-sm m-0 truncate"
                            style={{
                              fontWeight: isUnread ? 700 : 600,
                              color: "var(--text)",
                            }}
                          >
                            {other?.displayName || "Unknown"}
                          </p>
                          <span className="text-[11px] text-text-muted shrink-0 ml-2">
                            {formatTime(conv.lastMessageAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <p
                            className="text-xs m-0 truncate"
                            style={{
                              color: isUnread
                                ? "var(--text)"
                                : "var(--text-muted)",
                              fontWeight: isUnread ? 600 : 400,
                            }}
                          >
                            {conv.lastSenderId === user?.uid ? "You: " : ""}
                            {conv.lastMessage || "Start a conversation"}
                          </p>
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-teal shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Chat View */}
        <div
          className={`flex-1 flex flex-col min-w-0 ${
            activeConvId ? "flex" : "hidden md:flex"
          }`}
        >
          {activeConvId && activeConv ? (
            <>
              {/* Chat header */}
              <div
                className="flex items-center gap-3 shrink-0 border-b border-border"
                style={{ padding: "12px 16px" }}
              >
                <button
                  onClick={() => setActiveConvId(null)}
                  className="md:hidden text-teal text-sm font-semibold border-none bg-transparent cursor-pointer"
                >
                  &larr;
                </button>
                <Avatar
                  name={activeOther?.displayName || "?"}
                  size={36}
                  src={activeOther?.photoURL}
                />
                <div>
                  <p className="text-sm font-bold text-text m-0">
                    {activeOther?.displayName || "Unknown"}
                  </p>

                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto" style={{ padding: "16px" }}>
                {messagesLoading ? (
                  <p role="status" className="text-center text-text-muted text-sm py-12">Loading messages...</p>
                ) : messagesFailed ? (
                  <div role="alert" className="text-center py-12">
                    <p className="text-text-muted text-sm">Messages could not be loaded. Please try again.</p>
                    <button onClick={() => setMessageRetry(previous => previous + 1)} className="text-teal text-sm font-semibold border-none bg-transparent cursor-pointer mt-2">Retry</button>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-text-muted text-sm">
                      No messages yet. Say hello!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => {
                      const isMine = msg.senderId === user?.uid;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className="max-w-[75%] rounded-2xl"
                            style={{
                              padding: "10px 14px",
                              background: isMine
                                ? "var(--teal)"
                                : "var(--card)",
                              color: isMine ? "#fff" : "var(--text)",
                              border: isMine
                                ? "none"
                                : "1px solid var(--border)",
                              borderBottomRightRadius: isMine ? 4 : 16,
                              borderBottomLeftRadius: isMine ? 16 : 4,
                            }}
                          >
                            <p className="text-sm m-0 leading-relaxed whitespace-pre-wrap">
                              {msg.text}
                            </p>
                            <p
                              className="text-[10px] mt-1 m-0"
                              style={{
                                color: isMine
                                  ? "rgba(255,255,255,.6)"
                                  : "var(--text-muted)",
                              }}
                            >
                              {formatMsgTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input */}
              <div
                className="shrink-0 flex gap-2 border-t border-border"
                style={{ padding: "12px 16px" }}
              >
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-card text-text text-sm outline-none focus:border-teal"
                />
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  className="brand-button px-4 py-2.5 rounded-xl border-none cursor-pointer text-sm font-bold text-white"
                  style={{
                    background: "var(--button-gradient)",
                    opacity: !newMessage.trim() || sending ? 0.5 : 1,
                  }}
                >
                  {sending ? "..." : "Send"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-4xl mb-3">&#128172;</p>
                <p className="text-lg font-bold text-text mb-1">Your Messages</p>
                <p className="text-sm text-text-muted mb-4">
                  Select an existing private conversation.
                </p>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
