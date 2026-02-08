"use client";

import { useState, useRef, FormEvent, ChangeEvent } from "react";
import { useAuth } from "@/components/AuthProvider";
import { SlideOutPanel } from "@/components/shared/SlideOutPanel";
import { createProduct, getVendorByUserId } from "@/lib/firebase/shop";
import { uploadGalleryImage } from "@/lib/firebase/storage";
import { VENDOR_CATEGORIES } from "@/lib/types";
import type { VendorCategory } from "@/lib/types";
import toast from "react-hot-toast";

interface CreateProductPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateProductPanel({ isOpen, onClose, onSuccess }: CreateProductPanelProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<VendorCategory | "">("");
  const [priceDisplay, setPriceDisplay] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [inStock, setInStock] = useState(true);
  const [madeToOrder, setMadeToOrder] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

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
    setError(null);

    try {
      const result = await uploadGalleryImage(file, user.uid, () => {});
      setImageUrl(result.url);
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!name.trim()) {
      setError("Product name is required");
      return;
    }
    if (!description.trim()) {
      setError("Product description is required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const vendor = await getVendorByUserId(user.uid);
      if (!vendor) {
        setError("You need to set up your shop profile before adding products.");
        setSubmitting(false);
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
        featured: false,
        sortOrder: 0,
        active: true,
      });

      toast.success("Product added successfully!");
      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to create product");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setCategory("");
    setPriceDisplay("");
    setImageUrl("");
    setInStock(true);
    setMadeToOrder(false);
    setError(null);
  };

  return (
    <SlideOutPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Add Product"
      footer={
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-surface transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e as unknown as FormEvent)}
            disabled={submitting || uploading}
            className="rounded-lg bg-accent px-6 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Add Product"}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Product Image */}
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-[var(--text-primary)] border-b border-[var(--card-border)] pb-2">
            Product Image
          </h3>

          {imageUrl ? (
            <div className="relative w-fit">
              <img
                src={imageUrl}
                alt="Product preview"
                className="h-32 w-48 rounded-lg object-cover border border-[var(--card-border)]"
              />
              <button
                type="button"
                onClick={() => setImageUrl("")}
                className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex h-32 w-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--card-border)] bg-surface hover:border-accent/50 transition-colors"
            >
              {uploading ? (
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
              ) : (
                <>
                  <svg className="h-8 w-8 text-foreground0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="mt-1 text-xs text-foreground0">Upload image</span>
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
        </section>

        {/* Product Information */}
        <section className="space-y-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)] border-b border-[var(--card-border)] pb-2">
            Product Information
          </h3>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Product Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Handcrafted Beaded Earrings"
              className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe your product, materials, dimensions..."
              className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as VendorCategory)}
              className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
            >
              <option value="">Select a category</option>
              {VENDOR_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Price Display</label>
            <input
              type="text"
              value={priceDisplay}
              onChange={(e) => setPriceDisplay(e.target.value)}
              placeholder="e.g., $45.00, From $50, Contact for pricing"
              className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
            />
            <p className="mt-1 text-xs text-foreground0">Flexible format for how price appears to customers</p>
          </div>
        </section>

        {/* Availability */}
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-[var(--text-primary)] border-b border-[var(--card-border)] pb-2">
            Availability
          </h3>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => setInStock(e.target.checked)}
              className="h-5 w-5 rounded border-[var(--card-border)] bg-surface text-accent focus:ring-accent"
            />
            <div>
              <span className="text-sm text-[var(--text-secondary)] font-medium">In Stock</span>
              <p className="text-xs text-foreground0">Available for purchase</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={madeToOrder}
              onChange={(e) => setMadeToOrder(e.target.checked)}
              className="h-5 w-5 rounded border-[var(--card-border)] bg-surface text-accent focus:ring-accent"
            />
            <div>
              <span className="text-sm text-[var(--text-secondary)] font-medium">Made to Order</span>
              <p className="text-xs text-foreground0">Custom-made when ordered</p>
            </div>
          </label>
        </section>
      </form>
    </SlideOutPanel>
  );
}

export default CreateProductPanel;
