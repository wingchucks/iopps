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
import { getVendorByUserId, createVendor, updateVendor, getVendorProducts, createProduct, updateProduct, deleteProduct } from '@/lib/firebase/shop';
import { uploadProfileImage, uploadGalleryImage } from '@/lib/firebase/storage';
import type { Vendor, VendorProduct, VendorCategory, NorthAmericanRegion } from '@/lib/types';
import { VENDOR_CATEGORIES, NORTH_AMERICAN_REGIONS } from '@/lib/types';

type SubTab = 'overview' | 'profile' | 'products' | 'subscription';

export default function ShopTab() {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('overview');
  const [isNewVendor, setIsNewVendor] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    businessName: '',
    tagline: '',
    description: '',
    category: 'Art & Crafts' as VendorCategory,
    location: '',
    region: 'Ontario' as NorthAmericanRegion,
    offersShipping: false,
    onlineOnly: false,
    email: '',
    phone: '',
    website: '',
    instagram: '',
    facebook: '',
    tiktok: '',
    nation: '',
    communityStory: '',
    logoUrl: '',
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Product modal state
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<VendorProduct | null>(null);
  const [previewProduct, setPreviewProduct] = useState<VendorProduct | null>(null);

  const loadVendor = useCallback(async () => {
    if (!user) return;

    try {
      const existingVendor = await getVendorByUserId(user.uid);
      if (existingVendor) {
        setVendor(existingVendor);
        setFormData({
          businessName: existingVendor.businessName || '',
          tagline: existingVendor.tagline || '',
          description: existingVendor.description || '',
          category: existingVendor.category || 'Art & Crafts',
          location: existingVendor.location || '',
          region: existingVendor.region || 'Ontario',
          offersShipping: existingVendor.offersShipping || false,
          onlineOnly: existingVendor.onlineOnly || false,
          email: existingVendor.email || '',
          phone: existingVendor.phone || '',
          website: existingVendor.website || '',
          instagram: existingVendor.instagram || '',
          facebook: existingVendor.facebook || '',
          tiktok: existingVendor.tiktok || '',
          nation: existingVendor.nation || '',
          communityStory: existingVendor.communityStory || '',
          logoUrl: existingVendor.logoUrl || '',
        });

        // Load products
        const vendorProducts = await getVendorProducts(existingVendor.id);
        setProducts(vendorProducts);
      } else {
        setIsNewVendor(true);
        setActiveSubTab('profile');
      }
    } catch (error) {
      console.error('Error loading vendor:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadVendor();
    }
  }, [user, loadVendor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      if (isNewVendor) {
        await createVendor(user.uid, formData);
        await loadVendor();
        setIsNewVendor(false);
        setActiveSubTab('overview');
        alert('Shop profile created successfully!');
      } else if (vendor) {
        await updateVendor(vendor.id, formData);
        await loadVendor();
        alert('Shop profile saved successfully!');
      }
    } catch (error: any) {
      console.error('Error saving vendor:', error);
      alert(`Failed to save profile: ${error?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!vendor) return;

    setSaving(true);
    try {
      await updateVendor(vendor.id, { status: 'active' });
      await loadVendor();
    } catch (error) {
      console.error('Error publishing:', error);
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
      alert('Failed to save product. Please try again.');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await deleteProduct(productId);
      await loadVendor();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  const statusColors = {
    draft: 'bg-slate-500',
    pending: 'bg-amber-500',
    active: 'bg-emerald-500',
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
            {isNewVendor ? 'List Your Business' : 'Shop Indigenous'}
          </h2>
          <p className="text-sm text-slate-400">
            {isNewVendor
              ? 'Create your business profile to start connecting with customers.'
              : 'Manage your Shop Indigenous business listing.'}
          </p>
        </div>
      </div>

      {/* Sub-tabs */}
      {!isNewVendor && (
        <div className="flex gap-1 p-1 bg-slate-800/50 rounded-xl w-fit">
          {[
            { id: 'overview', label: 'Overview', icon: ChartBarIcon },
            { id: 'profile', label: 'Edit Profile', icon: PencilSquareIcon },
            { id: 'products', label: 'Products', icon: PhotoIcon },
            { id: 'subscription', label: 'Subscription', icon: CreditCardIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as SubTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeSubTab === tab.id
                  ? 'bg-teal-500 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
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
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-6">
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
                    <span className="text-sm text-slate-500">{typeof vendor.category === 'string' ? vendor.category : ''}</span>
                  </div>
                </div>
              </div>
              {vendor.status === 'draft' && (
                <button
                  onClick={handlePublish}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 transition-colors disabled:opacity-50"
                >
                  Publish
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10">
                  <EyeIcon className="h-5 w-5 text-teal-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{vendor.viewCount || 0}</p>
                  <p className="text-sm text-slate-400">Profile Views</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                  <PhotoIcon className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{products.length}</p>
                  <p className="text-sm text-slate-400">Products Listed</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                  <ChartBarIcon className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{typeof vendor.region === 'string' ? vendor.region : 'N/A'}</p>
                  <p className="text-sm text-slate-400">Region</p>
                </div>
              </div>
            </div>
          </div>

          {/* Draft Warning */}
          {vendor.status === 'draft' && (
            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-6">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="h-6 w-6 text-amber-500 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-amber-500">Your listing is in draft mode</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Complete your profile and click &quot;Publish&quot; to make your business visible to customers.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Listing Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Your Listing Preview</h3>
              <span className="text-xs text-slate-500">This is how customers see your shop</span>
            </div>
            <div className="rounded-2xl bg-slate-800/50 border border-slate-700 overflow-hidden">
              <div className="h-32 bg-gradient-to-br from-teal-600/30 to-emerald-600/30 relative">
                {vendor.logoUrl && (
                  <div className="absolute -bottom-8 left-6">
                    <Image
                      src={vendor.logoUrl}
                      alt={vendor.businessName}
                      width={80}
                      height={80}
                      className="rounded-xl border-4 border-slate-800 object-cover"
                    />
                  </div>
                )}
                {!vendor.logoUrl && (
                  <div className="absolute -bottom-8 left-6 flex h-20 w-20 items-center justify-center rounded-xl border-4 border-slate-800 bg-gradient-to-br from-teal-500 to-teal-600 text-3xl font-bold text-white">
                    {vendor.businessName.charAt(0)}
                  </div>
                )}
              </div>

              <div className="pt-12 px-6 pb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xl font-bold text-white">{vendor.businessName}</h4>
                    {vendor.tagline && typeof vendor.tagline === 'string' && (
                      <p className="text-slate-400 mt-1">{vendor.tagline}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-slate-400">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-3 py-1 text-teal-400">
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
                    onClick={() => setActiveSubTab('profile')}
                    className="flex items-center gap-1.5 text-sm text-teal-400 hover:text-teal-300 transition-colors"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                    Edit
                  </button>
                </div>

                {vendor.description && typeof vendor.description === 'string' && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <p className="text-slate-300 text-sm line-clamp-3">{vendor.description}</p>
                  </div>
                )}

                {products.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-slate-400">Products ({products.length})</span>
                      <button
                        onClick={() => setActiveSubTab('products')}
                        className="text-xs text-teal-400 hover:text-teal-300"
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
                              <PhotoIcon className="h-6 w-6 text-slate-500" />
                            </div>
                          )}
                        </div>
                      ))}
                      {products.length > 4 && (
                        <div className="flex-shrink-0 w-20 h-20 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-400 text-sm">
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

      {/* Profile Sub-tab / New Vendor Form */}
      {(activeSubTab === 'profile' || isNewVendor) && (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Business Info */}
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Business Information</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Logo Upload */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Business Logo
                </label>
                <div className="flex items-center gap-6">
                  <div className="flex-shrink-0">
                    {formData.logoUrl ? (
                      <div className="relative">
                        <Image
                          src={formData.logoUrl}
                          alt="Business logo"
                          width={80}
                          height={80}
                          className="rounded-xl object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, logoUrl: '' })}
                          className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                        >
                          <span className="text-xs">x</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-slate-700 border border-slate-600">
                        <PhotoIcon className="h-8 w-8 text-slate-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="relative cursor-pointer">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !vendor) return;

                          setUploadingLogo(true);
                          setUploadProgress(0);
                          try {
                            const url = await uploadProfileImage(file, vendor.id, (progress) => {
                              setUploadProgress(progress.progress);
                            });
                            setFormData({ ...formData, logoUrl: url });
                          } catch (error) {
                            console.error('Failed to upload logo:', error);
                            alert('Failed to upload logo. Please try again.');
                          } finally {
                            setUploadingLogo(false);
                          }
                        }}
                        disabled={uploadingLogo || !vendor}
                      />
                      <span className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        uploadingLogo || !vendor
                          ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                          : 'bg-slate-700 text-white hover:bg-slate-600'
                      }`}>
                        {uploadingLogo ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
                            Uploading {Math.round(uploadProgress)}%
                          </>
                        ) : (
                          <>
                            <PhotoIcon className="h-4 w-4" />
                            {formData.logoUrl ? 'Change Logo' : 'Upload Logo'}
                          </>
                        )}
                      </span>
                    </label>
                    <p className="mt-2 text-xs text-slate-500">
                      {!vendor ? 'Save your profile first to upload a logo' : 'JPEG, PNG or WebP, max 10MB'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  className="w-full rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-white placeholder-slate-400 focus:border-teal-500 focus:outline-none"
                  placeholder="Your business name"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">Tagline</label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  className="w-full rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-white placeholder-slate-400 focus:border-teal-500 focus:outline-none"
                  placeholder="A short tagline for your business"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Category *</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as VendorCategory })}
                  className="w-full rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-white focus:border-teal-500 focus:outline-none"
                >
                  {VENDOR_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nation / Affiliation
                </label>
                <input
                  type="text"
                  value={formData.nation}
                  onChange={(e) => setFormData({ ...formData, nation: e.target.value })}
                  className="w-full rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-white placeholder-slate-400 focus:border-teal-500 focus:outline-none"
                  placeholder="e.g., Cree, Metis, Inuit"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  About Your Business *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-white placeholder-slate-400 focus:border-teal-500 focus:outline-none"
                  placeholder="Tell customers about your business, what you offer, and what makes you unique..."
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Your Story (Optional)
                </label>
                <textarea
                  rows={3}
                  value={formData.communityStory}
                  onChange={(e) => setFormData({ ...formData, communityStory: e.target.value })}
                  className="w-full rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-white placeholder-slate-400 focus:border-teal-500 focus:outline-none"
                  placeholder="Share your story, your connection to your community, and what inspires your work..."
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Location & Shipping</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">City / Town</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-white placeholder-slate-400 focus:border-teal-500 focus:outline-none"
                  placeholder="e.g., Toronto"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Province / State *</label>
                <select
                  required
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value as NorthAmericanRegion })}
                  className="w-full rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-white focus:border-teal-500 focus:outline-none"
                >
                  {NORTH_AMERICAN_REGIONS.map((region) => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 flex flex-wrap gap-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.offersShipping}
                    onChange={(e) => setFormData({ ...formData, offersShipping: e.target.checked })}
                    className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-teal-500 focus:ring-teal-500"
                  />
                  <span className="text-slate-300">Offers Shipping</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.onlineOnly}
                    onChange={(e) => setFormData({ ...formData, onlineOnly: e.target.checked })}
                    className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-teal-500 focus:ring-teal-500"
                  />
                  <span className="text-slate-300">Online only (no physical location)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Contact & Social */}
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Contact & Social Media</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-white placeholder-slate-400 focus:border-teal-500 focus:outline-none"
                  placeholder="contact@yourbusiness.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-white placeholder-slate-400 focus:border-teal-500 focus:outline-none"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-white placeholder-slate-400 focus:border-teal-500 focus:outline-none"
                  placeholder="https://yourbusiness.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Instagram</label>
                <input
                  type="text"
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  className="w-full rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-white placeholder-slate-400 focus:border-teal-500 focus:outline-none"
                  placeholder="@yourbusiness"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Facebook</label>
                <input
                  type="text"
                  value={formData.facebook}
                  onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                  className="w-full rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-white placeholder-slate-400 focus:border-teal-500 focus:outline-none"
                  placeholder="facebook.com/yourbusiness"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">TikTok</label>
                <input
                  type="text"
                  value={formData.tiktok}
                  onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
                  className="w-full rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-white placeholder-slate-400 focus:border-teal-500 focus:outline-none"
                  placeholder="@yourbusiness"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            {!isNewVendor && (
              <button
                type="button"
                onClick={() => setActiveSubTab('overview')}
                className="px-6 py-3 rounded-lg text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-8 py-3 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : isNewVendor ? 'Create Listing' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}

      {/* Products Sub-tab */}
      {activeSubTab === 'products' && vendor && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Products & Services</h3>
              <p className="text-sm text-slate-400">Add products or services to showcase on your profile.</p>
            </div>
            <button
              onClick={() => {
                setEditingProduct(null);
                setShowProductModal(true);
              }}
              className="flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Add Product
            </button>
          </div>

          {products.length === 0 ? (
            <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-12 text-center">
              <PhotoIcon className="mx-auto h-12 w-12 text-slate-600" />
              <h4 className="mt-4 text-lg font-semibold text-white">No products yet</h4>
              <p className="mt-2 text-slate-400">
                Add products or services to help customers discover what you offer.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  onClick={() => setPreviewProduct(product)}
                  className="rounded-xl bg-slate-800/50 border border-slate-700 overflow-hidden group cursor-pointer hover:border-teal-500/50 transition-colors"
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
                          className="p-1.5 rounded-lg bg-slate-700 hover:bg-teal-500/20 text-slate-300 hover:text-teal-400 transition-colors"
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
                          className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                          title="Edit product"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProduct(product.id);
                          }}
                          className="p-1.5 rounded-lg bg-slate-700 hover:bg-red-500/20 text-slate-300 hover:text-red-400 transition-colors"
                          title="Delete product"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-slate-400 mt-1 line-clamp-2">{product.description}</p>
                    {product.priceDisplay && (
                      <p className="mt-2 text-teal-400 font-semibold">{product.priceDisplay}</p>
                    )}
                    <p className="mt-2 text-xs text-slate-500">Click to preview</p>
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
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Current Status */}
      <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Subscription Status</h3>

        {hasActiveSubscription && !isExpired ? (
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
              <CheckCircleIcon className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-semibold">Active Subscription</p>
              <p className="text-sm text-slate-400">
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
              <p className="text-sm text-slate-400">
                Subscribe to make your business visible in Shop Indigenous.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Pricing Plans */}
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Choose Your Plan</h3>
        <p className="text-slate-400 mb-6">
          Get your Indigenous-owned business in front of customers across North America.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Monthly Plan */}
          <div className="relative rounded-2xl bg-slate-800/50 border border-slate-700 p-6 hover:border-teal-500/50 transition-colors">
            <div className="absolute -top-3 left-6">
              <span className="rounded-full bg-teal-500 px-3 py-1 text-xs font-semibold text-white">
                First Month Free
              </span>
            </div>

            <h4 className="text-lg font-bold text-white mt-2">{VENDOR_PRODUCTS.MONTHLY.name}</h4>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white">${VENDOR_PRODUCTS.MONTHLY.price / 100}</span>
              <span className="text-slate-400">/month</span>
            </div>
            <p className="mt-2 text-sm text-slate-400">{VENDOR_PRODUCTS.MONTHLY.description}</p>

            <ul className="mt-4 space-y-2">
              {VENDOR_PRODUCTS.MONTHLY.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircleIcon className="h-4 w-4 text-teal-400 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe('MONTHLY')}
              disabled={loading}
              className="mt-6 w-full rounded-lg bg-slate-700 py-3 font-semibold text-white hover:bg-slate-600 transition-colors disabled:opacity-50"
            >
              {loading && selectedPlan === 'MONTHLY' ? 'Processing...' : 'Start Free Trial'}
            </button>
          </div>

          {/* Annual Plan */}
          <div className="relative rounded-2xl bg-gradient-to-br from-teal-500/10 to-emerald-500/10 border-2 border-teal-500/50 p-6">
            <div className="absolute -top-3 left-6">
              <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-xs font-semibold text-white">
                <SparklesIcon className="h-3 w-3" />
                Best Value
              </span>
            </div>

            <h4 className="text-lg font-bold text-white mt-2">{VENDOR_PRODUCTS.ANNUAL.name}</h4>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white">${VENDOR_PRODUCTS.ANNUAL.price / 100}</span>
              <span className="text-slate-400">/year</span>
            </div>
            <p className="mt-2 text-sm text-slate-400">{VENDOR_PRODUCTS.ANNUAL.description}</p>

            <ul className="mt-4 space-y-2">
              {VENDOR_PRODUCTS.ANNUAL.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircleIcon className="h-4 w-4 text-teal-400 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe('ANNUAL')}
              disabled={loading}
              className="mt-6 w-full rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 py-3 font-semibold text-white shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 transition-all disabled:opacity-50"
            >
              {loading && selectedPlan === 'ANNUAL' ? 'Processing...' : 'Subscribe Now'}
            </button>
          </div>
        </div>
      </div>

      <div className="text-center text-sm text-slate-500">
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
      alert('Please fill in the required fields.');
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
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-xl my-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">
            {product ? 'Edit Product' : 'Add Product'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
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
                <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-slate-800 border border-slate-700">
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
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
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
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Product Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
              placeholder="e.g., Handcrafted Beaded Earrings"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description *
            </label>
            <textarea
              required
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
              placeholder="Describe your product..."
            />
          </div>

          {/* Category & Price */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
                placeholder="e.g., Jewelry, Art, Clothing"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Price Display
              </label>
              <input
                type="text"
                value={formData.priceDisplay}
                onChange={(e) => setFormData({ ...formData, priceDisplay: e.target.value })}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
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
                className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-teal-500 focus:ring-teal-500"
              />
              <span className="text-slate-300">In Stock</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.madeToOrder}
                onChange={(e) => setFormData({ ...formData, madeToOrder: e.target.checked })}
                className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-teal-500 focus:ring-teal-500"
              />
              <span className="text-slate-300">Made to Order</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.featured}
                onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-teal-500 focus:ring-teal-500"
              />
              <span className="text-slate-300">Featured</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-6 py-3 rounded-lg text-slate-300 hover:text-white transition-colors"
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
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center gap-2">
            <EyeIcon className="h-5 w-5 text-teal-400" />
            <span className="text-sm font-medium text-slate-300">Customer View Preview</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
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
                className="object-contain bg-slate-950"
              />
            </div>
          ) : (
            <div className="w-full aspect-video max-h-60 bg-slate-800 flex items-center justify-center">
              <PhotoIcon className="h-20 w-20 text-slate-600" />
            </div>
          )}

          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">{product.name}</h2>
                {product.category && (
                  <span className="inline-block mt-2 text-sm text-teal-400 bg-teal-500/10 px-3 py-1 rounded-full">
                    {product.category}
                  </span>
                )}
              </div>
              {product.priceDisplay && (
                <p className="text-2xl font-bold text-teal-400">{product.priceDisplay}</p>
              )}
            </div>

            <p className="text-slate-300 leading-relaxed">{product.description}</p>

            <div className="flex flex-wrap gap-2">
              {product.inStock && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
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

            <div className="pt-4 border-t border-slate-700">
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
                  <p className="text-sm text-slate-400">
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
        <div className="flex justify-between gap-4 p-4 border-t border-slate-700 bg-slate-800/50">
          <p className="text-xs text-slate-500 self-center">
            This is how customers will see your product
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-300 hover:text-white transition-colors"
            >
              Close
            </button>
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-500 text-white font-medium hover:bg-teal-600 transition-colors"
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
