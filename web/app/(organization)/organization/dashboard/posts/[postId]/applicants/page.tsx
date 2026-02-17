'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { Application, ApplicationStatus } from '@/lib/types';

const STATUS_OPTIONS: ApplicationStatus[] = ['submitted', 'viewed', 'under_review', 'interview', 'offered', 'rejected'];
const STATUS_STYLES: Record<ApplicationStatus, string> = {
  submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  viewed: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  under_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  interview: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  offered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};
const STATUS_LABELS: Record<ApplicationStatus, string> = {
  submitted: 'Submitted', viewed: 'Viewed', under_review: 'Under Review',
  interview: 'Interview', offered: 'Offered', rejected: 'Rejected',
};

export default function ApplicantsPage() {
  const router = useRouter();
  const { postId } = useParams<{ postId: string }>();
  const [loading, setLoading] = useState(true);
  const [applicants, setApplicants] = useState<Application[]>([]);
  const [jobTitle, setJobTitle] = useState('');

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/login'); return; }
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/org/posts/${postId}/applicants`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { const data = await res.json(); setApplicants(data.applicants || []); setJobTitle(data.jobTitle || ''); }
      } catch { /* TODO */ }
      setLoading(false);
    });
    return unsub;
  }, [router, postId]);

  const updateStatus = async (appId: string, status: ApplicationStatus) => {
    if (!auth?.currentUser) return;
    try {
      const token = await auth.currentUser.getIdToken();
      await fetch(`/api/applications/${appId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      setApplicants(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
    } catch { /* TODO */ }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <a href="/dashboard/posts" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">← Posts</a>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Applicants{jobTitle ? ` — ${jobTitle}` : ''}</h1>
      </div>

      {applicants.length === 0 ? (
        <div className="text-center py-16 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl">
          <p className="text-lg font-medium text-[var(--text-primary)]">No applicants yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {applicants.map(app => (
            <div key={app.id} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-[var(--text-primary)]">{app.applicantName}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{app.applicantEmail}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Applied {new Date(app.createdAt.seconds * 1000).toLocaleDateString('en-CA')}</p>
                  {app.coverMessage && <p className="text-sm text-[var(--text-secondary)] mt-2 line-clamp-2">{app.coverMessage}</p>}
                  <div className="flex gap-2 mt-2">
                    {app.resumeURL && <a href={app.resumeURL} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--accent)] hover:underline">View Resume</a>}
                  </div>
                </div>
                <select
                  value={app.status}
                  onChange={e => updateStatus(app.id, e.target.value as ApplicationStatus)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${STATUS_STYLES[app.status]}`}
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
