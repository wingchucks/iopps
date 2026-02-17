'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import type { AccountType } from '@/lib/types';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', border: '1px solid var(--input-border)',
  borderRadius: '8px', fontSize: '15px', background: 'var(--card-bg)', color: 'var(--text-primary)', boxSizing: 'border-box',
};
const btnPrimary: React.CSSProperties = {
  width: '100%', padding: '12px', background: 'var(--teal)', color: '#fff', border: 'none',
  borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', minHeight: '48px',
};
const btnGoogle: React.CSSProperties = {
  width: '100%', padding: '12px', background: 'var(--card-bg)', color: 'var(--text-primary)',
  border: '1px solid var(--input-border)', borderRadius: '8px', fontSize: '15px', fontWeight: 500,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: '48px',
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

async function createUserDoc(uid: string, data: { email: string; firstName: string; lastName: string; accountType: AccountType }) {
  if (!db) return;
  await setDoc(doc(db, 'users', uid), {
    uid,
    email: data.email,
    accountType: data.accountType,
    role: 'member',
    firstName: data.firstName,
    lastName: data.lastName,
    displayName: `${data.firstName} ${data.lastName}`,
    photoURL: null,
    profileComplete: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
    disabled: false,
  });
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<'type' | 'form'>('type');
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function selectType(t: AccountType) {
    setAccountType(t);
    setStep('form');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!auth || !accountType) return;
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setError('');
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: `${firstName} ${lastName}` });
      await createUserDoc(cred.user.uid, { email, firstName, lastName, accountType });
      await sendEmailVerification(cred.user);
      router.push('/verify-email');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/email-already-in-use') setError('An account with this email already exists.');
      else if (code === 'auth/weak-password') setError('Password is too weak.');
      else setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (!auth || !accountType) return;
    setError('');
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const u = cred.user;
      const names = (u.displayName || '').split(' ');
      await createUserDoc(u.uid, {
        email: u.email || '',
        firstName: names[0] || '',
        lastName: names.slice(1).join(' ') || '',
        accountType,
      });
      router.push('/setup');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code !== 'auth/popup-closed-by-user') setError('Google sign-up failed.');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'type') {
    const cardBase: React.CSSProperties = {
      padding: '1.5rem', borderRadius: '10px', border: '2px solid var(--card-border)',
      cursor: 'pointer', textAlign: 'center', transition: 'border-color 0.2s, box-shadow 0.2s',
      minHeight: '48px', background: 'var(--card-bg)',
    };
    return (
      <div>
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 700, color: 'var(--navy)', textAlign: 'center' }}>
          Create your account
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 1.5rem' }}>
          How will you use IOPPS?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button onClick={() => selectType('community_member')} style={cardBase}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--teal)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--card-border)'; }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👤</div>
            <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--navy)', marginBottom: '4px' }}>Community Member</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Free — for individuals seeking jobs, events, scholarships & more</div>
          </button>
          <button onClick={() => selectType('organization')} style={cardBase}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--teal)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--card-border)'; }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏢</div>
            <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--navy)', marginBottom: '4px' }}>Organization</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>For employers, schools, businesses & Band Councils</div>
          </button>
        </div>
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => setStep('type')} style={{ background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', fontSize: '14px', padding: 0, marginBottom: '1rem' }}>
        ← Change account type
      </button>
      <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', fontWeight: 700, color: 'var(--navy)', textAlign: 'center' }}>
        Sign up as {accountType === 'community_member' ? 'Community Member' : 'Organization'}
      </h2>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>First Name</label>
            <input required value={firstName} onChange={e => setFirstName(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>Last Name</label>
            <input required value={lastName} onChange={e => setLastName(e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>Email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} placeholder="you@example.com" />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>Password</label>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} placeholder="Min 8 characters" minLength={8} />
          <span style={{ fontSize: '12px', color: password.length >= 8 ? 'var(--success)' : 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
            {password.length >= 8 ? '✓' : '○'} At least 8 characters
          </span>
        </div>
        <button type="submit" disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Creating account…' : 'Sign up'}
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '1.25rem 0', color: 'var(--text-muted)', fontSize: '14px' }}>
        <div style={{ flex: 1, height: '1px', background: 'var(--card-border)' }} />
        or
        <div style={{ flex: 1, height: '1px', background: 'var(--card-border)' }} />
      </div>

      <button onClick={handleGoogle} disabled={loading} style={btnGoogle}>
        <GoogleIcon /> Sign up with Google
      </button>

      <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '14px', color: 'var(--text-secondary)' }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
      </p>
    </div>
  );
}
