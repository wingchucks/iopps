'use client';

import type { Post } from '@/lib/types';
import JobCard from './JobCard';
import EventCard from './EventCard';
import ScholarshipCard from './ScholarshipCard';
import BusinessCard from './BusinessCard';
import ProgramCard from './ProgramCard';

interface FeedCardProps {
  post: Post;
  onSave?: (id: string) => void;
  saved?: boolean;
}

export default function FeedCard({ post, onSave, saved }: FeedCardProps) {
  switch (post.type) {
    case 'job':
      return <JobCard post={post} onSave={onSave} saved={saved} />;
    case 'event':
      return <EventCard post={post} onSave={onSave} saved={saved} />;
    case 'scholarship':
      return <ScholarshipCard post={post} onSave={onSave} saved={saved} />;
    case 'business':
      return <BusinessCard post={post} onSave={onSave} saved={saved} />;
    case 'program':
      return <ProgramCard post={post} onSave={onSave} saved={saved} />;
    case 'livestream':
      return (
        <div className="card-interactive border border-[var(--card-border)] bg-[var(--card-bg)] rounded-xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {post.isLive && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600 dark:bg-red-900/30">
                    <span className="live-dot" /> LIVE
                  </span>
                )}
                <span className="text-xs text-[var(--text-muted)]">{post.streamCategory}</span>
              </div>
              <h3 className="font-semibold text-[var(--text-primary)]">{post.title}</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">{post.orgName}</p>
            </div>
            <button onClick={() => onSave?.(post.id)} className="flex-shrink-0 p-1.5 rounded-lg hover:bg-[var(--surface-raised)] transition-colors">
              <svg className="w-5 h-5" fill={saved ? 'var(--accent)' : 'none'} stroke={saved ? 'var(--accent)' : 'var(--text-muted)'} strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          </div>
        </div>
      );
    case 'story':
      return (
        <div className="card-interactive border border-[var(--card-border)] bg-[var(--card-bg)] rounded-xl overflow-hidden">
          {post.personPhoto && (
            <div className="h-48 overflow-hidden">
              <img src={post.personPhoto} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-5">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 mb-2">
              Success Story
            </span>
            <h3 className="font-semibold text-[var(--text-primary)]">{post.title}</h3>
            {post.personName && <p className="text-sm text-[var(--text-secondary)] mt-1">{post.personName}{post.personNation ? ` — ${post.personNation}` : ''}</p>}
            {post.pullQuote && <blockquote className="text-sm italic text-[var(--text-muted)] mt-2 border-l-2 border-[var(--accent)] pl-3">&ldquo;{post.pullQuote}&rdquo;</blockquote>}
          </div>
        </div>
      );
    case 'promotion':
      return (
        <div className="card-interactive border border-[var(--gold)] bg-[var(--card-bg)] rounded-xl overflow-hidden">
          {post.promoImage && (
            <div className="h-40 overflow-hidden">
              <img src={post.promoImage} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-5">
            <span className="badge-premium mb-2">Sponsored</span>
            <h3 className="font-semibold text-[var(--text-primary)]">{post.title}</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">{post.orgName}</p>
            {post.ctaText && post.promoLink && (
              <a href={post.promoLink} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 px-4 py-2 bg-[var(--accent)] text-white text-sm font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors">
                {post.ctaText}
              </a>
            )}
          </div>
        </div>
      );
    default:
      return null;
  }
}
