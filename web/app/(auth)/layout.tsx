'use client';

import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      background: 'var(--background)',
    }}>
      <div style={{ padding: '2rem 0 1rem' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: 'var(--navy)',
            margin: 0,
          }}>
            <span style={{ color: 'var(--teal)' }}>I</span>OPPS
          </h1>
        </Link>
      </div>
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        padding: '1rem',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}
