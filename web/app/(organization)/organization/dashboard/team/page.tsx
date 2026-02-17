'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { TeamRole } from '@/lib/types';

interface TeamMember { uid: string; email: string; role: TeamRole; displayName?: string; }

export default function TeamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/login'); return; }
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/org/team', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { const data = await res.json(); setMembers(data.members || []); }
      } catch { /* TODO */ }
      setLoading(false);
    });
    return unsub;
  }, [router]);

  const handleInvite = async () => {
    if (!auth?.currentUser || !inviteEmail) return;
    setInviting(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/org/team/invite', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      });
      if (res.ok) { const data = await res.json(); setMembers(prev => [...prev, data.member]); setInviteEmail(''); }
    } catch { /* TODO */ }
    setInviting(false);
  };

  const handleRemove = async (uid: string) => {
    if (!auth?.currentUser || !confirm('Remove this team member?')) return;
    try {
      const token = await auth.currentUser.getIdToken();
      await fetch(`/api/org/team/${uid}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      setMembers(prev => prev.filter(m => m.uid !== uid));
    } catch { /* TODO */ }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Team Management</h1>

      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-[var(--text-primary)] mb-3">Invite Team Member</h2>
        <p className="text-sm text-[var(--text-muted)] mb-3">Max 5 team members. Invitees must have an IOPPS account.</p>
        <div className="flex gap-3">
          <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@example.com" className="flex-1 px-3 py-2 bg-[var(--background)] border border-[var(--input-border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--input-focus)] outline-none" disabled={members.length >= 5} />
          <button onClick={handleInvite} disabled={inviting || !inviteEmail || members.length >= 5} className="px-4 py-2 bg-[var(--accent)] text-white text-sm font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50">
            {inviting ? 'Inviting...' : 'Invite'}
          </button>
        </div>
        {members.length >= 5 && <p className="text-xs text-[var(--warning)] mt-2">Maximum team size reached.</p>}
      </div>

      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5">
        <h2 className="font-semibold text-[var(--text-primary)] mb-4">Members ({members.length}/5)</h2>
        {members.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No team members yet.</p>
        ) : (
          <div className="space-y-3">
            {members.map(m => (
              <div key={m.uid} className="flex items-center justify-between py-2 border-b border-[var(--card-border)] last:border-0">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{m.displayName || m.email}</p>
                  <p className="text-xs text-[var(--text-muted)]">{m.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${m.role === 'admin' ? 'bg-[var(--accent-light)] text-[var(--accent)]' : 'bg-[var(--surface-raised)] text-[var(--text-secondary)]'}`}>
                    {m.role}
                  </span>
                  {m.role !== 'admin' && (
                    <button onClick={() => handleRemove(m.uid)} className="text-xs text-[var(--danger)] hover:underline">Remove</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
