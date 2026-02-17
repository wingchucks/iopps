'use client';

import { useRef, useState, useEffect } from 'react';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'events', label: 'Events' },
  { key: 'scholarships', label: 'Scholarships & Grants' },
  { key: 'businesses', label: 'Businesses' },
  { key: 'schools', label: 'Schools' },
  { key: 'livestreams', label: 'Livestreams' },
  { key: 'stories', label: 'Success Stories' },
] as const;

export type FeedTab = (typeof TABS)[number]['key'];

interface FeedTabsProps {
  active: FeedTab;
  onChange: (tab: FeedTab) => void;
  liveCounts?: Partial<Record<FeedTab, number>>;
}

export default function FeedTabs({ active, onChange, liveCounts }: FeedTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    el?.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    return () => {
      el?.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  return (
    <div className="relative">
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[var(--background)] to-transparent z-10 pointer-events-none" />
      )}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[var(--background)] to-transparent z-10 pointer-events-none" />
      )}
      <div
        ref={scrollRef}
        className="flex gap-1 overflow-x-auto scrollbar-none pb-1 -mb-px"
        style={{ scrollbarWidth: 'none' }}
      >
        {TABS.map((tab) => {
          const isActive = active === tab.key;
          const count = liveCounts?.[tab.key];
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`
                flex-shrink-0 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap
                ${isActive
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]'
                }
              `}
            >
              {tab.label}
              {tab.key === 'livestreams' && count && count > 0 && (
                <span className="ml-1.5 inline-flex items-center gap-1">
                  <span className="live-dot" />
                  <span className="text-xs">{count}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
