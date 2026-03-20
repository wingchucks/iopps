"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  onConversations,
  onMessages,
  sendMessage,
  markConversationRead,
  getOrCreateConversation,
  type Conversation,
  type Message,
} from "@/lib/firestore/messages";
import {
  getMemberProfile,
  getAllMembers,
  type MemberProfile,
} from "@/lib/firestore/members";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Avatar from "@/components/Avatar";
import Button from "@/components/Button";

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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, MemberProfile>>({});
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [allMembers, setAllMembers] = useState<MemberProfile[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [loadingMembers, setLoadingMembers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-open conversation from ?to= URL param
  const toParam = searchParams?.get("to");
  useEffect(() => {
    if (!user || !toParam || loading) return;
    // Create or open conversation with the target user
    getOrCreateConversation(user.uid, toParam).then(async (convId) => {
      if (!profiles[toParam]) {
        const p = await getMemberProfile(toParam);
        if (p) setProfiles((prev) => ({ ...prev, [toParam]: p }));
      }
      setActiveConvId(convId);
    }).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, toParam, loading]);

  // Real-time conversations listener
  useEffect(() => {
    if (!user) return;
    const unsub = onConversations(user.uid, async (convs) => {
      setConversations(convs);
      setLoading(false);

      // Load profiles for new participants
      const uids = new Set<string>();
      convs.forEach((c) => c.participants.forEach((p) => uids.add(p)));
      uids.delete(user.uid);

      setProfiles((prev) => {
        const missing = [...uids].filter((uid) => !prev[uid]);
        if (missing.length > 0) {
          // Load missing profiles in the background
          Promise.all(missing.map((uid) => getMemberProfile(uid))).then(
            (results) => {
              const newProfiles: Record<string, MemberProfile> = {};
              results.forEach((p, i) => {
                if (p) newProfiles[missing[i]] = p;
              });
              setProfiles((current) => ({ ...current, ...newProfiles }));
            }
          );
        }
        return prev;
      });
    });
    return unsub;
  }, [user]);

  // Real-time messages listener for active conversation
  useEffect(() => {
    if (!activeConvId || !user) return;
    const unsub = onMessages(activeConvId, (msgs) => {
      setMessages(msgs);
    });
    // Mark as read when opening a conversation
    const conv = conversations.find((c) => c.id === activeConvId);
    if (conv?.unreadBy === user.uid) {
      markConversationRead(activeConvId);
    }
    return unsub;
  }, [activeConvId, user]);

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
      setNewMessage("");
      // Real-time listeners will auto-update messages and conversations
    } catch (err) {
      console.error("Failed to send:", err);
    } finally {
      setSending(false);
    }
  };

  const handleNewChat = async (targetUid: string) => {
    if (!user) return;
    try {
      const convId = await getOrCreateConversation(user.uid, targetUid);
      // Load the other user's profile if we don't have it
      if (!profiles[targetUid]) {
        const p = await getMemberProfile(targetUid);
        if (p) setProfiles((prev) => ({ ...prev, [targetUid]: p }));
      }
      // Real-time listener will pick up the new conversation
      setActiveConvId(convId);
      setShowNewChat(false);
      setMemberSearch("");
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  };

  const loadAllMembers = async () => {
    setLoadingMembers(true);
    try {
      const members = await getAllMembers();
      setAllMembers(members.filter((m) => m.uid !== user?.uid));
    } catch (err) {
      console.error("Failed to load members:", err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const openNewChat = () => {
    setShowNewChat(true);
    if (allMembers.length === 0) loadAllMembers();
  };

  const filteredMembers = memberSearch.trim()
    ? allMembers.filter(
        (m) =>
          m.displayName?.toLowerCase().includes(memberSearch.toLowerCase()) ||
          m.email?.toLowerCase().includes(memberSearch.toLowerCase())
      )
    : allMembers;

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
            <Button small onClick={openNewChat} style={{ background: "var(--teal)", color: "#fff", border: "none" }}>
              + New
            </Button>
          </div>

          {/* New chat picker */}
          {showNewChat && (
            <Card className="mb-3">
              <div style={{ padding: 12 }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-text-muted m-0">NEW MESSAGE</p>
                  <button
                    onClick={() => setShowNewChat(false)}
                    className="text-text-muted text-sm border-none bg-transparent cursor-pointer"
                  >
                    &times;
                  </button>
                </div>
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search members..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-text text-sm outline-none focus:border-teal mb-2"
                />
                <div className="max-h-[200px] overflow-y-auto">
                  {loadingMembers ? (
                    <p className="text-xs text-text-muted py-2">Loading...</p>
                  ) : filteredMembers.length === 0 ? (
                    <p className="text-xs text-text-muted py-2">No members found.</p>
                  ) : (
                    filteredMembers.slice(0, 10).map((m) => (
                      <div
                        key={m.uid}
                        onClick={() => handleNewChat(m.uid)}
                        className="flex items-center gap-2.5 py-2 px-1 cursor-pointer hover:bg-bg rounded-lg transition-colors"
                      >
                        <Avatar name={m.displayName || m.email} size={32} src={m.photoURL} />
                        <div>
                          <p className="text-sm font-semibold text-text m-0">
                            {m.displayName || "No name"}
                          </p>
                          <p className="text-[11px] text-text-muted m-0">{m.email}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-xl skeleton" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <Card style={{ padding: 32, textAlign: "center" }}>
                <p className="text-3xl mb-2">&#128172;</p>
                <p className="text-sm text-text-muted">
                  No conversations yet. Start a new message!
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
                      onClick={() => setActiveConvId(conv.id)}
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
                  {activeOther?.community && (
                    <p className="text-[11px] text-text-muted m-0">
                      {activeOther.community}
                    </p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto" style={{ padding: "16px" }}>
                {messages.length === 0 ? (
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
                  className="px-4 py-2.5 rounded-xl border-none cursor-pointer text-sm font-bold text-white"
                  style={{
                    background: "var(--teal)",
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
                <p className="text-sm text-text-muted">
                  Select a conversation or start a new one.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
