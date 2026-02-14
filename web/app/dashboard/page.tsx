'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function DashboardRedirect() {
  const router = useRouter();
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }

    switch (role) {
      case 'admin':
      case 'moderator':
        router.replace('/admin');
        break;
      case 'employer':
        router.replace('/org/dashboard');
        break;
      default:
        router.replace('/discover');
    }
  }, [user, role, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-[var(--text-muted)]">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
