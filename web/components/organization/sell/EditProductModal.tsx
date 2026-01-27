"use client";

import { FormEvent, useState, useRef, ChangeEvent, useEffect } from "react";
import Image from "next/image";
import { updateProduct, getProduct } from "@/lib/firebase/shop";
import { uploadGalleryImage } from "@/lib/firebase/storage";
import { VENDOR_CATEGORIES } from "@/lib/types";
import type { VendorCategory } from "@/lib/types";
import {
  CubeIcon,
  PhotoIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  productId: string;
  userId: string;
}

export default function EditProductModal({
  isOpen,
  onClose,
  onSaved,
  productId,
  userId,
}: EditProductModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<VendorCategory | "">("");
  const [priceDisplay, setPriceDisplay] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [inStock, setInStock] = useState(true);
  const [madeToOrder, setMadeToOrder] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [active, setActive] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load product data when modal opens
  useEffect(() => {
    if (isOpen && productId) {
      loadProduct();
    }
  }, [isOpen, productId]);

  const loadProduct = async () => {
    setLoading(true);
    setError(null);
    try {
      const product = await getProduct(productId);
      if (product) {
        setName(product.name || "");
        setDescription(product.description || "");
        setCategory((product.category as VendorCategory) || "");
        setPriceDisplay(product.priceDisplay || "");
        setImageUrl(product.imageUrl || "");
        setInStock(product.inStock ?? true);
        setMadeToOrder(product.madeToOrder ?? false);
        setFeatured(product.featured ?? false);
        setActive(product.active ?? true);
      }
    } catch (err) {
      console.error("Error loading product:", err);
      setError("Failed to load product data");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a JPEG, PNG, or WebP image");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const result = await uploadGalleryImage(file, userId, (progress) =>
        setUploadProgress(progress.progress)
      );
      setImageUrl(result.url);
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Product name is required");
      return;
    }
    if (!description.trim()) {
      setError("Product description is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await updateProduct(productId, {
        name: name.trim(),
        description: description.trim(),
        category: category || "Other",
        priceDisplay: priceDisplay.trim() || undefined,
        imageUrl: imageUrl || undefined,
        inStock,
        madeToOrder,
        featured,
        active,
      });

      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Could not update product."
      );
    } finally {
      setSaving(false);
    }
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-product-title"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600">
              <CubeIcon className="h-5 w-5 text-white" />
            </div>
            <h2 id="edit-product-title" className="text-xl font-semibold text-slate-100">
              Edit Product
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            {/* Product Image */}
            <section className="rounded-xl border border-slate-800 bg-slate-800/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <PhotoIcon className="h-4 w-4 text-teal-400" />
                <h3 className="text-sm font-semibold text-white">Product Image</h3>
              </div>

              <div>
                {imageUrl ? (
                  <div className="relative">
                    <div className="relative aspect-video w-full max-w-sm rounded-lg overflow-hidden bg-slate-800">
                      <Image
                        src={imageUrl}
                        alt="Product preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="absolute top-2 right-2 p-1 bg-slate-900/80 rounded-full hover:bg-slate-800 transition-colors"
                    >
                      <XMarkIcon className="h-5 w-5 text-slate-300" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-video w-full max-w-sm rounded-lg border-2 border-dashed border-slate-700 bg-slate-800/50 flex flex-col items-center justify-center cursor-pointer hover:border-slate-600 hover:bg-slate-800 transition-colors"
                  >
                    {uploading ? (
                      <div className="text-center">
                        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-sm text-slate-400">
                          Uploading... {uploadProgress}%
                        </p>
                      </div>
                    ) : (
                      <>
                        <ArrowUpTrayIcon className="h-8 w-8 text-slate-500 mb-2" />
                        <p className="text-sm text-slate-400">Click to upload image</p>
                        <p className="text-xs text-slate-500 mt-1">JPEG, PNG, or WebP (max 5MB)</p>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </section>

            {/* Product Information */}
            <section className="rounded-xl border border-slate-800 bg-slate-800/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <CubeIcon className="h-4 w-4 text-teal-400" />
                <h3 className="text-sm font-semibold text-white">Product Information</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Handcrafted Beaded Earrings"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200">
                    Description *
                  </label>
                  <textarea
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Describe your product..."
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as VendorCategory)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
                  >
                    <option value="">Select a category</option>
                    {VENDOR_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Pricing */}
            <section className="rounded-xl border border-slate-800 bg-slate-800/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <CurrencyDollarIcon className="h-4 w-4 text-teal-400" />
                <h3 className="text-sm font-semibold text-white">Pricing</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Price Display
                </label>
                <input
                  type="text"
                  value={priceDisplay}
                  onChange={(e) => setPriceDisplay(e.target.value)}
                  placeholder="e.g., $45.00, From $50, Contact for pricing"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
                />
              </div>
            </section>

            {/* Availability & Status */}
            <section className="rounded-xl border border-slate-800 bg-slate-800/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircleIcon className="h-4 w-4 text-teal-400" />
                <h3 className="text-sm font-semibold text-white">Availability & Status</h3>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-teal-500 focus:ring-teal-500"
                  />
                  <div>
                    <span className="text-sm text-slate-300 font-medium">Active</span>
                    <p className="text-xs text-slate-500">Product is visible in the marketplace</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStock}
                    onChange={(e) => setInStock(e.target.checked)}
                    className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-teal-500 focus:ring-teal-500"
                  />
                  <div>
                    <span className="text-sm text-slate-300 font-medium">In Stock</span>
                    <p className="text-xs text-slate-500">Currently available for purchase</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={madeToOrder}
                    onChange={(e) => setMadeToOrder(e.target.checked)}
                    className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-teal-500 focus:ring-teal-500"
                  />
                  <div>
                    <span className="text-sm text-slate-300 font-medium">Made to Order</span>
                    <p className="text-xs text-slate-500">Custom-made when ordered</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-teal-500 focus:ring-teal-500"
                  />
                  <div>
                    <span className="text-sm text-slate-300 font-medium">Featured Product</span>
                    <p className="text-xs text-slate-500">Highlight in your shop</p>
                  </div>
                </label>
              </div>
            </section>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || uploading}
                className="rounded-lg bg-teal-600 px-6 py-2 text-sm font-semibold text-white hover:bg-teal-500 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
