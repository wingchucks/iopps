'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { Post } from '@/lib/types';

export default function ShopIndigenousPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<Post[]>([]);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/login'); return; }
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/org/posts?type=business', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { const data = await res.json(); setListings(data.posts || []); }
      } catch { /* TODO */ }
      setLoading(false);
    });
    return unsub;
  }, [router]);

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Shop Indigenous</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Manage your business listings</p>
        </div>
        <a href="/dashboard/create" className="px-4 py-2 bg-[var(--accent)] text-white text-sm font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors">+ Add Listing</a>
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-16 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl">
          <div className="text-4xl mb-3">🏪</div>
          <p className="text-lg font-medium text-[var(--text-primary)]">No business listings yet</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">Add your business to the Shop Indigenous directory.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map(listing => (
            <div key={listing.id} className="card-interactive bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {listing.orgLogoURL ? (
                  <img src={listing.orgLogoURL} alt="" className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-[var(--surface-raised)] flex items-center justify-center text-lg">🏪</div>
                )}
                <div className="min-w-0">
                  <h3 className="font-medium text-[var(--text-primary)] truncate">{listing.title}</h3>
                  <p className="text-sm text-[var(--text-muted)]">{listing.businessCategory} • {listing.location.city}</p>
                </div>
              </div>
              <a href={`/dashboard/create?edit=${listing.id}`} className="px-3 py-1.5 text-xs font-medium border border-[var(--card-border)] rounded-lg hover:bg-[var(--surface-raised)] transition-colors text-[var(--text-secondary)]">Edit</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
