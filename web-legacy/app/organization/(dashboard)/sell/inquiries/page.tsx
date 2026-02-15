'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { getUnifiedInbox } from '@/lib/firestore';
import type { UnifiedInboxItem } from '@/lib/types';

// Map UnifiedInboxItem to ShopInquiry shape
type ShopInquiry = {
  id: string;
  senderName?: string;
  senderEmail?: string;
  senderPhone?: string;
  message: string;
  isRead: boolean;
  createdAt: Date | { toDate(): Date } | null;
};
import {
  ChatBubbleLeftRightIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

export default function SellInquiriesPage() {
  const { user } = useAuth();
  const [inquiries, setInquiries] = useState<ShopInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  useEffect(() => {
    async function loadInquiries() {
      if (!user) return;

      try {
        // Get customer inquiries from unified inbox
        const inboxItems = await getUnifiedInbox(user.uid, 'customer_inquiry');
        // Map to ShopInquiry shape
        const mappedInquiries: ShopInquiry[] = inboxItems.map(item => ({
          id: item.id,
          senderName: item.senderName,
          senderEmail: item.senderEmail,
          message: item.preview,
          isRead: item.isRead,
          createdAt: item.createdAt,
        }));
        setInquiries(mappedInquiries);
      } catch (error) {
        console.error('Error loading inquiries:', error);
      } finally {
        setLoading(false);
      }
    }

    loadInquiries();
  }, [user]);

  const filteredInquiries = inquiries.filter(inquiry => {
    if (filter === 'unread') return !inquiry.isRead;
    if (filter === 'read') return inquiry.isRead;
    return true;
  });

  const unreadCount = inquiries.filter(i => !i.isRead).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Customer Inquiries</h1>
        <p className="text-[var(--text-muted)] mt-1">
          Messages from potential customers
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filter === 'all'
              ? 'bg-accent/10 text-accent border border-accent/20'
              : 'bg-surface text-[var(--text-muted)] border border-[var(--card-border)] hover:border-[var(--card-border)]'
          }`}
        >
          All ({inquiries.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filter === 'unread'
              ? 'bg-blue-900/30 text-blue-400 border border-blue-800/30'
              : 'bg-surface text-[var(--text-muted)] border border-[var(--card-border)] hover:border-[var(--card-border)]'
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilter('read')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filter === 'read'
              ? 'bg-slate-700/50 text-[var(--text-secondary)] border border-[var(--card-border)]'
              : 'bg-surface text-[var(--text-muted)] border border-[var(--card-border)] hover:border-[var(--card-border)]'
          }`}
        >
          Read ({inquiries.length - unreadCount})
        </button>
      </div>

      {/* Inquiries List */}
      {filteredInquiries.length === 0 ? (
        <div className="bg-card border border-card-border rounded-2xl p-12 text-center">
          <ChatBubbleLeftRightIcon className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text-secondary)] mb-2">
            {filter === 'all' ? 'No inquiries yet' : `No ${filter} inquiries`}
          </h3>
          <p className="text-foreground0 max-w-md mx-auto">
            {filter === 'all'
              ? 'When customers contact you through your shop profile, their messages will appear here.'
              : 'No inquiries match this filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInquiries.map(inquiry => (
            <Link
              key={inquiry.id}
              href={`/organization/sell/inquiries/${inquiry.id}`}
              className={`block bg-card border rounded-xl p-4 transition-colors ${
                inquiry.isRead
                  ? 'border-card-border hover:border-[var(--card-border)]'
                  : 'border-accent/30 bg-accent/5 hover:border-accent/50'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-foreground0" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {inquiry.senderName || 'Anonymous'}
                      {!inquiry.isRead && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs font-medium rounded bg-accent/20 text-accent">
                          New
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-foreground0 line-clamp-2 mt-1">
                      {inquiry.message}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-foreground0">
                      {inquiry.senderEmail && (
                        <span className="flex items-center gap-1">
                          <EnvelopeIcon className="w-3.5 h-3.5" />
                          {inquiry.senderEmail}
                        </span>
                      )}
                      {inquiry.senderPhone && (
                        <span className="flex items-center gap-1">
                          <PhoneIcon className="w-3.5 h-3.5" />
                          {inquiry.senderPhone}
                        </span>
                      )}
                      <span>
                        {inquiry.createdAt
                          ? formatDistanceToNow(
                              inquiry.createdAt instanceof Date
                                ? inquiry.createdAt
                                : inquiry.createdAt.toDate(),
                              { addSuffix: true }
                            )
                          : 'recently'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
