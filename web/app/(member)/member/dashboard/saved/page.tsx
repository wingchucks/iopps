'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import FeedCard from '@/components/feed/FeedCard';
import type { Post, ContentType } from '@/lib/types';

const SAVED_TABS: { key: ContentType | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'job', label: 'Jobs' },
  { key: 'event', label: 'Events' },
  { key: 'scholarship', label: 'Scholarships' },
  { key: 'business', label: 'Businesses' },
  { key: 'program', label: 'Programs' },
];

export default function SavedItemsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<ContentType | 'all'>('all');

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/login'); return; }
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/bookmarks', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { const data = await res.json(); setSavedPosts(data.posts || []); }
      } catch { /* TODO */ }
      setLoading(false);
    });
    return unsub;
  }, [router]);

  const filtered = activeTab === 'all' ? savedPosts : savedPosts.filter(p => p.type === activeTab);

  const handleRemove = (id: string) => {
    setSavedPosts(prev => prev.filter(p => p.id !== id));
    // TODO: API call to remove bookmark
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Saved Items</h1>

      <div className="flex gap-1 overflow-x-auto mb-6 pb-1" style={{ scrollbarWidth: 'none' }}>
        {SAVED_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.key
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl">
          <p className="text-lg font-medium text-[var(--text-primary)]">No saved items</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">Bookmark items from the feed to see them here.</p>
          <a href="/" className="inline-block mt-4 px-4 py-2 bg-[var(--accent)] text-white text-sm font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors">Browse Feed</a>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(post => (
            <FeedCard key={post.id} post={post} onSave={handleRemove} saved={true} />
          ))}
        </div>
      )}
    </div>
  );
}
