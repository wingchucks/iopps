'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { getUnifiedInbox, getInboxCounts, markInboxItemRead } from '@/lib/firestore';
import type { UnifiedInboxItem, InboxItemType } from '@/lib/types';
import {
  InboxIcon,
  UserIcon,
  ShoppingCartIcon,
  AcademicCapIcon,
  BellIcon,
  MagnifyingGlassIcon,
  EnvelopeIcon,
  EnvelopeOpenIcon,
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

type FilterType = 'all' | InboxItemType;

const FILTER_OPTIONS: { value: FilterType; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'All', icon: InboxIcon },
  { value: 'candidate_message', label: 'Candidates', icon: UserIcon },
  { value: 'customer_inquiry', label: 'Customers', icon: ShoppingCartIcon },
  { value: 'student_inquiry', label: 'Students', icon: AcademicCapIcon },
  { value: 'system', label: 'System', icon: BellIcon },
];

interface InboxItemCardProps {
  item: UnifiedInboxItem;
  onMarkRead: () => void;
}

function InboxItemCard({ item, onMarkRead }: InboxItemCardProps) {
  const typeLabels: Record<InboxItemType, string> = {
    candidate_message: 'Job Application',
    customer_inquiry: 'Customer Inquiry',
    student_inquiry: 'Student Inquiry',
    system: 'System',
  };

  const typeColors: Record<InboxItemType, string> = {
    candidate_message: 'bg-blue-500/10 text-blue-400',
    customer_inquiry: 'bg-accent/10 text-accent',
    student_inquiry: 'bg-purple-500/10 text-purple-400',
    system: 'bg-slate-500/10 text-[var(--text-muted)]',
  };

  const formattedTime = item.createdAt
    ? formatDistanceToNow(
        item.createdAt instanceof Date
          ? item.createdAt
          : item.createdAt.toDate(),
        { addSuffix: true }
      )
    : '';

  return (
    <div
      className={`p-4 rounded-xl border transition-all cursor-pointer hover:border-[var(--card-border)] ${
        item.isRead
          ? 'bg-slate-900/30 border-[var(--card-border)]'
          : 'bg-slate-900/70 border-[var(--card-border)]'
      }`}
      onClick={onMarkRead}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center flex-shrink-0">
          {item.senderAvatarUrl ? (
            <img
              src={item.senderAvatarUrl}
              alt={item.senderName}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <span className="text-sm font-semibold text-[var(--text-muted)]">
              {item.senderName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-medium ${item.isRead ? 'text-[var(--text-muted)]' : 'text-foreground'}`}>
              {item.senderName}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[item.type]}`}>
              {typeLabels[item.type]}
            </span>
            {!item.isRead && (
              <span className="w-2 h-2 rounded-full bg-accent" />
            )}
          </div>

          {item.subject && (
            <p className={`text-sm mb-1 ${item.isRead ? 'text-foreground0' : 'text-[var(--text-secondary)]'}`}>
              {item.subject}
            </p>
          )}

          <p className="text-sm text-foreground0 line-clamp-2">{item.preview}</p>

          {item.relatedEntity && (
            <p className="text-xs text-slate-600 mt-2">
              Re: {item.relatedEntity.title}
            </p>
          )}
        </div>

        {/* Time & Status */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className="text-xs text-foreground0">{formattedTime}</span>
          {item.isRead ? (
            <EnvelopeOpenIcon className="w-4 h-4 text-slate-600" />
          ) : (
            <EnvelopeIcon className="w-4 h-4 text-accent" />
          )}
        </div>
      </div>
    </div>
  );
}

export default function InboxPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get('filter') as FilterType | null;

  const [items, setItems] = useState<UnifiedInboxItem[]>([]);
  const [counts, setCounts] = useState<Record<FilterType, number>>({
    all: 0,
    candidate_message: 0,
    customer_inquiry: 0,
    student_inquiry: 0,
    system: 0,
  });
  const [filter, setFilter] = useState<FilterType>(initialFilter || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInbox() {
      if (!user) return;

      setLoading(true);
      try {
        const [inboxItems, inboxCounts] = await Promise.all([
          getUnifiedInbox(user.uid, filter === 'all' ? undefined : filter),
          getInboxCounts(user.uid),
        ]);

        setItems(inboxItems);
        setCounts(inboxCounts);
      } catch (error) {
        console.error('Error loading inbox:', error);
      } finally {
        setLoading(false);
      }
    }

    loadInbox();
  }, [user, filter]);

  const handleMarkRead = async (item: UnifiedInboxItem) => {
    if (item.isRead) return;

    try {
      await markInboxItemRead(item.id, item.type);
      setItems(prev =>
        prev.map(i => (i.id === item.id ? { ...i, isRead: true } : i))
      );
    } catch (error) {
      console.error('Error marking item as read:', error);
    }
  };

  // Filter by search query
  const filteredItems = searchQuery
    ? items.filter(
        item =>
          item.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.subject?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : items;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inbox</h1>
        <p className="text-[var(--text-muted)] mt-1">
          Messages and inquiries from people who contact you
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map(option => {
            const Icon = option.icon;
            const count = counts[option.value];
            const isActive = filter === option.value;

            return (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-accent/10 text-accent border border-accent/20'
                    : 'bg-surface text-[var(--text-muted)] border border-[var(--card-border)] hover:border-[var(--card-border)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {option.label}
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                    isActive ? 'bg-accent/20' : 'bg-surface'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground0" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface border border-[var(--card-border)] rounded-lg text-sm text-foreground placeholder-slate-500 focus:outline-none focus:border-accent/50"
          />
        </div>
      </div>

      {/* Messages List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-card border border-card-border rounded-2xl p-12 text-center">
          <InboxIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text-secondary)] mb-2">No messages yet</h3>
          <p className="text-foreground0 max-w-md mx-auto">
            When people contact you, apply for jobs, or inquire about your programs, their messages will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map(item => (
            <InboxItemCard
              key={item.id}
              item={item}
              onMarkRead={() => handleMarkRead(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
