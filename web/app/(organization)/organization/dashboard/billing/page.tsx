'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { Organization } from '@/lib/types';

const TIER_INFO: Record<string, { name: string; price: string; features: string[] }> = {
  none: { name: 'Free / Pay-per-post', price: '$0/year', features: ['$125 per standard job post', '$200 per featured job post'] },
  tier1: { name: 'Tier 1 Partner', price: '$1,250/year', features: ['Unlimited standard job posts', '2 featured job slots', '1 promotion post', 'Verified badge'] },
  tier2: { name: 'Tier 2 Premium Partner', price: '$2,500/year', features: ['Everything in Tier 1', '5 featured job slots', '3 promotion posts', 'Analytics dashboard', 'Priority support'] },
  school: { name: 'Education Partner', price: '$5,500/year', features: ['Unlimited program listings', '3 featured program slots', 'Analytics dashboard', 'Education Partner badge'] },
};

export default function BillingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<Organization | null>(null);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/login'); return; }
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/org/dashboard', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { const data = await res.json(); setOrg(data.org); }
      } catch { /* TODO */ }
      setLoading(false);
    });
    return unsub;
  }, [router]);

  const openPortal = async () => {
    if (!auth?.currentUser) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/billing/portal', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); window.location.href = data.url; }
    } catch { /* TODO */ }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>;

  const tier = org?.subscription.tier || 'none';
  const info = TIER_INFO[tier];
  const sub = org?.subscription;

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Billing</h1>

      {/* Current plan */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">Current Plan</h2>
            <p className="text-2xl font-bold text-[var(--accent)] mt-1">{info.name}</p>
            <p className="text-sm text-[var(--text-muted)]">{info.price}</p>
            {sub?.currentPeriodEnd && (
              <p className="text-xs text-[var(--text-muted)] mt-2">Renews {new Date(sub.currentPeriodEnd.seconds * 1000).toLocaleDateString('en-CA')}</p>
            )}
          </div>
          {sub?.stripeCustomerId && (
            <button onClick={openPortal} className="px-4 py-2 bg-[var(--accent)] text-white text-sm font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors">
              Manage Billing
            </button>
          )}
        </div>
        <ul className="mt-4 space-y-1">
          {info.features.map(f => (
            <li key={f} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <span className="text-[var(--success)]">✓</span> {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Usage */}
      {sub && (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-[var(--text-primary)] mb-4">Usage</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[var(--text-secondary)]">Job Posts</span>
                <span className="text-[var(--text-primary)] font-medium">{sub.jobPostsUsed} / {sub.jobPostsLimit ?? '∞'}</span>
              </div>
              {sub.jobPostsLimit && (
                <div className="w-full bg-[var(--surface-raised)] rounded-full h-2">
                  <div className="bg-[var(--accent)] h-2 rounded-full" style={{ width: `${Math.min((sub.jobPostsUsed / sub.jobPostsLimit) * 100, 100)}%` }} />
                </div>
              )}
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[var(--text-secondary)]">Featured Slots</span>
                <span className="text-[var(--text-primary)] font-medium">{sub.featuredJobsUsed} / {sub.featuredJobsTotal}</span>
              </div>
              <div className="w-full bg-[var(--surface-raised)] rounded-full h-2">
                <div className="bg-[var(--gold)] h-2 rounded-full" style={{ width: `${sub.featuredJobsTotal ? (sub.featuredJobsUsed / sub.featuredJobsTotal) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade CTA */}
      {tier === 'tier1' && (
        <div className="bg-gradient-to-r from-[var(--navy)] to-[var(--navy-light)] rounded-xl p-6 text-white">
          <h2 className="font-bold text-lg">Upgrade to Tier 2</h2>
          <p className="text-sm opacity-80 mt-1">Get analytics, more featured slots, and priority support.</p>
          <button className="mt-4 px-4 py-2 bg-white text-[var(--navy)] text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors">
            Upgrade — $2,500/year
          </button>
        </div>
      )}
      {tier === 'none' && (
        <div className="bg-gradient-to-r from-[var(--teal-dark)] to-[var(--teal)] rounded-xl p-6 text-white">
          <h2 className="font-bold text-lg">Become a Partner</h2>
          <p className="text-sm opacity-80 mt-1">Unlimited job posts, verified badge, and more.</p>
          <button className="mt-4 px-4 py-2 bg-white text-[var(--teal-dark)] text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors">
            View Plans — Starting at $1,250/year
          </button>
        </div>
      )}
    </div>
  );
}
