'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { listUserOfferings } from '@/lib/firestore';
import type { UnifiedOffering, OfferingType } from '@/lib/types';
import {
  CubeIcon,
  WrenchScrewdriverIcon,
  PlusIcon,
  PencilIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

export default function SellOfferingsPage() {
  const { user } = useAuth();
  const [offerings, setOfferings] = useState<UnifiedOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | OfferingType>('all');

  useEffect(() => {
    async function loadOfferings() {
      if (!user) return;

      try {
        const offeringsList = await listUserOfferings(user.uid);
        setOfferings(offeringsList);
      } catch (error) {
        console.error('Error loading offerings:', error);
      } finally {
        setLoading(false);
      }
    }

    loadOfferings();
  }, [user]);

  const filteredOfferings = activeTab === 'all'
    ? offerings
    : offerings.filter(o => o.type === activeTab);

  const productCount = offerings.filter(o => o.type === 'product').length;
  const serviceCount = offerings.filter(o => o.type === 'service').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Offerings</h1>
          <p className="text-slate-400 mt-1">
            Manage your products and services
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/organization/shop/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-medium hover:bg-slate-700 transition-colors"
          >
            <CubeIcon className="w-4 h-4" />
            Add Product
          </Link>
          <Link
            href="/organization/services/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-slate-950 rounded-lg font-medium hover:bg-accent/90 transition-colors"
          >
            <WrenchScrewdriverIcon className="w-4 h-4" />
            Add Service
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'all'
              ? 'bg-accent/10 text-accent'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          All ({offerings.length})
        </button>
        <button
          onClick={() => setActiveTab('product')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'product'
              ? 'bg-accent/10 text-accent'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <CubeIcon className="w-4 h-4" />
          Products ({productCount})
        </button>
        <button
          onClick={() => setActiveTab('service')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'service'
              ? 'bg-accent/10 text-accent'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <WrenchScrewdriverIcon className="w-4 h-4" />
          Services ({serviceCount})
        </button>
      </div>

      {/* Offerings Grid */}
      {filteredOfferings.length === 0 ? (
        <div className="bg-card border border-card-border rounded-2xl p-12 text-center">
          <CubeIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">No offerings yet</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6">
            Add offerings to help customers discover what you offer. You can add products or services.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/organization/shop/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-medium hover:bg-slate-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add Product
            </Link>
            <Link
              href="/organization/services/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-slate-950 rounded-lg font-medium hover:bg-accent/90 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add Service
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOfferings.map(offering => (
            <div
              key={offering.id}
              className="bg-card border border-card-border rounded-xl overflow-hidden hover:border-slate-700 transition-colors"
            >
              {/* Image */}
              <div className="aspect-video bg-slate-900 relative">
                {offering.imageUrl ? (
                  <img
                    src={offering.imageUrl}
                    alt={offering.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {offering.type === 'product' ? (
                      <CubeIcon className="w-12 h-12 text-slate-700" />
                    ) : (
                      <WrenchScrewdriverIcon className="w-12 h-12 text-slate-700" />
                    )}
                  </div>
                )}

                {/* Type Badge */}
                <span className={`absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded ${
                  offering.type === 'product'
                    ? 'bg-blue-900/80 text-blue-300'
                    : 'bg-purple-900/80 text-purple-300'
                }`}>
                  {offering.type === 'product' ? 'Product' : 'Service'}
                </span>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-slate-200 truncate">{offering.name}</h3>
                  {offering.active ? (
                    <CheckCircleIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
                  ) : (
                    <XCircleIcon className="w-5 h-5 text-slate-500 flex-shrink-0" />
                  )}
                </div>

                <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                  {offering.description}
                </p>

                {offering.priceDisplay && (
                  <p className="text-sm font-medium text-accent mb-3">
                    {offering.priceDisplay}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <EyeIcon className="w-3.5 h-3.5" />
                    {offering.viewCount} views
                  </span>
                  <Link
                    href="/organization/shop/dashboard"
                    className="flex items-center gap-1 text-accent hover:underline"
                  >
                    <PencilIcon className="w-3.5 h-3.5" />
                    Edit
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
