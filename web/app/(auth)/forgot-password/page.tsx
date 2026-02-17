'use client';

import { useState } from 'react';
import Link from 'next/link';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!auth) { setError('Firebase not configured'); return; }
    setError('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch {
      setError('Could not send reset email. Please check the address and try again.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 700, color: 'var(--navy)' }}>Check your email</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '1.5rem' }}>
          If an account exists for <strong>{email}</strong>, we sent a password reset link.
        </p>
        <Link href="/login" style={{ fontSize: '14px', color: 'var(--teal)', textDecoration: 'none' }}>← Back to sign in</Link>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 700, color: 'var(--navy)', textAlign: 'center' }}>
        Forgot your password?
      </h2>
      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 1.5rem' }}>
        Enter your email and we&apos;ll send a reset link.
      </p>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>Email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={{
            width: '100%', padding: '12px 14px', border: '1px solid var(--input-border)',
            borderRadius: '8px', fontSize: '15px', background: 'var(--card-bg)', color: 'var(--text-primary)', boxSizing: 'border-box',
          }} placeholder="you@example.com" />
        </div>
        <button type="submit" disabled={loading} style={{
          width: '100%', padding: '12px', background: 'var(--teal)', color: '#fff', border: 'none',
          borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', minHeight: '48px',
          opacity: loading ? 0.7 : 1,
        }}>
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <Link href="/login" style={{ fontSize: '14px', color: 'var(--teal)', textDecoration: 'none' }}>← Back to sign in</Link>
      </p>
    </div>
  );
}
