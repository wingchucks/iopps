'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import {
  getConversation,
  getConversationMessages,
  sendMessage,
  markMessagesAsRead,
} from '@/lib/firestore';
import type { Conversation, Message } from '@/lib/types';
import {
  ArrowLeftIcon,
  UserIcon,
  PaperAirplaneIcon,
  EnvelopeIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function VendorInquiryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Extract the actual conversation ID from the prefixed ID
  const rawId = params.id as string;
  const conversationId = rawId.replace(/^(conv_|customer_)/, '');

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function loadConversation() {
      if (!user || !conversationId) return;

      try {
        setLoading(true);
        const [conv, msgs] = await Promise.all([
          getConversation(conversationId),
          getConversationMessages(conversationId),
        ]);

        if (!conv) {
          toast.error('Conversation not found');
          router.push('/organization/sell/inquiries');
          return;
        }

        setConversation(conv);
        setMessages(msgs);

        // Mark messages as read
        if (conv.employerUnreadCount > 0) {
          await markMessagesAsRead(conversationId, user.uid, 'employer');
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
        toast.error('Failed to load conversation');
      } finally {
        setLoading(false);
      }
    }

    loadConversation();
  }, [user, conversationId, router]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!user || !conversation || !newMessage.trim()) return;

    try {
      setSending(true);
      const message = await sendMessage({
        conversationId: conversation.id,
        senderId: user.uid,
        senderType: 'employer',
        content: newMessage.trim(),
      });

      setMessages((prev) => [...prev, message]);
      setNewMessage('');
      toast.success('Message sent');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (timestamp: Message['createdAt']) => {
    if (!timestamp) return '';
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    return format(date, 'h:mm a');
  };

  const formatMessageDate = (timestamp: Message['createdAt']) => {
    if (!timestamp) return '';
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    return format(date, 'MMMM d, yyyy');
  };

  // Group messages by date
  const groupedMessages = messages.reduce<Record<string, Message[]>>((groups, message) => {
    const dateKey = message.createdAt
      ? formatMessageDate(message.createdAt)
      : 'Unknown';
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
    return groups;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-muted)]">Conversation not found</p>
        <Link
          href="/organization/sell/inquiries"
          className="text-accent hover:underline mt-4 inline-block"
        >
          Back to Inquiries
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-[var(--card-border)]">
        <Link
          href="/organization/sell/inquiries"
          className="p-2 rounded-lg hover:bg-surface transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-[var(--text-muted)]" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center">
            <UserIcon className="w-5 h-5 text-foreground0" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {conversation.memberName || 'Customer'}
            </h1>
            <div className="flex items-center gap-3 text-xs text-foreground0">
              {conversation.memberEmail && (
                <span className="flex items-center gap-1">
                  <EnvelopeIcon className="w-3 h-3" />
                  {conversation.memberEmail}
                </span>
              )}
              {conversation.createdAt && (
                <span className="flex items-center gap-1">
                  <ClockIcon className="w-3 h-3" />
                  Started{' '}
                  {formatDistanceToNow(
                    conversation.createdAt instanceof Date
                      ? conversation.createdAt
                      : conversation.createdAt.toDate(),
                    { addSuffix: true }
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-6">
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            {/* Date Divider */}
            <div className="flex items-center gap-4 my-4">
              <div className="flex-1 h-px bg-surface" />
              <span className="text-xs text-foreground0 font-medium">{date}</span>
              <div className="flex-1 h-px bg-surface" />
            </div>

            {/* Messages for this date */}
            <div className="space-y-3">
              {dateMessages.map((message) => {
                const isFromEmployer = message.senderType === 'employer';
                return (
                  <div
                    key={message.id}
                    className={`flex ${isFromEmployer ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        isFromEmployer
                          ? 'bg-accent text-slate-950 rounded-br-md'
                          : 'bg-surface text-foreground rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          isFromEmployer ? 'text-[var(--text-secondary)]' : 'text-foreground0'
                        }`}
                      >
                        {formatMessageTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <div className="text-center py-12 text-foreground0">
            <p>No messages yet. Start the conversation by sending a message below.</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-[var(--card-border)] pt-4">
        <div className="flex items-end gap-3">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={2}
            className="flex-1 px-4 py-3 bg-surface border border-[var(--card-border)] rounded-xl text-foreground placeholder-slate-500 resize-none focus:outline-none focus:border-accent/50"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            className="p-3 bg-accent text-slate-950 rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <PaperAirplaneIcon className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-foreground0 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
