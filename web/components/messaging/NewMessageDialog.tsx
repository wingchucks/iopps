"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Send, ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { searchMembersByName } from "@/lib/firestore";
import {
  getOrCreatePeerConversation,
  sendPeerMessage,
} from "@/lib/firestore/messaging";
import type { MemberProfile } from "@/lib/types";

interface NewMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  onConversationCreated?: (conversationId: string) => void;
}

export default function NewMessageDialog({
  open,
  onOpenChange,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onConversationCreated,
}: NewMessageDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MemberProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setSearchResults([]);
      setSelectedMember(null);
      setMessage("");
      setError(null);
      setSending(false);
      // Focus search input after mount
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [open]);

  // Focus message input when member is selected
  useEffect(() => {
    if (selectedMember) {
      setTimeout(() => messageInputRef.current?.focus(), 100);
    }
  }, [selectedMember]);

  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        setSearching(true);
        const results = await searchMembersByName(query, 10);
        // Filter out current user
        setSearchResults(results.filter((m) => m.id !== currentUserId));
      } catch (err) {
        console.error("Error searching members:", err);
      } finally {
        setSearching(false);
      }
    },
    [currentUserId]
  );

  function handleSearchInput(value: string) {
    setSearchQuery(value);
    setError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      handleSearch(value);
    }, 300);
  }

  function handleSelectMember(member: MemberProfile) {
    setSelectedMember(member);
    setError(null);
  }

  async function handleSend() {
    if (!selectedMember || !message.trim() || sending) return;

    try {
      setSending(true);
      setError(null);

      const conversation = await getOrCreatePeerConversation({
        userId1: currentUserId,
        userId2: selectedMember.id || selectedMember.userId,
        user1Name: currentUserName,
        user1Avatar: currentUserAvatar,
        user2Name: selectedMember.displayName,
        user2Avatar: selectedMember.photoURL,
      });

      await sendPeerMessage({
        conversationId: conversation.id,
        senderId: currentUserId,
        content: message.trim(),
      });

      toast.success("Message sent!");
      onOpenChange(false);
      onConversationCreated?.(conversation.id);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "MESSAGING_BLOCKED") {
          setError("This member has disabled incoming messages.");
        } else if (err.message === "CONNECTION_REQUIRED") {
          setError(
            "You need to be connected with this member to send them a message."
          );
        } else {
          setError("Failed to send message. Please try again.");
        }
      } else {
        setError("Failed to send message. Please try again.");
      }
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  }

  function getInitials(name?: string) {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-700 bg-slate-900 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            {selectedMember ? (
              <button
                onClick={() => {
                  setSelectedMember(null);
                  setError(null);
                }}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to search
              </button>
            ) : (
              "New Message"
            )}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {selectedMember
              ? `Send a message to ${selectedMember.displayName}`
              : "Search for a member to start a conversation"}
          </DialogDescription>
        </DialogHeader>

        {!selectedMember ? (
          // Search view
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="max-h-64 overflow-y-auto">
              {searching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-1">
                  {searchResults.map((member) => (
                    <button
                      key={member.id || member.userId}
                      onClick={() => handleSelectMember(member)}
                      className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition hover:bg-slate-800/70"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.photoURL} />
                        <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-sm">
                          {getInitials(member.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-white">
                          {member.displayName}
                        </p>
                        {member.indigenousAffiliation && (
                          <p className="truncate text-xs text-slate-400">
                            {member.indigenousAffiliation}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery.trim() ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-slate-400">No members found</p>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-slate-500">
                    Type a name to search
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Compose view
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg bg-slate-800/50 p-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedMember.photoURL} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-sm">
                  {getInitials(selectedMember.displayName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-white">
                  {selectedMember.displayName}
                </p>
                {selectedMember.indigenousAffiliation && (
                  <p className="text-xs text-slate-400">
                    {selectedMember.indigenousAffiliation}
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <textarea
              ref={messageInputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message..."
              rows={4}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />

            <button
              onClick={handleSend}
              disabled={!message.trim() || sending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 font-medium text-white transition hover:shadow-lg hover:shadow-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Message
                </>
              )}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
