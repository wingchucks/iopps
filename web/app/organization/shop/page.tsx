'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { getVendorByUserId } from '@/lib/firebase/shop';

export default function ShopRedirect() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkVendor() {
      if (authLoading) return;

      if (!user) {
        router.push('/login?redirect=/organization/shop');
        return;
      }

      // Community members cannot access shop - let them see the upgrade prompt
      if (role === 'community') {
        setChecking(false);
        return;
      }

      try {
        await getVendorByUserId(user.uid);
        // Dashboard handles both existing vendors and new vendor registration
        router.push('/organization/shop/dashboard');
      } catch {
        // On error, go to dashboard which will handle auth/redirect
        router.push('/organization/shop/dashboard');
      } finally {
        setChecking(false);
      }
    }

    checkVendor();
  }, [user, role, authLoading, router]);

  if (authLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  // Show upgrade prompt for community members
  if (role === 'community') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Employer Account Required</h1>
        <p className="text-sm text-slate-300">
          To list your business on Shop Indigenous, you need an employer account.
        </p>
        <div className="flex gap-3">
          <Link
            href="/organization/register"
            className="inline-block rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors"
          >
            Register as Employer
          </Link>
          <Link
            href="/business"
            className="inline-block rounded-md border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Browse Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
