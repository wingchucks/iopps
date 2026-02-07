'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  BuildingStorefrontIcon,
  PencilSquareIcon,
  EyeIcon,
  ChartBarIcon,
  PhotoIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CreditCardIcon,
  SparklesIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { VENDOR_PRODUCTS, type VendorProductType } from '@/lib/stripe';
import { getAuth } from 'firebase/auth';
import { useAuth } from '@/components/AuthProvider';
import { getVendorByUserId, updateVendor, getVendorProducts, createProduct, updateProduct, deleteProduct, validateVendorForPublish, type PublishValidation } from '@/lib/firebase/shop';
import { uploadGalleryImage } from '@/lib/firebase/storage';
import type { Vendor, VendorProduct } from '@/lib/types';
import toast from "react-hot-toast";

type SubTab = 'overview' | 'products' | 'subscription';

interface ShopTabProps {
  onNavigate?: (tab: string) => void;
}

export default function ShopTab({ onNavigate }: ShopTabProps) {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('overview');
  const [isNewVendor, setIsNewVendor] = useState(false);

  // Product modal state
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<VendorProduct | null>(null);
  const [previewProduct, setPreviewProduct] = useState<VendorProduct | null>(null);

  // Publish validation state
  const [publishValidation, setPublishValidation] = useState<PublishValidation | null>(null);
  const [showPublishErrors, setShowPublishErrors] = useState(false);

  const loadVendor = useCallback(async () => {
    if (!user) return;

    try {
      const existingVendor = await getVendorByUserId(user.uid);
      if (existingVendor) {
        setVendor(existingVendor);

        // Load products
        const vendorProducts = await getVendorProducts(existingVendor.id);
        setProducts(vendorProducts);

        // Calculate publish validation
        setPublishValidation(validateVendorForPublish(existingVendor));
      } else {
        setIsNewVendor(true);
        // Redirect to Settings tab to create profile
        if (onNavigate) {
          onNavigate('profile');
        }
      }
    } catch (error) {
      console.error('Error loading vendor:', error);
    } finally {
      setLoading(false);
    }
  }, [user, onNavigate]);

  useEffect(() => {
    if (user) {
      loadVendor();
    }
  }, [user, loadVendor]);

  const handleSubmitForReview = async () => {
    if (!vendor) return;

    // Validate before submitting
    const validation = validateVendorForPublish(vendor);
    setPublishValidation(validation);

    if (!validation.canPublish) {
      setShowPublishErrors(true);
      return;
    }

    // Show warning confirmation if there are warnings
    if (validation.warnings.length > 0) {
      const proceed = confirm(
        `Your profile is ready to submit, but consider these recommendations:\n\n${validation.warnings.map(w => `• ${w}`).join('\n')}\n\nSubmit anyway?`
      );
      if (!proceed) return;
    }

    setSaving(true);
    try {
      await updateVendor(vendor.id, { status: 'pending' });
      await loadVendor();
      setShowPublishErrors(false);
      toast.success('Your listing has been submitted for review! We\'ll notify you once it\'s approved.');
    } catch (error) {
      console.error('Error submitting for review:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProduct = async (productData: Omit<VendorProduct, 'id' | 'vendorId' | 'createdAt' | 'updatedAt'>) => {
    if (!vendor) return;

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
      } else {
        await createProduct(vendor.id, productData);
      }
      await loadVendor();
      setShowProductModal(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product. Please try again.');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await deleteProduct(productId);
      await loadVendor();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  const statusColors = {
    draft: 'bg-slate-500',
    pending: 'bg-amber-500',
    active: 'bg-accent',
    suspended: 'bg-red-500',
  };

  const StatusIcon = vendor?.status === 'active' ? CheckCircleIcon : vendor?.status === 'pending' ? ClockIcon : ExclamationTriangleIcon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500">
          <BuildingStorefrontIcon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">
            {isNewVendor ? 'List Your Business' : 'Indigenous Marketplace'}
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            {isNewVendor
              ? 'Create your business profile to start connecting with customers.'
              : 'Manage your Indigenous Marketplace business listing.'}
          </p>
        </div>
      </div>

      {/* Complete Profile Banner for auto-created vendors */}
      {vendor && publishValidation && !publishValidation.canPublish && !isNewVendor && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 flex-shrink-0">
              <ExclamationTriangleIcon className="h-6 w-6 text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-300">
                Complete Your Business Profile
              </h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Complete these items to submit your listing for review:
              </p>
              <ul className="mt-2 text-sm text-[var(--text-muted)] space-y-1">
                {publishValidation.errors.map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
              </ul>
              <button
                onClick={() => onNavigate?.('profile')}
                className="mt-4 inline-flex rounded-xl bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-300 transition-all hover:bg-amber-500/30"
              >
                Complete profile in Settings →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      {!isNewVendor && (
        <div className="flex gap-1 p-1 bg-surface rounded-xl w-fit">
          {[
            { id: 'overview', label: 'Overview', icon: ChartBarIcon },
            { id: 'products', label: 'Products', icon: PhotoIcon },
            { id: 'subscription', label: 'Subscription', icon: CreditCardIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as SubTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeSubTab === tab.id
                  ? 'bg-accent text-white'
                  : 'text-[var(--text-muted)] hover:text-white hover:bg-slate-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Overview Sub-tab */}
      {activeSubTab === 'overview' && vendor && (
        <div className="space-y-6">
          {/* Status Card */}
          <div className="rounded-2xl bg-surface border border-[var(--card-border)] p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {vendor.logoUrl ? (
                  <Image
                    src={vendor.logoUrl}
                    alt={vendor.businessName}
                    width={64}
                    height={64}
                    className="rounded-xl"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 text-2xl font-bold text-white">
                    {vendor.businessName.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-white">{vendor.businessName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${statusColors[vendor.status]}`}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      {vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}
                    </span>
                    <span className="text-sm text-foreground0">{typeof vendor.category === 'string' ? vendor.category : ''}</span>
                  </div>
                </div>
              </div>
              {vendor.status === 'draft' && (
                <button
                  onClick={handleSubmitForReview}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent transition-colors disabled:opacity-50"
                >
                  Submit for Review
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-surface border border-[var(--card-border)] p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <EyeIcon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{vendor.viewCount || 0}</p>
                  <p className="text-sm text-[var(--text-muted)]">Profile Views</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-surface border border-[var(--card-border)] p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                  <PhotoIcon className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{products.length}</p>
                  <p className="text-sm text-[var(--text-muted)]">Products Listed</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-surface border border-[var(--card-border)] p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                  <ChartBarIcon className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{typeof vendor.region === 'string' ? vendor.region : 'N/A'}</p>
                  <p className="text-sm text-[var(--text-muted)]">Region</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Review Notice */}
          {vendor.status === 'pending' && (
            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-6">
              <div className="flex items-start gap-3">
                <ClockIcon className="h-6 w-6 text-amber-500 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-amber-500">Awaiting Approval</h3>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Your listing is being reviewed by our team. We&apos;ll notify you once it&apos;s approved and visible to customers.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Requirements Checklist */}
          {vendor.status === 'draft' && publishValidation && (
            <div className={`rounded-2xl border p-6 ${
              publishValidation.canPublish
                ? 'bg-accent/10 border-accent/20'
                : 'bg-amber-500/10 border-amber-500/20'
            }`}>
              <div className="flex items-start gap-3">
                {publishValidation.canPublish ? (
                  <CheckCircleIcon className="h-6 w-6 text-accent flex-shrink-0" />
                ) : (
                  <ExclamationTriangleIcon className="h-6 w-6 text-amber-500 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h3 className={`font-semibold ${publishValidation.canPublish ? 'text-accent' : 'text-amber-500'}`}>
                    {publishValidation.canPublish
                      ? 'Ready to submit for review!'
                      : 'Complete these requirements to submit'}
                  </h3>

                  {/* Requirements checklist */}
                  <div className="mt-4 space-y-2">
                    {/* Business name */}
                    <ChecklistItem
                      label="Business name"
                      complete={!!vendor.businessName?.trim()}
                    />
                    {/* Description */}
                    <ChecklistItem
                      label="Business description (50+ characters)"
                      complete={!!vendor.description && vendor.description.trim().length >= 50}
                    />
                    {/* Category */}
                    <ChecklistItem
                      label="Business category"
                      complete={!!vendor.category}
                    />
                    {/* Region */}
                    <ChecklistItem
                      label="Province/State"
                      complete={!!vendor.region}
                    />
                    {/* Contact method */}
                    <ChecklistItem
                      label="Contact method (email, phone, or website)"
                      complete={!!(vendor.email?.trim() || vendor.phone?.trim() || vendor.website?.trim())}
                    />

                    {/* Warnings (optional) */}
                    {publishValidation.warnings.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
                        <p className="text-xs text-[var(--text-muted)] mb-2">Recommended (optional):</p>
                        {!vendor.logoUrl && (
                          <ChecklistItem label="Add a logo" complete={false} isWarning />
                        )}
                        {!vendor.onlineOnly && !vendor.location && (
                          <ChecklistItem label="Add your city/town" complete={false} isWarning />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Error messages when trying to publish */}
                  {showPublishErrors && publishValidation.errors.length > 0 && (
                    <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                      <p className="text-sm font-medium text-red-400 mb-2">Please fix these issues:</p>
                      <ul className="text-sm text-red-300 space-y-1">
                        {publishValidation.errors.map((error, i) => (
                          <li key={i}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={() => onNavigate?.('profile')}
                    className="mt-4 text-sm text-accent hover:text-teal-300 transition-colors"
                  >
                    Edit profile in Settings →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Listing Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Your Listing Preview</h3>
              <span className="text-xs text-foreground0">This is how customers see your shop</span>
            </div>
            <div className="rounded-2xl bg-surface border border-[var(--card-border)] overflow-hidden">
              <div className="h-32 bg-gradient-to-br from-teal-600/30 to-emerald-600/30 relative">
                {vendor.logoUrl && (
                  <div className="absolute -bottom-8 left-6">
                    <Image
                      src={vendor.logoUrl}
                      alt={vendor.businessName}
                      width={80}
                      height={80}
                      className="rounded-xl border-4 border-[var(--card-border)] object-cover"
                    />
                  </div>
                )}
                {!vendor.logoUrl && (
                  <div className="absolute -bottom-8 left-6 flex h-20 w-20 items-center justify-center rounded-xl border-4 border-[var(--card-border)] bg-gradient-to-br from-teal-500 to-teal-600 text-3xl font-bold text-white">
                    {vendor.businessName.charAt(0)}
                  </div>
                )}
              </div>

              <div className="pt-12 px-6 pb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xl font-bold text-white">{vendor.businessName}</h4>
                    {vendor.tagline && typeof vendor.tagline === 'string' && (
                      <p className="text-[var(--text-muted)] mt-1">{vendor.tagline}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-[var(--text-muted)]">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-accent">
                        {typeof vendor.category === 'string' ? vendor.category : 'Uncategorized'}
                      </span>
                      {vendor.location && typeof vendor.location === 'string' && (
                        <span>{vendor.location}{typeof vendor.region === 'string' ? `, ${vendor.region}` : ''}</span>
                      )}
                      {!vendor.location && vendor.region && typeof vendor.region === 'string' && (
                        <span>{vendor.region}</span>
                      )}
                      {vendor.nation && typeof vendor.nation === 'string' && (
                        <span>{vendor.nation}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate?.('profile')}
                    className="flex items-center gap-1.5 text-sm text-accent hover:text-teal-300 transition-colors"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                    Edit in Settings
                  </button>
                </div>

                {vendor.description && typeof vendor.description === 'string' && (
                  <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
                    <p className="text-[var(--text-secondary)] text-sm line-clamp-3">{vendor.description}</p>
                  </div>
                )}

                {products.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-[var(--text-muted)]">Products ({products.length})</span>
                      <button
                        onClick={() => setActiveSubTab('products')}
                        className="text-xs text-accent hover:text-teal-300"
                      >
                        Manage
                      </button>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {products.slice(0, 4).map((product) => (
                        <div key={product.id} className="flex-shrink-0 w-20">
                          {product.imageUrl ? (
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
                              width={80}
                              height={80}
                              className="rounded-lg object-cover w-20 h-20"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-lg bg-slate-700 flex items-center justify-center">
                              <PhotoIcon className="h-6 w-6 text-foreground0" />
                            </div>
                          )}
                        </div>
                      ))}
                      {products.length > 4 && (
                        <div className="flex-shrink-0 w-20 h-20 rounded-lg bg-slate-700/50 flex items-center justify-center text-[var(--text-muted)] text-sm">
                          +{products.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Products Sub-tab */}
      {activeSubTab === 'products' && vendor && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Products & Services</h3>
              <p className="text-sm text-[var(--text-muted)]">Add products or services to showcase on your profile.</p>
            </div>
            <button
              onClick={() => {
                setEditingProduct(null);
                setShowProductModal(true);
              }}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Add Product
            </button>
          </div>

          {products.length === 0 ? (
            <div className="rounded-2xl bg-surface border border-[var(--card-border)] p-12 text-center">
              <PhotoIcon className="mx-auto h-12 w-12 text-slate-600" />
              <h4 className="mt-4 text-lg font-semibold text-white">No products yet</h4>
              <p className="mt-2 text-[var(--text-muted)]">
                Add products or services to help customers discover what you offer.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  onClick={() => setPreviewProduct(product)}
                  className="rounded-xl bg-surface border border-[var(--card-border)] overflow-hidden group cursor-pointer hover:border-accent/50 transition-colors"
                >
                  {product.imageUrl ? (
                    <div className="relative h-40">
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-40 bg-slate-700/50 flex items-center justify-center">
                      <PhotoIcon className="h-12 w-12 text-slate-600" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-white">{product.name}</h4>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewProduct(product);
                          }}
                          className="p-1.5 rounded-lg bg-slate-700 hover:bg-accent/20 text-[var(--text-secondary)] hover:text-accent transition-colors"
                          title="Preview product"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProduct(product);
                            setShowProductModal(true);
                          }}
                          className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-[var(--text-secondary)] hover:text-white transition-colors"
                          title="Edit product"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProduct(product.id);
                          }}
                          className="p-1.5 rounded-lg bg-slate-700 hover:bg-red-500/20 text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                          title="Delete product"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-[var(--text-muted)] mt-1 line-clamp-2">{product.description}</p>
                    {product.priceDisplay && (
                      <p className="mt-2 text-accent font-semibold">{product.priceDisplay}</p>
                    )}
                    <p className="mt-2 text-xs text-foreground0">Click to preview</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subscription Sub-tab */}
      {activeSubTab === 'subscription' && vendor && (
        <SubscriptionSection vendor={vendor} onRefresh={loadVendor} />
      )}

      {/* Product Modal */}
      {showProductModal && vendor && (
        <ProductModal
          vendorId={vendor.id}
          product={editingProduct}
          onSave={handleSaveProduct}
          onClose={() => {
            setShowProductModal(false);
            setEditingProduct(null);
          }}
        />
      )}

      {/* Product Preview Modal */}
      {previewProduct && vendor && (
        <ProductPreviewModal
          product={previewProduct}
          vendor={vendor}
          onClose={() => setPreviewProduct(null)}
          onEdit={() => {
            setEditingProduct(previewProduct);
            setPreviewProduct(null);
            setShowProductModal(true);
          }}
        />
      )}
    </div>
  );
}

// Subscription Section Component
function SubscriptionSection({ vendor, onRefresh }: { vendor: Vendor; onRefresh: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<VendorProductType | null>(null);

  const hasActiveSubscription = vendor.subscriptionStatus === 'active' && vendor.subscriptionEndsAt;
  const subscriptionEndDate = vendor.subscriptionEndsAt
    ? new Date((vendor.subscriptionEndsAt as any).toDate ? (vendor.subscriptionEndsAt as any).toDate() : vendor.subscriptionEndsAt)
    : null;
  const isExpired = subscriptionEndDate && subscriptionEndDate < new Date();

  const handleSubscribe = async (productType: VendorProductType) => {
    setLoading(true);
    setSelectedPlan(productType);

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const idToken = await user.getIdToken();

      const response = await fetch('/api/stripe/checkout-vendor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          productType,
          vendorId: vendor.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Current Status */}
      <div className="rounded-2xl bg-surface border border-[var(--card-border)] p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Subscription Status</h3>

        {hasActiveSubscription && !isExpired ? (
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
              <CheckCircleIcon className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-white font-semibold">Active Subscription</p>
              <p className="text-sm text-[var(--text-muted)]">
                Your listing is live until {subscriptionEndDate?.toLocaleDateString('en-CA', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
              <ExclamationTriangleIcon className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-white font-semibold">
                {isExpired ? 'Subscription Expired' : 'No Active Subscription'}
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                Subscribe to make your business visible in the Indigenous Marketplace.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Pricing Plans */}
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Choose Your Plan</h3>
        <p className="text-[var(--text-muted)] mb-6">
          Get your Indigenous-owned business in front of customers across North America.
        </p>

        <div className="max-w-md mx-auto">
          {/* Monthly Plan */}
          <div className="relative rounded-2xl bg-gradient-to-br from-teal-500/10 to-emerald-500/10 border-2 border-accent/50 p-6">
            <div className="absolute -top-3 left-6">
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">
                First Month Free
              </span>
            </div>

            <h4 className="text-lg font-bold text-white mt-2">{VENDOR_PRODUCTS.MONTHLY.name}</h4>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white">${VENDOR_PRODUCTS.MONTHLY.price / 100}</span>
              <span className="text-[var(--text-muted)]">/month</span>
            </div>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{VENDOR_PRODUCTS.MONTHLY.description}</p>

            <ul className="mt-4 space-y-2">
              {VENDOR_PRODUCTS.MONTHLY.features.map((feature: string, i: number) => (
                <li key={i} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <CheckCircleIcon className="h-4 w-4 text-accent flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe('MONTHLY')}
              disabled={loading}
              className="mt-6 w-full rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 py-3 font-semibold text-white shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 transition-all disabled:opacity-50"
            >
              {loading && selectedPlan === 'MONTHLY' ? 'Processing...' : 'Start Free Trial'}
            </button>
          </div>
        </div>
      </div>

      <div className="text-center text-sm text-foreground0">
        <p>Secure payments powered by Stripe. Cancel anytime.</p>
      </div>
    </div>
  );
}

// Product Modal Component
function ProductModal({
  vendorId,
  product,
  onSave,
  onClose,
}: {
  vendorId: string;
  product: VendorProduct | null;
  onSave: (data: Omit<VendorProduct, 'id' | 'vendorId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onClose: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    category: product?.category || '',
    priceDisplay: product?.priceDisplay || '',
    imageUrl: product?.imageUrl || '',
    inStock: product?.inStock ?? true,
    madeToOrder: product?.madeToOrder ?? false,
    featured: product?.featured ?? false,
    sortOrder: product?.sortOrder ?? 0,
    active: product?.active ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.description) {
      toast.error('Please fill in the required fields.');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const result = await uploadGalleryImage(file, vendorId);
      setFormData({ ...formData, imageUrl: result.url });
    } catch (error) {
      console.error('Failed to upload image:', error);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-surface border border-[var(--card-border)] p-6 shadow-xl my-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">
            {product ? 'Edit Product' : 'Add Product'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface text-[var(--text-muted)] hover:text-white transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Product Image
            </label>
            <div className="flex items-center gap-4">
              {formData.imageUrl ? (
                <div className="relative">
                  <Image
                    src={formData.imageUrl}
                    alt="Product"
                    width={100}
                    height={100}
                    className="rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, imageUrl: '' })}
                    className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                  >
                    <span className="text-xs">x</span>
                  </button>
                </div>
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-surface border border-[var(--card-border)]">
                  <PhotoIcon className="h-8 w-8 text-slate-600" />
                </div>
              )}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleImageUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    uploadingImage
                      ? 'bg-slate-700 text-foreground0 cursor-not-allowed'
                      : 'bg-slate-700 text-white hover:bg-slate-600'
                  }`}
                >
                  {uploadingImage ? 'Uploading...' : formData.imageUrl ? 'Change Image' : 'Upload Image'}
                </button>
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Product Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-lg bg-surface border border-[var(--card-border)] px-4 py-3 text-white placeholder-slate-500 focus:border-accent focus:outline-none"
              placeholder="e.g., Handcrafted Beaded Earrings"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Description *
            </label>
            <textarea
              required
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-lg bg-surface border border-[var(--card-border)] px-4 py-3 text-white placeholder-slate-500 focus:border-accent focus:outline-none"
              placeholder="Describe your product..."
            />
          </div>

          {/* Category & Price */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded-lg bg-surface border border-[var(--card-border)] px-4 py-3 text-white placeholder-slate-500 focus:border-accent focus:outline-none"
                placeholder="e.g., Jewelry, Art, Clothing"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Price Display
              </label>
              <input
                type="text"
                value={formData.priceDisplay}
                onChange={(e) => setFormData({ ...formData, priceDisplay: e.target.value })}
                className="w-full rounded-lg bg-surface border border-[var(--card-border)] px-4 py-3 text-white placeholder-slate-500 focus:border-accent focus:outline-none"
                placeholder="e.g., $50, From $25, Contact for pricing"
              />
            </div>
          </div>

          {/* Options */}
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.inStock}
                onChange={(e) => setFormData({ ...formData, inStock: e.target.checked })}
                className="h-5 w-5 rounded border-[var(--card-border)] bg-slate-700 text-accent focus:ring-teal-500"
              />
              <span className="text-[var(--text-secondary)]">In Stock</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.madeToOrder}
                onChange={(e) => setFormData({ ...formData, madeToOrder: e.target.checked })}
                className="h-5 w-5 rounded border-[var(--card-border)] bg-slate-700 text-accent focus:ring-teal-500"
              />
              <span className="text-[var(--text-secondary)]">Made to Order</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.featured}
                onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                className="h-5 w-5 rounded border-[var(--card-border)] bg-slate-700 text-accent focus:ring-teal-500"
              />
              <span className="text-[var(--text-secondary)]">Featured</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-[var(--card-border)]">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-6 py-3 rounded-lg text-[var(--text-secondary)] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploadingImage}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : product ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Product Preview Modal
function ProductPreviewModal({
  product,
  vendor,
  onClose,
  onEdit,
}: {
  product: VendorProduct;
  vendor: Vendor;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-surface border border-[var(--card-border)] shadow-xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--card-border)] bg-surface">
          <div className="flex items-center gap-2">
            <EyeIcon className="h-5 w-5 text-accent" />
            <span className="text-sm font-medium text-[var(--text-secondary)]">Customer View Preview</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-700 text-[var(--text-muted)] hover:text-white transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Product Preview */}
        <div className="bg-gradient-to-b from-slate-800 to-slate-900">
          {product.imageUrl ? (
            <div className="relative w-full aspect-square max-h-80">
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-contain bg-background"
              />
            </div>
          ) : (
            <div className="w-full aspect-video max-h-60 bg-surface flex items-center justify-center">
              <PhotoIcon className="h-20 w-20 text-slate-600" />
            </div>
          )}

          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">{product.name}</h2>
                {product.category && (
                  <span className="inline-block mt-2 text-sm text-accent bg-accent/10 px-3 py-1 rounded-full">
                    {product.category}
                  </span>
                )}
              </div>
              {product.priceDisplay && (
                <p className="text-2xl font-bold text-accent">{product.priceDisplay}</p>
              )}
            </div>

            <p className="text-[var(--text-secondary)] leading-relaxed">{product.description}</p>

            <div className="flex flex-wrap gap-2">
              {product.inStock && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent bg-accent/10 px-2.5 py-1 rounded-full">
                  <CheckCircleIcon className="h-3.5 w-3.5" />
                  In Stock
                </span>
              )}
              {product.madeToOrder && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
                  <ClockIcon className="h-3.5 w-3.5" />
                  Made to Order
                </span>
              )}
              {product.featured && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full">
                  <SparklesIcon className="h-3.5 w-3.5" />
                  Featured
                </span>
              )}
            </div>

            <div className="pt-4 border-t border-[var(--card-border)]">
              <div className="flex items-center gap-3">
                {vendor.logoUrl ? (
                  <Image
                    src={vendor.logoUrl}
                    alt={vendor.businessName}
                    width={40}
                    height={40}
                    className="rounded-lg"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 text-lg font-bold text-white">
                    {vendor.businessName.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-medium text-white">{vendor.businessName}</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {typeof vendor.location === 'string' && vendor.location}
                    {typeof vendor.location === 'string' && typeof vendor.region === 'string' && ', '}
                    {typeof vendor.region === 'string' && vendor.region}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-4 p-4 border-t border-[var(--card-border)] bg-surface">
          <p className="text-xs text-foreground0 self-center">
            This is how customers will see your product
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[var(--text-secondary)] hover:text-white transition-colors"
            >
              Close
            </button>
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white font-medium hover:bg-accent transition-colors"
            >
              <PencilSquareIcon className="h-4 w-4" />
              Edit Product
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Checklist item component for publish requirements
function ChecklistItem({ label, complete, isWarning = false }: { label: string; complete: boolean; isWarning?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {complete ? (
        <CheckCircleIcon className="h-4 w-4 text-accent flex-shrink-0" />
      ) : isWarning ? (
        <div className="h-4 w-4 rounded-full border-2 border-amber-400 flex-shrink-0" />
      ) : (
        <div className="h-4 w-4 rounded-full border-2 border-slate-500 flex-shrink-0" />
      )}
      <span className={`text-sm ${
        complete
          ? 'text-accent'
          : isWarning
            ? 'text-amber-400'
            : 'text-[var(--text-muted)]'
      }`}>
        {label}
      </span>
    </div>
  );
}
