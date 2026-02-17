'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { UserProfile } from '@/lib/types';

export default function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/profile/${userId}`);
        if (res.ok) { const data = await res.json(); setProfile(data.profile); }
      } catch { /* TODO */ }
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>;
  if (!profile) return <div className="text-center py-16"><p className="text-lg font-medium text-[var(--text-primary)]">Profile not found</p></div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden">
        <div className="h-24 bg-hero-gradient" />
        <div className="px-6 pb-6 -mt-10">
          {profile.photoURL ? (
            <img src={profile.photoURL} alt="" className="w-20 h-20 rounded-full border-4 border-[var(--card-bg)] object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-full border-4 border-[var(--card-bg)] bg-[var(--surface-raised)] flex items-center justify-center text-2xl font-bold text-[var(--text-muted)]">
              {profile.firstName?.charAt(0)}{profile.lastName?.charAt(0)}
            </div>
          )}
          <h1 className="text-xl font-bold text-[var(--text-primary)] mt-3">{profile.displayName}</h1>
          {profile.headline && <p className="text-[var(--text-secondary)]">{profile.headline}</p>}
          <div className="flex items-center gap-2 mt-1 text-sm text-[var(--text-muted)]">
            {profile.city && profile.province && <span>📍 {profile.city}, {profile.province}</span>}
            {profile.nation && <span>• {profile.nation}</span>}
          </div>

          {profile.bio && (
            <div className="mt-4">
              <h2 className="font-semibold text-sm text-[var(--text-primary)] mb-1">About</h2>
              <p className="text-sm text-[var(--text-secondary)]">{profile.bio}</p>
            </div>
          )}

          {profile.skills && profile.skills.length > 0 && (
            <div className="mt-4">
              <h2 className="font-semibold text-sm text-[var(--text-primary)] mb-2">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map(skill => (
                  <span key={skill} className="px-3 py-1 rounded-full text-sm bg-[var(--surface-raised)] text-[var(--text-secondary)]">{skill}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
