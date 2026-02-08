'use client';

import { useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

/**
 * Legacy /member/dashboard redirect page.
 *
 * Maps old dashboard tab URLs to new profile-hub routes:
 *   - ?tab=applications  → /member/[userId]?tab=applications
 *   - ?tab=messages      → /member/messages
 *   - ?tab=settings      → /member/settings
 *   - ?tab=profile       → /member/[userId]
 *   - ?tab=alerts        → /member/alerts
 *   - (default)          → /member/[userId]
 */
function DashboardRedirectContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login?redirect=/member/dashboard');
      return;
    }

    const tab = searchParams.get('tab');
    const userId = user.uid;

    switch (tab) {
      case 'applications':
        router.replace(`/member/${userId}?tab=applications`);
        break;
      case 'messages': {
        const conversationId = searchParams.get('conversation');
        if (conversationId) {
          router.replace(`/member/messages?id=${conversationId}`);
        } else {
          router.replace('/member/messages');
        }
        break;
      }
      case 'settings':
        router.replace('/member/settings');
        break;
      case 'alerts':
      case 'job-alerts':
        router.replace('/member/alerts');
        break;
      case 'profile':
        router.replace(`/member/${userId}`);
        break;
      case 'saved-jobs':
      case 'saved':
        router.replace('/saved');
        break;
      case 'training':
        router.replace(`/member/${userId}?tab=training`);
        break;
      case 'analytics':
        router.replace(`/member/${userId}?tab=analytics`);
        break;
      case 'discover':
        router.replace('/members/discover');
        break;
      default:
        // No tab or unrecognized tab → go to profile hub
        router.replace(`/member/${userId}`);
        break;
    }
  }, [user, loading, router, searchParams]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <p className="text-sm text-[var(--text-muted)]">Redirecting...</p>
      </div>
    </div>
  );
}

export default function MemberDashboardRedirect() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    }>
      <DashboardRedirectContent />
    </Suspense>
  );
}
