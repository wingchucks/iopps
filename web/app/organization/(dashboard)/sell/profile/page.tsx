'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { getVendorProfile } from '@/lib/firestore';
import type { Vendor } from '@/lib/types';
import {
  BuildingStorefrontIcon,
  PencilIcon,
  EyeIcon,
  GlobeAltIcon,
  PhotoIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

export default function SellProfilePage() {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadVendor() {
      if (!user) return;

      try {
        const vendorData = await getVendorProfile(user.uid);
        setVendor(vendorData);
      } catch (error) {
        console.error('Error loading vendor profile:', error);
      } finally {
        setLoading(false);
      }
    }

    loadVendor();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Shop Profile</h1>
          <p className="text-slate-400 mt-1">
            Set up your shop profile to start selling
          </p>
        </div>

        <div className="bg-card border border-card-border rounded-2xl p-12 text-center">
          <BuildingStorefrontIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">
            No shop profile yet
          </h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6">
            Create your shop profile to showcase your Indigenous business in the marketplace.
          </p>
          <Link
            href="/organization/shop/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-slate-950 rounded-lg font-medium hover:bg-accent/90 transition-colors"
          >
            Create Shop Profile
          </Link>
        </div>
      </div>
    );
  }

  const completionItems = [
    { label: 'Business name', done: !!vendor.businessName },
    { label: 'Logo', done: !!vendor.logoUrl },
    { label: 'Banner image', done: !!vendor.bannerUrl },
    { label: 'Description', done: !!vendor.description },
    { label: 'Location', done: !!vendor.city || !!vendor.province },
    { label: 'Website', done: !!vendor.website },
  ];

  const completionScore = Math.round(
    (completionItems.filter(i => i.done).length / completionItems.length) * 100
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Shop Profile</h1>
          <p className="text-slate-400 mt-1">
            Manage your marketplace presence
          </p>
        </div>
        <div className="flex gap-2">
          {vendor.slug && (
            <Link
              href={`/shop/${vendor.slug}`}
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-medium hover:bg-slate-700 transition-colors"
            >
              <EyeIcon className="w-4 h-4" />
              View Public Profile
            </Link>
          )}
          <Link
            href={`/organization/shop/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-slate-950 rounded-lg font-medium hover:bg-accent/90 transition-colors"
          >
            <PencilIcon className="w-4 h-4" />
            Edit Profile
          </Link>
        </div>
      </div>

      {/* Status Banner */}
      {!vendor.active && (
        <div className="bg-amber-900/20 border border-amber-800/30 rounded-xl p-4 flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-200 font-medium">Your shop is not visible</p>
            <p className="text-amber-300/70 text-sm mt-1">
              Activate your listing from the{' '}
              <Link href="/organization/billing" className="underline hover:text-amber-200">
                Billing page
              </Link>{' '}
              to appear in the marketplace.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Preview */}
        <div className="lg:col-span-2 bg-card border border-card-border rounded-2xl overflow-hidden">
          {/* Banner */}
          <div className="aspect-[3/1] bg-slate-900 relative">
            {vendor.bannerUrl ? (
              <img
                src={vendor.bannerUrl}
                alt="Banner"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <PhotoIcon className="w-12 h-12 text-slate-700" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="flex items-start gap-4 -mt-16">
              {/* Logo */}
              <div className="w-24 h-24 rounded-xl bg-slate-800 border-4 border-card flex items-center justify-center overflow-hidden">
                {vendor.logoUrl ? (
                  <img
                    src={vendor.logoUrl}
                    alt={vendor.businessName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BuildingStorefrontIcon className="w-10 h-10 text-slate-600" />
                )}
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-50">
                  {vendor.businessName}
                </h2>
                {vendor.active && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-900/30 text-green-400">
                    Active
                  </span>
                )}
              </div>

              {vendor.tagline && (
                <p className="text-slate-400 mt-1">{vendor.tagline}</p>
              )}

              {(vendor.city || vendor.province) && (
                <p className="text-sm text-slate-500 mt-2">
                  {[vendor.city, vendor.province].filter(Boolean).join(', ')}
                </p>
              )}

              {vendor.description && (
                <p className="text-slate-400 mt-4 line-clamp-3">
                  {vendor.description}
                </p>
              )}

              {vendor.website && (
                <a
                  href={vendor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-accent hover:underline mt-4 text-sm"
                >
                  <GlobeAltIcon className="w-4 h-4" />
                  {vendor.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Profile Completion */}
        <div className="bg-card border border-card-border rounded-2xl p-6">
          <h3 className="font-semibold text-slate-50 mb-4">Profile Completion</h3>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-400">Progress</span>
              <span className="text-accent font-medium">{completionScore}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${completionScore}%` }}
              />
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            {completionItems.map(item => (
              <div
                key={item.label}
                className="flex items-center gap-2 text-sm"
              >
                {item.done ? (
                  <CheckCircleIcon className="w-4 h-4 text-green-400" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-600" />
                )}
                <span className={item.done ? 'text-slate-400' : 'text-slate-500'}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          {completionScore < 100 && (
            <Link
              href="/organization/shop/edit"
              className="block text-center text-sm text-accent hover:underline mt-4"
            >
              Complete your profile
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
