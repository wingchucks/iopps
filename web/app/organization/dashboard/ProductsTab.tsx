'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  PhotoIcon,
  PlusIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  SparklesIcon,
  CubeIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/AuthProvider';
import {
  getVendorByUserId,
  getVendorProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '@/lib/firebase/shop';
import { uploadGalleryImage, uploadGalleryImages } from '@/lib/firebase/storage';
import type { Vendor, VendorProduct } from '@/lib/types';
import toast from "react-hot-toast";
import { useConfirmDialog, deleteConfirmOptions } from "@/hooks/useConfirmDialog";
import { RichTextEditor } from "@/components/forms/RichTextEditor";

/**
 * ProductsTab - Vendor product management
 *
 * Features:
 * - List all products with grid view
 * - Add/edit/delete products via modal
 * - Product preview modal
 * - Image upload support
 */
export default function ProductsTab() {
  const { user } = useAuth();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Product modal state
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<VendorProduct | null>(null);
  const [previewProduct, setPreviewProduct] = useState<VendorProduct | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      const vendorData = await getVendorByUserId(user.uid);
      if (vendorData) {
        setVendor(vendorData);
        const vendorProducts = await getVendorProducts(vendorData.id);
        setProducts(vendorProducts);
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

  const handleSaveProduct = async (
    productData: Omit<VendorProduct, 'id' | 'vendorId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!vendor) return;

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
      } else {
        await createProduct(vendor.id, productData);
      }
      await loadData();
      setShowProductModal(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product. Please try again.');
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    const confirmed = await confirm(deleteConfirmOptions(productName, "Product"));
    if (!confirmed) return;

    try {
      await deleteProduct(productId);
      await loadData();
      toast.success("Product deleted");
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product. Please try again.');
    }
  };

  const handleDuplicateProduct = (product: VendorProduct) => {
    setEditingProduct(null);
    setShowProductModal(true);
    // Pre-fill form data through the modal - we need to pass initial data
    // For now, store duplicated data in session and modal will pick it up
    sessionStorage.setItem('duplicateProductData', JSON.stringify({
      name: `${product.name} (Copy)`,
      description: product.description,
      category: product.category,
      priceDisplay: product.priceDisplay,
      imageUrl: product.imageUrl,
      inStock: product.inStock,
      madeToOrder: product.madeToOrder,
      featured: product.featured,
      sortOrder: product.sortOrder,
      active: product.active,
    }));
    toast.success("Duplicated! Edit and save as new product.");
  };

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
          Create your shop profile first to start adding products.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Products & Services</h3>
          <p className="text-sm text-slate-400">
            Add products or services to showcase on your profile.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingProduct(null);
            setShowProductModal(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-slate-950 hover:bg-accent-hover transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Add Product
        </button>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="rounded-2xl bg-card border border-card-border p-12 text-center">
          <PhotoIcon className="mx-auto h-12 w-12 text-slate-600" />
          <h4 className="mt-4 text-lg font-semibold text-white">No products yet</h4>
          <p className="mt-2 text-slate-400">
            Add products or services to help customers discover what you offer.
          </p>
          <button
            onClick={() => {
              setEditingProduct(null);
              setShowProductModal(true);
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-slate-950 hover:bg-accent-hover transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Add Your First Product
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div
              key={product.id}
              onClick={() => setPreviewProduct(product)}
              className="rounded-xl bg-card border border-card-border overflow-hidden group cursor-pointer hover:border-accent/50 transition-colors"
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
                      className="p-1.5 rounded-lg bg-slate-700 hover:bg-accent/20 text-slate-300 hover:text-accent transition-colors"
                      title="Preview product"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateProduct(product);
                      }}
                      className="p-1.5 rounded-lg bg-slate-700 hover:bg-blue-500/20 text-slate-300 hover:text-blue-400 transition-colors"
                      title="Duplicate product"
                    >
                      <DocumentDuplicateIcon className="h-4 w-4" />
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
                        handleDeleteProduct(product.id, product.name);
                      }}
                      className="p-1.5 rounded-lg bg-slate-700 hover:bg-red-500/20 text-slate-300 hover:text-red-400 transition-colors"
                      title="Delete product"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                  {product.description}
                </p>
                {product.priceDisplay && (
                  <p className="mt-2 text-accent font-semibold">{product.priceDisplay}</p>
                )}
                <p className="mt-2 text-xs text-slate-500">Click to preview</p>
              </div>
            </div>
          ))}
        </div>
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

      {/* Confirmation Dialog */}
      <ConfirmDialog />
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

  // Check for duplicated product data in sessionStorage
  const getInitialFormData = () => {
    if (product) {
      return {
        name: product.name || '',
        description: product.description || '',
        category: product.category || '',
        priceDisplay: product.priceDisplay || '',
        imageUrl: product.imageUrl || '',
        images: product.images || [],
        inStock: product.inStock ?? true,
        madeToOrder: product.madeToOrder ?? false,
        featured: product.featured ?? false,
        sortOrder: product.sortOrder ?? 0,
        active: product.active ?? true,
      };
    }

    // Check for duplicated data
    const duplicateData = sessionStorage.getItem('duplicateProductData');
    if (duplicateData) {
      sessionStorage.removeItem('duplicateProductData');
      try {
        const parsed = JSON.parse(duplicateData);
        return { ...parsed, images: parsed.images || [] };
      } catch {
        // Fall through to default
      }
    }

    return {
      name: '',
      description: '',
      category: '',
      priceDisplay: '',
      imageUrl: '',
      images: [] as string[],
      inStock: true,
      madeToOrder: false,
      featured: false,
      sortOrder: 0,
      active: true,
    };
  };

  const [formData, setFormData] = useState(getInitialFormData);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);

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

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingGallery(true);
    try {
      const results = await uploadGalleryImages(files, vendorId);
      const newUrls = results.map(r => r.url);
      setFormData({ ...formData, images: [...(formData.images || []), ...newUrls] });
      toast.success(`${files.length} image${files.length > 1 ? 's' : ''} uploaded`);
    } catch (error) {
      console.error('Failed to upload gallery images:', error);
      toast.error('Failed to upload some images. Please try again.');
    } finally {
      setUploadingGallery(false);
      if (galleryInputRef.current) {
        galleryInputRef.current.value = '';
      }
    }
  };

  const handleRemoveGalleryImage = (index: number) => {
    const newImages = [...(formData.images || [])];
    newImages.splice(index, 1);
    setFormData({ ...formData, images: newImages });
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
                  {uploadingImage
                    ? 'Uploading...'
                    : formData.imageUrl
                      ? 'Change Image'
                      : 'Upload Image'}
                </button>
              </div>
            </div>
          </div>

          {/* Gallery Images */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Gallery Images
            </label>
            <p className="text-xs text-slate-500 mb-3">
              Add multiple images to showcase your product from different angles
            </p>
            <div className="flex flex-wrap gap-3">
              {(formData.images || []).map((url: string, idx: number) => (
                <div key={idx} className="relative">
                  <Image
                    src={url}
                    alt={`Gallery ${idx + 1}`}
                    width={80}
                    height={80}
                    className="rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveGalleryImage(idx)}
                    className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 text-xs"
                  >
                    x
                  </button>
                </div>
              ))}
              <div>
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleGalleryUpload}
                />
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={uploadingGallery}
                  className={`flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
                    uploadingGallery
                      ? 'border-slate-600 text-slate-600 cursor-not-allowed'
                      : 'border-slate-600 text-slate-400 hover:border-accent hover:text-accent'
                  }`}
                >
                  {uploadingGallery ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                  ) : (
                    <PlusIcon className="h-6 w-6" />
                  )}
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
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-accent focus:outline-none"
              placeholder="e.g., Handcrafted Beaded Earrings"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description *
            </label>
            <RichTextEditor
              value={formData.description}
              onChange={(html) => setFormData({ ...formData, description: html })}
              placeholder="Describe your product..."
              minHeight="120px"
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
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-accent focus:outline-none"
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
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-accent focus:outline-none"
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
                className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-accent focus:ring-accent"
              />
              <span className="text-slate-300">In Stock</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.madeToOrder}
                onChange={(e) => setFormData({ ...formData, madeToOrder: e.target.checked })}
                className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-accent focus:ring-accent"
              />
              <span className="text-slate-300">Made to Order</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.featured}
                onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-accent focus:ring-accent"
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
              disabled={saving || uploadingImage || uploadingGallery}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-accent text-slate-950 font-semibold hover:bg-accent-hover transition-all disabled:opacity-50"
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
            <EyeIcon className="h-5 w-5 text-accent" />
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
                  <span className="inline-block mt-2 text-sm text-accent bg-accent/10 px-3 py-1 rounded-full">
                    {product.category}
                  </span>
                )}
              </div>
              {product.priceDisplay && (
                <p className="text-2xl font-bold text-accent">{product.priceDisplay}</p>
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-teal-600 text-lg font-bold text-white">
                    {vendor.businessName.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-medium text-white">{vendor.businessName}</p>
                  <p className="text-sm text-slate-400">
                    {typeof vendor.location === 'string' && vendor.location}
                    {typeof vendor.location === 'string' &&
                      typeof vendor.region === 'string' &&
                      ', '}
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
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-slate-950 font-medium hover:bg-accent-hover transition-colors"
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
