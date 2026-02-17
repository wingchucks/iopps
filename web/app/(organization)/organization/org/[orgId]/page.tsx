'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import FeedCard from '@/components/feed/FeedCard';
import type { Organization, Post } from '@/lib/types';

export default function PublicOrgPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<Organization | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [orgRes, postsRes] = await Promise.all([
          fetch(`/api/org/${orgId}`),
          fetch(`/api/jobs?orgId=${orgId}&status=active`),
        ]);
        if (orgRes.ok) setOrg((await orgRes.json()).org);
        if (postsRes.ok) setPosts((await postsRes.json()).posts || []);
      } catch { /* TODO */ }
      setLoading(false);
    })();
  }, [orgId]);

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>;
  if (!org) return <div className="text-center py-16"><p className="text-lg font-medium text-[var(--text-primary)]">Organization not found</p></div>;

  const tierBadge = org.subscription.tier === 'tier2' ? 'badge-premium' : org.subscription.tier === 'school' ? 'badge-education' : org.verification === 'verified' ? 'badge-verified' : null;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden mb-6">
        <div className="h-28 bg-hero-gradient" />
        <div className="px-6 pb-6 -mt-12">
          {org.logoURL ? (
            <img src={org.logoURL} alt="" className="w-24 h-24 rounded-xl border-4 border-[var(--card-bg)] object-cover bg-white" />
          ) : (
            <div className="w-24 h-24 rounded-xl border-4 border-[var(--card-bg)] bg-[var(--surface-raised)] flex items-center justify-center text-3xl font-bold text-[var(--text-muted)]">
              {org.name?.charAt(0)}
            </div>
          )}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">{org.name}</h1>
            {tierBadge && <span className={tierBadge}>{org.subscription.tier === 'tier2' ? '⭐ Premium' : org.subscription.tier === 'school' ? '🎓 Education' : '✓ Verified'}</span>}
            {org.indigenousOwned && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">🪶 Indigenous-Owned</span>
            )}
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{org.industry} • {org.city}, {org.province}</p>
          {org.website && <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--accent)] hover:underline mt-1 inline-block">{org.website}</a>}
          {org.description && <p className="text-sm text-[var(--text-secondary)] mt-3">{org.description}</p>}
        </div>
      </div>

      {posts.length > 0 && (
        <div>
          <h2 className="font-semibold text-[var(--text-primary)] mb-4">Active Listings</h2>
          <div className="space-y-4">
            {posts.map(post => <FeedCard key={post.id} post={post} />)}
          </div>
        </div>
      )}
    </div>
  );
}
