'use client';

import type { Post } from '@/lib/types';

function formatDate(ts?: { seconds: number }): string {
  if (!ts) return '';
  return new Date(ts.seconds * 1000).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(ts?: { seconds: number }): string {
  if (!ts) return '';
  return new Date(ts.seconds * 1000).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' });
}

interface EventCardProps {
  post: Post;
  onSave?: (id: string) => void;
  saved?: boolean;
}

export default function EventCard({ post, onSave, saved }: EventCardProps) {
  return (
    <div className="card-interactive border border-[var(--card-border)] bg-[var(--card-bg)] rounded-xl overflow-hidden">
      {post.coverImage && (
        <div className="h-40 overflow-hidden">
          <img src={post.coverImage} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                {post.eventCategory || 'Event'}
              </span>
              {post.admissionCost && (
                <span className="text-xs text-[var(--text-muted)]">{post.admissionCost === '0' || post.admissionCost.toLowerCase() === 'free' ? 'Free' : post.admissionCost}</span>
              )}
            </div>
            <h3 className="font-semibold text-[var(--text-primary)]">{post.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              {post.orgLogoURL ? (
                <img src={post.orgLogoURL} alt="" className="w-5 h-5 rounded" />
              ) : null}
              <p className="text-sm text-[var(--text-secondary)]">{post.orgName}</p>
            </div>
          </div>
          <button
            onClick={() => onSave?.(post.id)}
            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-[var(--surface-raised)] transition-colors"
          >
            <svg className="w-5 h-5" fill={saved ? 'var(--accent)' : 'none'} stroke={saved ? 'var(--accent)' : 'var(--text-muted)'} strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>

        <div className="mt-3 space-y-1 text-sm text-[var(--text-muted)]">
          {post.startDate && (
            <p>📅 {formatDate(post.startDate as { seconds: number })} at {formatTime(post.startDate as { seconds: number })}</p>
          )}
          {post.venue && <p>📍 {post.venue}</p>}
          <p>{post.location.city}, {post.location.province}</p>
        </div>
      </div>
    </div>
  );
}
