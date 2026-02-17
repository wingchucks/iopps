'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function MemberDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ savedCount: 0, applicationCount: 0, profileComplete: 0 });
  const [resumeUploaded, setResumeUploaded] = useState(false);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push('/login'); return; }
      // TODO: fetch actual stats from API
      setStats({ savedCount: 3, applicationCount: 1, profileComplete: 65 });
      setResumeUploaded(false);
      setLoading(false);
    });
    return unsub;
  }, [router]);

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Dashboard</h1>

      {/* Overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5">
          <p className="text-sm text-[var(--text-muted)]">Saved Items</p>
          <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">{stats.savedCount}</p>
          <a href="/dashboard/saved" className="text-sm text-[var(--accent)] hover:underline mt-2 inline-block">View saved →</a>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5">
          <p className="text-sm text-[var(--text-muted)]">Active Applications</p>
          <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">{stats.applicationCount}</p>
          <a href="/dashboard/applications" className="text-sm text-[var(--accent)] hover:underline mt-2 inline-block">View applications →</a>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5">
          <p className="text-sm text-[var(--text-muted)]">Profile Completion</p>
          <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">{stats.profileComplete}%</p>
          <div className="w-full bg-[var(--surface-raised)] rounded-full h-2 mt-2">
            <div className="bg-[var(--accent)] h-2 rounded-full transition-all" style={{ width: `${stats.profileComplete}%` }} />
          </div>
          <a href="/settings/profile" className="text-sm text-[var(--accent)] hover:underline mt-2 inline-block">Complete profile →</a>
        </div>
      </div>

      {/* Resume status */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5 mb-8">
        <h2 className="font-semibold text-[var(--text-primary)] mb-2">Resume</h2>
        {resumeUploaded ? (
          <div className="flex items-center gap-2">
            <span className="text-[var(--success)]">✓</span>
            <span className="text-sm text-[var(--text-secondary)]">Resume uploaded</span>
            <a href="/settings/resume" className="text-sm text-[var(--accent)] hover:underline ml-auto">Manage →</a>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-muted)]">No resume uploaded yet. Upload one to apply for jobs faster.</p>
            <a href="/settings/resume" className="px-4 py-2 bg-[var(--accent)] text-white text-sm font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors">Upload</a>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/dashboard/saved', label: 'Saved Items', icon: '🔖' },
          { href: '/dashboard/applications', label: 'Applications', icon: '📋' },
          { href: '/settings/profile', label: 'Edit Profile', icon: '✏️' },
          { href: '/settings/account', label: 'Account Settings', icon: '⚙️' },
        ].map(link => (
          <a key={link.href} href={link.href} className="card-interactive flex flex-col items-center gap-2 p-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl text-center hover:border-[var(--accent)]">
            <span className="text-2xl">{link.icon}</span>
            <span className="text-sm font-medium text-[var(--text-primary)]">{link.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
