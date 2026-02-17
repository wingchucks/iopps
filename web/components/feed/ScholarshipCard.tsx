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

interface Props {
  post: Post;
  onSave?: (id: string) => void;
  saved?: boolean;
}

export default function ScholarshipCard({ post, onSave, saved }: Props) {
  const closing = isClosingSoon(post.deadline as { seconds: number } | undefined);

  return (
    <div className="card-interactive border border-[var(--card-border)] bg-[var(--card-bg)] rounded-xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {post.orgLogoURL ? (
            <img src={post.orgLogoURL} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 text-lg">🎓</div>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-[var(--text-primary)] truncate">{post.title}</h3>
            <p className="text-sm text-[var(--text-secondary)]">{post.orgName}</p>
          </div>
        </div>
        <button onClick={() => onSave?.(post.id)} className="flex-shrink-0 p-1.5 rounded-lg hover:bg-[var(--surface-raised)] transition-colors">
          <svg className="w-5 h-5" fill={saved ? 'var(--accent)' : 'none'} stroke={saved ? 'var(--accent)' : 'var(--text-muted)'} strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          Scholarship
        </span>
        {post.awardAmount && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            💰 {post.awardAmount}
          </span>
        )}
        {closing && <span className="badge-closing-soon">⏰ Closing Soon</span>}
      </div>

      {post.deadline && (
        <p className="text-xs text-[var(--text-muted)] mt-3">Deadline: {formatDate(post.deadline as { seconds: number })}</p>
      )}
      <p className="text-sm text-[var(--text-muted)] mt-1">{post.location.city}, {post.location.province}</p>
    </div>
  );
}
