'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { Post, PostStatus } from '@/lib/types';

const FILTER_TABS: { key: PostStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'draft', label: 'Draft' },
  { key: 'expired', label: 'Expired' },
  { key: 'hidden', label: 'Hidden' },
];

const STATUS_STYLES: Record<PostStatus, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  hidden: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

export default function ManagePostsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState<PostStatus | 'all'>('all');

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/login'); return; }
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/org/posts', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { const data = await res.json(); setPosts(data.posts || []); }
      } catch { /* TODO */ }
      setLoading(false);
    });
    return unsub;
  }, [router]);

  const filtered = filter === 'all' ? posts : posts.filter(p => p.status === filter);

  const toggleVisibility = async (postId: string, currentStatus: PostStatus) => {
    if (!auth?.currentUser) return;
    const newStatus = currentStatus === 'hidden' ? 'active' : 'hidden';
    try {
      const token = await auth.currentUser.getIdToken();
      await fetch(`/api/jobs/${postId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: newStatus } : p));
    } catch { /* TODO */ }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Manage Posts</h1>
        <a href="/dashboard/create" className="px-4 py-2 bg-[var(--accent)] text-white text-sm font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors">+ New Post</a>
      </div>

      <div className="flex gap-1 overflow-x-auto mb-6 pb-1" style={{ scrollbarWidth: 'none' }}>
        {FILTER_TABS.map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)} className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filter === tab.key ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl">
          <p className="text-lg font-medium text-[var(--text-primary)]">No posts</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">Create your first post to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(post => (
            <div key={post.id} className="card-interactive bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[post.status]}`}>{post.status}</span>
                    {post.featured && <span className="badge-featured">Featured</span>}
                  </div>
                  <h3 className="font-semibold text-[var(--text-primary)] truncate">{post.title}</h3>
                  <p className="text-sm text-[var(--text-muted)]">{post.type} • {post.location.city}, {post.location.province}</p>
                  {post.type === 'job' && post.applicationCount !== undefined && (
                    <a href={`/dashboard/posts/${post.id}/applicants`} className="text-sm text-[var(--accent)] hover:underline mt-1 inline-block">
                      {post.applicationCount} applicant{post.applicationCount !== 1 ? 's' : ''} →
                    </a>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => toggleVisibility(post.id, post.status)} className="px-3 py-1.5 text-xs font-medium border border-[var(--card-border)] rounded-lg hover:bg-[var(--surface-raised)] transition-colors text-[var(--text-secondary)]">
                    {post.status === 'hidden' ? 'Restore' : 'Hide'}
                  </button>
                  <a href={`/dashboard/create?edit=${post.id}`} className="px-3 py-1.5 text-xs font-medium border border-[var(--card-border)] rounded-lg hover:bg-[var(--surface-raised)] transition-colors text-[var(--text-secondary)]">
                    Edit
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
