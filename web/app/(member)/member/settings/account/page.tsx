'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, updateEmail, updatePassword, deleteUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function AccountSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [digestFreq, setDigestFreq] = useState<'daily' | 'weekly' | 'off'>('weekly');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/login'); return; }
      setEmail(user.email || '');
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/member/profile', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          if (data.emailDigest?.frequency) setDigestFreq(data.emailDigest.frequency);
        }
      } catch { /* failed to load profile */ }
      setLoading(false);
    });
    return unsub;
  }, [router]);

  const handleUpdateEmail = async () => {
    if (!auth?.currentUser || !email) return;
    setSaving(true);
    try {
      await updateEmail(auth.currentUser, email);
      setMessage('Email updated');
    } catch { setMessage('Failed to update email. You may need to re-authenticate.'); }
    setSaving(false);
  };

  const handleUpdatePassword = async () => {
    if (!auth?.currentUser || !newPassword) return;
    setSaving(true);
    try {
      await updatePassword(auth.currentUser, newPassword);
      setNewPassword('');
      setMessage('Password updated');
    } catch { setMessage('Failed to update password. You may need to re-authenticate.'); }
    setSaving(false);
  };

  const handleDeleteAccount = async () => {
    if (!auth?.currentUser) return;
    if (!confirm('Are you sure? This action cannot be undone.')) return;
    try {
      await deleteUser(auth.currentUser);
      router.push('/');
    } catch { setMessage('Failed to delete account. You may need to re-authenticate.'); }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Account Settings</h1>

      {message && (
        <div className="mb-4 p-3 bg-[var(--accent-light)] text-[var(--accent)] text-sm rounded-lg">{message}</div>
      )}

      <div className="space-y-6">
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-[var(--text-primary)]">Email</h2>
          <div className="flex gap-3">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="flex-1 px-3 py-2 bg-[var(--background)] border border-[var(--input-border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--input-focus)] outline-none" />
            <button onClick={handleUpdateEmail} disabled={saving} className="px-4 py-2 bg-[var(--accent)] text-white text-sm font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50">Update</button>
          </div>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-[var(--text-primary)]">Password</h2>
          <div className="flex gap-3">
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" className="flex-1 px-3 py-2 bg-[var(--background)] border border-[var(--input-border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--input-focus)] outline-none" />
            <button onClick={handleUpdatePassword} disabled={saving || !newPassword} className="px-4 py-2 bg-[var(--accent)] text-white text-sm font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50">Update</button>
          </div>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-[var(--text-primary)]">Email Digest</h2>
          <div className="flex gap-2">
            {(['daily', 'weekly', 'off'] as const).map(freq => (
              <button key={freq} onClick={() => setDigestFreq(freq)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${digestFreq === freq ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-raised)] text-[var(--text-secondary)]'}`}>
                {freq.charAt(0).toUpperCase() + freq.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[var(--card-bg)] border border-red-200 dark:border-red-900/50 rounded-xl p-5">
          <h2 className="font-semibold text-[var(--danger)] mb-2">Danger Zone</h2>
          <p className="text-sm text-[var(--text-muted)] mb-4">Permanently delete your account and all associated data.</p>
          <button onClick={handleDeleteAccount} className="px-4 py-2 bg-[var(--danger)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-colors">Delete Account</button>
        </div>
      </div>
    </div>
  );
}
