"use client";

import { FormEvent, useState, useRef, ChangeEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { createProduct, getVendorByUserId } from "@/lib/firebase/shop";
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

export default function NewProductPage() {
  const router = useRouter();
  const { user, role, loading } = useAuth();
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

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-slate-300">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Please sign in</h1>
        <p className="text-sm text-slate-300">
          You need to be signed in to list products.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600 transition-colors"
        >
          Login
        </Link>
      </div>
    );
  }

  // Only employers/vendors can create products - community members must upgrade
  if (role === "community") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Become a Vendor</h1>
        <p className="text-sm text-slate-300">
          To list products on the Indigenous Marketplace, you need to register as a vendor or organization.
        </p>
        <div className="flex gap-3">
          <Link
            href="/organization/register"
            className="inline-block rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600 transition-colors"
          >
            Register as Organization
          </Link>
          <Link
            href="/business"
            className="inline-block rounded-md border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a JPEG, PNG, or WebP image");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const result = await uploadGalleryImage(
        file,
        user.uid,
        (progress) => setUploadProgress(progress.progress)
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
    if (!user) return;

    // Validate required fields
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
      // Get vendor profile - products require a vendor
      const vendor = await getVendorByUserId(user.uid);

      if (!vendor) {
        setError(
          "You need to set up your shop profile before adding products. Please complete your shop profile first."
        );
        setSaving(false);
        return;
      }

      await createProduct(vendor.id, {
        name: name.trim(),
        description: description.trim(),
        category: category || "Other",
        priceDisplay: priceDisplay.trim() || undefined,
        imageUrl: imageUrl || undefined,
        inStock,
        madeToOrder,
        featured,
        sortOrder: 0,
        active: true,
      });

      router.push("/organization/sell/offerings");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Could not create product listing."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <Link
          href="/organization/sell/offerings"
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          ← Back to Offerings
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600">
          <CubeIcon className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Add New Product</h1>
      </div>
      <p className="text-sm text-slate-300 mb-6">
        List your product in the Indigenous Marketplace for customers to discover.
      </p>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Product Image */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <PhotoIcon className="h-5 w-5 text-teal-400" />
            <h2 className="text-lg font-semibold text-white">Product Image</h2>
          </div>

          <div className="space-y-4">
            {imageUrl ? (
              <div className="relative">
                <div className="relative aspect-video w-full max-w-md rounded-lg overflow-hidden bg-slate-800">
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
                className="aspect-video w-full max-w-md rounded-lg border-2 border-dashed border-slate-700 bg-slate-800/50 flex flex-col items-center justify-center cursor-pointer hover:border-slate-600 hover:bg-slate-800 transition-colors"
              >
                {uploading ? (
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm text-slate-400">
                      Uploading... {uploadProgress}%
                    </p>
                  </div>
                ) : (
                  <>
                    <ArrowUpTrayIcon className="h-10 w-10 text-slate-500 mb-2" />
                    <p className="text-sm text-slate-400">
                      Click to upload product image
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      JPEG, PNG, or WebP (max 5MB)
                    </p>
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
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CubeIcon className="h-5 w-5 text-teal-400" />
            <h2 className="text-lg font-semibold text-white">Product Information</h2>
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
                rows={5}
                placeholder="Describe your product, materials used, dimensions, care instructions..."
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
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CurrencyDollarIcon className="h-5 w-5 text-teal-400" />
            <h2 className="text-lg font-semibold text-white">Pricing</h2>
          </div>

          <div className="space-y-4">
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
              <p className="mt-1 text-xs text-slate-500">
                How the price appears to customers (flexible format)
              </p>
            </div>
          </div>
        </section>

        {/* Availability */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircleIcon className="h-5 w-5 text-teal-400" />
            <h2 className="text-lg font-semibold text-white">Availability</h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => setInStock(e.target.checked)}
                className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-teal-500 focus:ring-teal-500"
              />
              <div>
                <span className="text-sm text-slate-300 font-medium">In Stock</span>
                <p className="text-xs text-slate-500">
                  This product is currently available for purchase
                </p>
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
                <p className="text-xs text-slate-500">
                  This product is custom-made when ordered
                </p>
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
                <p className="text-xs text-slate-500">
                  Highlight this product in your shop
                </p>
              </div>
            </label>
          </div>
        </section>

        {/* Submit */}
        <div className="flex items-center justify-between pt-4">
          <Link
            href="/organization/sell/offerings"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || uploading}
            className="rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-8 py-3 font-semibold text-white hover:from-teal-600 hover:to-emerald-600 transition-colors disabled:opacity-60"
          >
            {saving ? "Creating..." : "Add Product"}
          </button>
        </div>
      </form>
    </div>
  );
}
