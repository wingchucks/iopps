'use client';

import type { Post } from '@/lib/types';

function isClosingSoon(deadline?: { seconds: number }): boolean {
  if (!deadline) return false;
  const diff = deadline.seconds * 1000 - Date.now();
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
}

function formatDate(ts?: { seconds: number }): string {
  if (!ts) return '';
  return new Date(ts.seconds * 1000).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface JobCardProps {
  post: Post;
  onSave?: (id: string) => void;
  saved?: boolean;
}

export default function JobCard({ post, onSave, saved }: JobCardProps) {
  const closing = isClosingSoon(post.deadline as { seconds: number } | undefined);

  return (
    <div className="card-interactive border border-[var(--card-border)] bg-[var(--card-bg)] rounded-xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {post.orgLogoURL ? (
            <img src={post.orgLogoURL} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-[var(--surface-raised)] flex items-center justify-center flex-shrink-0 text-sm font-bold text-[var(--text-muted)]">
              {post.orgName?.charAt(0) || '?'}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-[var(--text-primary)] truncate">{post.title}</h3>
            <p className="text-sm text-[var(--text-secondary)]">{post.orgName}</p>
            <p className="text-sm text-[var(--text-muted)]">{post.location.city}, {post.location.province}</p>
          </div>
        </div>
        <button
          onClick={() => onSave?.(post.id)}
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-[var(--surface-raised)] transition-colors"
          aria-label={saved ? 'Unsave' : 'Save'}
        >
          <svg className="w-5 h-5" fill={saved ? 'var(--accent)' : 'none'} stroke={saved ? 'var(--accent)' : 'var(--text-muted)'} strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-light)] text-[var(--accent)]">
          {post.employmentType?.replace('-', ' ') || 'Job'}
        </span>
        {post.workMode && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--surface-raised)] text-[var(--text-secondary)]">
            {post.workMode}
          </span>
        )}
        {post.salary && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--surface-raised)] text-[var(--text-secondary)]">
            {post.salary}
          </span>
        )}
        {post.featured && <span className="badge-featured">⭐ Featured</span>}
        {closing && <span className="badge-closing-soon">⏰ Closing Soon</span>}
      </div>

      {post.deadline && (
        <p className="text-xs text-[var(--text-muted)] mt-3">Deadline: {formatDate(post.deadline as { seconds: number })}</p>
      )}
    </div>
  );
}
