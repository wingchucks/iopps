'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import FeedTabs, { type FeedTab } from '@/components/feed/FeedTabs';
import FeedCard from '@/components/feed/FeedCard';
import type { Post, ContentType } from '@/lib/types';

const TAB_TO_TYPES: Record<FeedTab, ContentType[] | null> = {
  all: null,
  jobs: ['job'],
  events: ['event'],
  scholarships: ['scholarship'],
  businesses: ['business'],
  schools: ['program'],
  livestreams: ['livestream'],
  stories: ['story'],
};

// Sidebar widget components
function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4">
      <h3 className="font-semibold text-sm text-[var(--text-primary)] mb-3">{title}</h3>
      {children}
    </div>
  );
}

export default function FeedPage() {
  const [activeTab, setActiveTab] = useState<FeedTab>('all');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);

  const fetchPosts = useCallback(async (tab: FeedTab, append = false) => {
    setLoading(true);
    try {
      const types = TAB_TO_TYPES[tab];
      const params = new URLSearchParams();
      if (types) params.set('types', types.join(','));
      if (append && posts.length) params.set('after', posts[posts.length - 1].id);

      const res = await fetch(`/api/posts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(prev => append ? [...prev, ...data.posts] : data.posts);
        setHasMore(data.hasMore ?? false);
      }
    } catch {
      // TODO: error handling
    } finally {
      setLoading(false);
    }
  }, [posts]);

  useEffect(() => {
    setPosts([]);
    fetchPosts(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Infinite scroll
  useEffect(() => {
    if (!loaderRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !loading) fetchPosts(activeTab, true); },
      { rootMargin: '200px' }
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, activeTab, fetchPosts]);

  const toggleSave = (id: string) => {
    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    // TODO: API call to save/unsave
  };

  return (
    <div className="flex gap-6">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col gap-4 w-72 flex-shrink-0 sticky top-20 self-start">
        <SidebarSection title="Featured Partners">
          <div className="space-y-2">
            <p className="text-sm text-[var(--text-muted)]">Partner listings coming soon</p>
          </div>
        </SidebarSection>
        <SidebarSection title="Saved Items">
          <p className="text-sm text-[var(--text-muted)]">{savedIds.size} saved</p>
          <a href="/dashboard/saved" className="text-sm text-[var(--accent)] hover:underline mt-1 inline-block">View all →</a>
        </SidebarSection>
        <SidebarSection title="Closing Soon">
          <p className="text-sm text-[var(--text-muted)]">Jobs & scholarships expiring within 7 days</p>
        </SidebarSection>
        <SidebarSection title="Upcoming Events">
          <p className="text-sm text-[var(--text-muted)]">Events this week</p>
        </SidebarSection>
      </aside>

      {/* Main feed */}
      <div className="flex-1 min-w-0">
        <div className="mb-4">
          <FeedTabs active={activeTab} onChange={setActiveTab} />
        </div>

        <div className="space-y-4">
          {posts.map((post, i) => (
            <div key={post.id}>
              <FeedCard post={post} onSave={toggleSave} saved={savedIds.has(post.id)} />
              {/* Mobile: inline partner card every 15 items */}
              {(i + 1) % 15 === 0 && (
                <div className="lg:hidden mt-4 p-4 bg-[var(--surface-raised)] rounded-xl border border-[var(--card-border)]">
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Featured Partner</p>
                  <p className="text-sm text-[var(--text-secondary)]">Partner content</p>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && posts.length === 0 && (
            <div className="text-center py-16">
              <p className="text-lg font-medium text-[var(--text-primary)]">No posts yet</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">Check back soon for new content</p>
            </div>
          )}

          <div ref={loaderRef} />
        </div>
      </div>
    </div>
  );
}
