'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { getVendorByUserId } from '@/lib/firebase/shop';
import type { Vendor } from '@/lib/types';

export default function ShopRedirect() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkVendor() {
      if (authLoading) return;

      if (!user) {
        router.push('/login?redirect=/organization/shop');
        return;
      }

      try {
        const vendor = await getVendorByUserId(user.uid);
        if (vendor) {
          router.push('/organization/shop/dashboard');
        } else {
          router.push('/organization/shop/dashboard');
        }
      } catch (error) {
        console.error('Error checking vendor:', error);
        router.push('/organization/shop/dashboard');
      } finally {
        setChecking(false);
      }
    }

    checkVendor();
  }, [user, authLoading, router]);

  if (authLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  return null;
}
