'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { sendEmailVerification, onAuthStateChanged, reload } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const checkVerified = useCallback(async () => {
    if (!auth?.currentUser) return;
    await reload(auth.currentUser);
    if (auth.currentUser.emailVerified) {
      router.push('/setup');
    }
  }, [router]);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, user => {
      if (!user) { router.push('/login'); return; }
      setEmail(user.email || '');
      if (user.emailVerified) { router.push('/setup'); }
    });
    return unsub;
  }, [router]);

  useEffect(() => {
    const interval = setInterval(checkVerified, 5000);
    return () => clearInterval(interval);
  }, [checkVerified]);

  async function resend() {
    if (!auth?.currentUser) return;
    setError('');
    try {
      await sendEmailVerification(auth.currentUser);
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } catch {
      setError('Could not resend. Please wait a moment and try again.');
    }
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✉️</div>
      <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 700, color: 'var(--navy)' }}>
        Check your email
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '1.5rem' }}>
        We sent a verification link to<br />
        <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
      </p>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {sent && (
        <div style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--success)', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', marginBottom: '1rem' }}>
          Verification email resent!
        </div>
      )}

      <button onClick={resend} style={{
        width: '100%', padding: '12px', background: 'var(--card-bg)', color: 'var(--teal)',
        border: '1px solid var(--teal)', borderRadius: '8px', fontSize: '15px', fontWeight: 600,
        cursor: 'pointer', minHeight: '48px', marginBottom: '1rem',
      }}>
        Resend verification email
      </button>

      <Link href="/login" style={{ fontSize: '14px', color: 'var(--teal)', textDecoration: 'none' }}>
        ← Back to sign in
      </Link>
    </div>
  );
}
