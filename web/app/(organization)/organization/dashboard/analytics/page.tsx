'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AnalyticsData {
  totalViews: number;
  totalApplications: number;
  viewsTrend: number;
  appsTrend: number;
  topPosts: { id: string; title: string; views: number; applications: number }[];
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [hasAccess, setHasAccess] = useState(true);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/login'); return; }
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/org/analytics', { headers: { Authorization: `Bearer ${token}` } });
        if (res.status === 403) { setHasAccess(false); }
        else if (res.ok) { setData(await res.json()); }
      } catch { /* TODO */ }
      setLoading(false);
    });
    return unsub;
  }, [router]);

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>;

  if (!hasAccess) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">📈</div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Analytics</h1>
        <p className="text-[var(--text-muted)] mt-2">Analytics is available for Tier 2 and Education partners.</p>
        <a href="/dashboard/billing" className="inline-block mt-4 px-4 py-2 bg-[var(--accent)] text-white text-sm font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors">Upgrade Plan</a>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Analytics</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5">
          <p className="text-sm text-[var(--text-muted)]">Total Views</p>
          <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">{data?.totalViews?.toLocaleString() || 0}</p>
          {data?.viewsTrend !== undefined && (
            <p className={`text-sm mt-1 ${data.viewsTrend >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
              {data.viewsTrend >= 0 ? '↑' : '↓'} {Math.abs(data.viewsTrend)}% this month
            </p>
          )}
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5">
          <p className="text-sm text-[var(--text-muted)]">Total Applications</p>
          <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">{data?.totalApplications || 0}</p>
          {data?.appsTrend !== undefined && (
            <p className={`text-sm mt-1 ${data.appsTrend >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
              {data.appsTrend >= 0 ? '↑' : '↓'} {Math.abs(data.appsTrend)}% this month
            </p>
          )}
        </div>
      </div>

      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5">
        <h2 className="font-semibold text-[var(--text-primary)] mb-4">Top Performing Posts</h2>
        {!data?.topPosts?.length ? (
          <p className="text-sm text-[var(--text-muted)]">No data yet.</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide pb-2 border-b border-[var(--card-border)]">
              <span>Post</span><span className="text-right">Views</span><span className="text-right">Applications</span>
            </div>
            {data.topPosts.map(post => (
              <div key={post.id} className="grid grid-cols-3 py-2 border-b border-[var(--card-border)] last:border-0">
                <span className="text-sm text-[var(--text-primary)] truncate">{post.title}</span>
                <span className="text-sm text-[var(--text-secondary)] text-right">{post.views.toLocaleString()}</span>
                <span className="text-sm text-[var(--text-secondary)] text-right">{post.applications}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
