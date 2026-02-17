'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { Organization, Application } from '@/lib/types';

const TIER_LABELS: Record<string, { label: string; class: string }> = {
  none: { label: 'Free', class: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  tier1: { label: 'Tier 1', class: 'bg-[var(--accent-light)] text-[var(--accent)]' },
  tier2: { label: 'Tier 2', class: 'badge-premium' },
  school: { label: 'Education', class: 'badge-education' },
};

export default function OrgDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<Organization | null>(null);
  const [stats, setStats] = useState({ activePosts: 0, totalApps: 0, views: 0 });
  const [recentApps, setRecentApps] = useState<Application[]>([]);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/login'); return; }
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/org/dashboard', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setOrg(data.org);
          setStats(data.stats || { activePosts: 0, totalApps: 0, views: 0 });
          setRecentApps(data.recentApplications || []);
        }
      } catch { /* TODO */ }
      setLoading(false);
    });
    return unsub;
  }, [router]);

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>;

  const tier = TIER_LABELS[org?.subscription.tier || 'none'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{org?.name || 'Organization'} Dashboard</h1>
          {tier && <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${tier.class}`}>{tier.label}</span>}
        </div>
        <a href="/dashboard/create" className="px-4 py-2 bg-[var(--accent)] text-white text-sm font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors">+ Create Post</a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5">
          <p className="text-sm text-[var(--text-muted)]">Active Posts</p>
          <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">{stats.activePosts}</p>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5">
          <p className="text-sm text-[var(--text-muted)]">Total Applications</p>
          <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">{stats.totalApps}</p>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5">
          <p className="text-sm text-[var(--text-muted)]">Total Views</p>
          <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">{stats.views.toLocaleString()}</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        {[
          { href: '/dashboard/create', label: 'Post Job', icon: '💼' },
          { href: '/dashboard/posts', label: 'View Applications', icon: '📋' },
          { href: '/dashboard/posts', label: 'Manage Listings', icon: '📝' },
        ].map(action => (
          <a key={action.label} href={action.href} className="card-interactive flex flex-col items-center gap-2 p-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl text-center">
            <span className="text-2xl">{action.icon}</span>
            <span className="text-sm font-medium text-[var(--text-primary)]">{action.label}</span>
          </a>
        ))}
      </div>

      {/* Recent applications */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5">
        <h2 className="font-semibold text-[var(--text-primary)] mb-4">Recent Applications</h2>
        {recentApps.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No applications yet.</p>
        ) : (
          <div className="space-y-3">
            {recentApps.slice(0, 5).map(app => (
              <div key={app.id} className="flex items-center justify-between py-2 border-b border-[var(--card-border)] last:border-0">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{app.applicantName}</p>
                  <p className="text-xs text-[var(--text-muted)]">{app.jobTitle}</p>
                </div>
                <span className="text-xs text-[var(--text-muted)]">{new Date(app.createdAt.seconds * 1000).toLocaleDateString('en-CA')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
