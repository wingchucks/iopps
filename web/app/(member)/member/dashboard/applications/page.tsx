'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { Application, ApplicationStatus } from '@/lib/types';

const STATUS_STYLES: Record<ApplicationStatus, { bg: string; text: string; label: string }> = {
  submitted: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'Submitted' },
  viewed: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', label: 'Viewed' },
  under_review: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'Under Review' },
  interview: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-400', label: 'Interview' },
  offered: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Offered' },
  rejected: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Rejected' },
};

export default function ApplicationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/login'); return; }
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/applications', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { const data = await res.json(); setApplications(data.applications || []); }
      } catch { /* TODO */ }
      setLoading(false);
    });
    return unsub;
  }, [router]);

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">My Applications</h1>

      {applications.length === 0 ? (
        <div className="text-center py-16 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl">
          <p className="text-lg font-medium text-[var(--text-primary)]">No applications yet</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">When you apply for jobs, they&apos;ll appear here.</p>
          <a href="/" className="inline-block mt-4 px-4 py-2 bg-[var(--accent)] text-white text-sm font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors">Browse Jobs</a>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map(app => {
            const style = STATUS_STYLES[app.status];
            return (
              <div key={app.id} className="card-interactive bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[var(--text-primary)] truncate">{app.jobTitle}</h3>
                    <p className="text-sm text-[var(--text-secondary)]">{app.orgName}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Applied {new Date(app.createdAt.seconds * 1000).toLocaleDateString('en-CA')}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                    {style.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
