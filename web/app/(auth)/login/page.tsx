'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '1px solid var(--input-border)',
  borderRadius: '8px',
  fontSize: '15px',
  background: 'var(--card-bg)',
  color: 'var(--text-primary)',
  boxSizing: 'border-box',
};

const btnPrimary: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  background: 'var(--teal)',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: 600,
  cursor: 'pointer',
  minHeight: '48px',
};

const btnGoogle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  background: 'var(--card-bg)',
  color: 'var(--text-primary)',
  border: '1px solid var(--input-border)',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  minHeight: '48px',
};

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 010-9.18l-7.98-6.19a24.02 24.02 0 000 21.56l7.98-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

async function checkProfileComplete(uid: string): Promise<boolean> {
  if (!db) return false;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() && snap.data()?.profileComplete === true;
  } catch {
    return false;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRedirect(uid: string) {
    const complete = await checkProfileComplete(uid);
    router.push(complete ? '/feed' : '/setup');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!auth) { setError('Firebase not configured'); return; }
    setError('');
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await handleRedirect(cred.user.uid);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (!auth) { setError('Firebase not configured'); return; }
    setError('');
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await handleRedirect(cred.user.uid);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code !== 'auth/popup-closed-by-user') {
        setError('Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', fontWeight: 700, color: 'var(--navy)', textAlign: 'center' }}>
        Sign in to IOPPS
      </h2>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>Email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} placeholder="you@example.com" />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>Password</label>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} placeholder="••••••••" />
        </div>
        <div style={{ textAlign: 'right' }}>
          <Link href="/forgot-password" style={{ fontSize: '14px', color: 'var(--teal)', textDecoration: 'none' }}>Forgot password?</Link>
        </div>
        <button type="submit" disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '1.25rem 0', color: 'var(--text-muted)', fontSize: '14px' }}>
        <div style={{ flex: 1, height: '1px', background: 'var(--card-border)' }} />
        or
        <div style={{ flex: 1, height: '1px', background: 'var(--card-border)' }} />
      </div>

      <button onClick={handleGoogle} disabled={loading} style={btnGoogle}>
        <GoogleIcon /> Sign in with Google
      </button>

      <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '14px', color: 'var(--text-secondary)' }}>
        Don&apos;t have an account?{' '}
        <Link href="/signup" style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>Sign up</Link>
      </p>
    </div>
  );
}
