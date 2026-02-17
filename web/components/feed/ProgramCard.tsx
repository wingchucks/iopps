'use client';

import type { Post } from '@/lib/types';

interface Props {
  post: Post;
  onSave?: (id: string) => void;
  saved?: boolean;
}

export default function ProgramCard({ post, onSave, saved }: Props) {
  return (
    <div className="card-interactive border border-[var(--card-border)] bg-[var(--card-bg)] rounded-xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {post.orgLogoURL ? (
            <img src={post.orgLogoURL} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0 text-lg">🎓</div>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-[var(--text-primary)] truncate">{post.title}</h3>
            <p className="text-sm text-[var(--text-secondary)]">{post.institution || post.orgName}</p>
            <p className="text-sm text-[var(--text-muted)]">{post.location.city}, {post.location.province}</p>
          </div>
        </div>
        <button onClick={() => onSave?.(post.id)} className="flex-shrink-0 p-1.5 rounded-lg hover:bg-[var(--surface-raised)] transition-colors">
          <svg className="w-5 h-5" fill={saved ? 'var(--accent)' : 'none'} stroke={saved ? 'var(--accent)' : 'var(--text-muted)'} strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        {post.credentialType && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
            {post.credentialType}
          </span>
        )}
        {post.duration && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--surface-raised)] text-[var(--text-secondary)]">
            {post.duration}
          </span>
        )}
        {post.deliveryMode && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--surface-raised)] text-[var(--text-secondary)]">
            {post.deliveryMode}
          </span>
        )}
      </div>
    </div>
  );
}
