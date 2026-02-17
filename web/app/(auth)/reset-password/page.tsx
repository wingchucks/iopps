'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[400px] items-center justify-center"><div className="text-[var(--text-muted)]">Loading...</div></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get('oobCode') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validCode, setValidCode] = useState<boolean | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!auth || !oobCode) { setValidCode(false); return; }
    verifyPasswordResetCode(auth, oobCode)
      .then(() => setValidCode(true))
      .catch(() => setValidCode(false));
  }, [oobCode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!auth) return;
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setError('');
    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setDone(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch {
      setError('Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  if (validCode === null) return <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Verifying…</p>;

  if (validCode === false) {
    return (
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ color: 'var(--navy)', marginBottom: '0.5rem' }}>Invalid or expired link</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '1rem' }}>Please request a new password reset.</p>
        <Link href="/forgot-password" style={{ color: 'var(--teal)', textDecoration: 'none' }}>Request new link</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
        <h2 style={{ color: 'var(--navy)', marginBottom: '0.5rem' }}>Password reset!</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Redirecting to sign in…</p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', fontWeight: 700, color: 'var(--navy)', textAlign: 'center' }}>
        Set new password
      </h2>
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', marginBottom: '1rem' }}>{error}</div>
      )}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>New Password</label>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} minLength={8}
            style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--input-border)', borderRadius: '8px', fontSize: '15px', background: 'var(--card-bg)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
            placeholder="Min 8 characters" />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>Confirm Password</label>
          <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--input-border)', borderRadius: '8px', fontSize: '15px', background: 'var(--card-bg)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
            placeholder="Repeat password" />
        </div>
        <button type="submit" disabled={loading} style={{
          width: '100%', padding: '12px', background: 'var(--teal)', color: '#fff', border: 'none',
          borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', minHeight: '48px', opacity: loading ? 0.7 : 1,
        }}>
          {loading ? 'Resetting…' : 'Reset password'}
        </button>
      </form>
    </div>
  );
}
