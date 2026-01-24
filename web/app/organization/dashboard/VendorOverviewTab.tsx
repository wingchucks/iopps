'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import {
  EyeIcon,
  CubeIcon,
  WrenchIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/AuthProvider';
import { getVendorByUserId, getVendorProducts, validateVendorForPublish } from '@/lib/firebase/shop';
import { StatCard, type DashboardSection } from '@/components/organization/dashboard';
import type { Vendor, VendorProduct } from '@/lib/types';

interface VendorOverviewTabProps {
  onNavigate?: (section: DashboardSection) => void;
}

/**
 * VendorOverviewTab - Displays vendor stats and quick actions
 *
 * Shows:
 * - Products count
 * - Services count (products with type 'service')
 * - Shop views
 * - Inquiries count
 * - Recent product performance
 * - Quick actions to manage shop
 */
export default function VendorOverviewTab({ onNavigate }: VendorOverviewTabProps) {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [inquiryCount, setInquiryCount] = useState(0);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      const vendorData = await getVendorByUserId(user.uid);
      if (vendorData) {
        setVendor(vendorData);
        const vendorProducts = await getVendorProducts(vendorData.id);
        setProducts(vendorProducts);

        // Fetch inquiry count
        try {
          const idToken = await user.getIdToken();
          const response = await fetch('/api/vendor/inquiries?limit=1', {
            headers: { Authorization: `Bearer ${idToken}` },
          });
          if (response.ok) {
            const data = await response.json();
            setInquiryCount(data.counts?.total || 0);
          }
        } catch (err) {
          console.error('Error loading inquiry count:', err);
        }
      }
    } catch (error) {
      console.error('Error loading vendor data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="rounded-2xl bg-card border border-card-border p-8 text-center">
        <CubeIcon className="mx-auto h-12 w-12 text-slate-600" />
        <h3 className="mt-4 text-lg font-semibold text-white">No Shop Profile Yet</h3>
        <p className="mt-2 text-slate-400">
          Create your shop profile to start selling on the Indigenous Marketplace.
        </p>
        <button
          onClick={() => onNavigate?.('profile')}
          className="mt-4 px-6 py-2 rounded-lg bg-accent text-slate-950 font-semibold hover:bg-accent-hover transition-colors"
        >
          Create Shop Profile
        </button>
      </div>
    );
  }

  // Calculate stats
  const productCount = products.filter(p => !p.category?.toLowerCase().includes('service')).length;
  const serviceCount = products.filter(p => p.category?.toLowerCase().includes('service')).length;
  const viewCount = vendor.viewCount || 0;

  // Get publish validation
  const publishValidation = validateVendorForPublish(vendor);

  // Status colors
  const statusColors = {
    draft: 'bg-slate-500',
    pending: 'bg-amber-500',
    active: 'bg-emerald-500',
    suspended: 'bg-red-500',
  };

  const StatusIcon = vendor.status === 'active'
    ? CheckCircleIcon
    : vendor.status === 'pending'
      ? ClockIcon
      : ExclamationTriangleIcon;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CubeIcon} value={productCount} label="Products" />
        <StatCard icon={WrenchIcon} value={serviceCount} label="Services" />
        <StatCard icon={EyeIcon} value={viewCount} label="Shop Views" />
        <StatCard icon={ChatBubbleLeftRightIcon} value={inquiryCount} label="Inquiries" />
      </div>

      {/* Shop Status Card */}
      <div className="rounded-2xl bg-card border border-card-border p-6">
        <div className="flex items-center gap-4">
          {vendor.logoUrl ? (
            <Image
              src={vendor.logoUrl}
              alt={vendor.businessName}
              width={64}
              height={64}
              className="rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-teal-600 text-2xl font-bold text-white">
              {vendor.businessName?.charAt(0) || 'S'}
            </div>
          )}
          <div>
            <h3 className="text-xl font-bold text-white">{vendor.businessName || 'Your Shop'}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${statusColors[vendor.status]}`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}
              </span>
              {vendor.category && (
                <span className="text-sm text-slate-500">{vendor.category}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Completion Banner */}
      {vendor.status === 'draft' && !publishValidation.canPublish && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 flex-shrink-0">
              <ExclamationTriangleIcon className="h-6 w-6 text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-300">Complete Your Shop Profile</h3>
              <p className="mt-2 text-sm text-slate-300">
                Complete these items to submit your listing for review:
              </p>
              <ul className="mt-2 text-sm text-slate-400 space-y-1">
                {publishValidation.errors.map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
              </ul>
              <button
                onClick={() => onNavigate?.('profile')}
                className="mt-4 inline-flex rounded-xl bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-300 transition-all hover:bg-amber-500/30"
              >
                Complete profile now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Review Notice */}
      {vendor.status === 'pending' && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-6">
          <div className="flex items-start gap-3">
            <ClockIcon className="h-6 w-6 text-amber-500 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-500">Awaiting Approval</h3>
              <p className="mt-1 text-sm text-slate-400">
                Your listing is being reviewed by our team. We&apos;ll notify you once it&apos;s approved.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Product Performance */}
      {products.length > 0 && (
        <div className="rounded-2xl bg-card border border-card-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Product Performance</h3>
            <button
              onClick={() => onNavigate?.('products')}
              className="text-sm text-accent hover:text-accent-hover transition-colors"
            >
              View All →
            </button>
          </div>
          <div className="space-y-3">
            {products.slice(0, 3).map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-slate-700/50"
              >
                <div className="flex items-center gap-3">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      width={48}
                      height={48}
                      className="rounded-lg object-cover w-12 h-12"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center">
                      <CubeIcon className="h-6 w-6 text-slate-500" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium text-white">{product.name}</h4>
                    <p className="text-sm text-slate-500">
                      {product.category || 'Uncategorized'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {product.priceDisplay && (
                    <p className="text-accent font-semibold">{product.priceDisplay}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    {product.inStock ? 'In Stock' : 'Out of Stock'}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {products.length === 0 && (
            <div className="text-center py-8">
              <CubeIcon className="mx-auto h-10 w-10 text-slate-600" />
              <p className="mt-2 text-slate-400">No products yet</p>
              <button
                onClick={() => onNavigate?.('products')}
                className="mt-3 text-sm text-accent hover:text-accent-hover"
              >
                Add your first product →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4">
        <button
          onClick={() => onNavigate?.('products')}
          className="p-4 rounded-xl bg-card border border-card-border hover:border-accent/50 transition-colors text-left"
        >
          <CubeIcon className="h-6 w-6 text-accent mb-2" />
          <h4 className="font-medium text-white">Manage Products</h4>
          <p className="text-sm text-slate-400">Add or edit your products</p>
        </button>
      </div>
    </div>
  );
}
