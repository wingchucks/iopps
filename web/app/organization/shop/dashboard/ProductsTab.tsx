"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  listVendorShopListings,
  createShopListingForVendor,
  updateShopListingForVendor,
  deleteShopListingForVendor,
} from "@/lib/firestore";
import { storage } from "@/lib/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import type { ProductServiceListing } from "@/lib/types";

export default function ProductsTab() {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductServiceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
    tags: "",
    imageUrl: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // File input ref
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadProducts();
  }, [user]);

  const loadProducts = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listVendorShopListings(user.uid);
      setProducts(data);
    } catch (err) {
      console.error(err);
      setError("Unable to load your products.");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const tagsArray = formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const productData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        price: formData.price || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        imageUrl: formData.imageUrl || undefined,
      };

      if (editingId) {
        // Update existing
        await updateShopListingForVendor(editingId, productData);
        setSuccessMessage("Product updated successfully!");
      } else {
        // Create new
        await createShopListingForVendor(user.uid, productData);
        setSuccessMessage("Product created successfully!");
      }

      // Reload products
      await loadProducts();

      // Reset form
      setFormData({
        name: "",
        description: "",
        category: "",
        price: "",
        tags: "",
        imageUrl: "",
      });
      setEditingId(null);
      setShowForm(false);
    } catch (err) {
      console.error(err);
      setError("Unable to save product. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (product: ProductServiceListing) => {
    setFormData({
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price || "",
      tags: (product.tags || []).join(", "),
      imageUrl: product.imageUrl || "",
    });
    setEditingId(product.id);
    setShowForm(true);
    setSuccessMessage(null);
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await deleteShopListingForVendor(id);
      await loadProducts();
      setDeleteConfirmId(null);
      setSuccessMessage("Product deleted successfully!");
    } catch (err) {
      console.error(err);
      setError("Unable to delete product. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelEdit = () => {
    setFormData({
      name: "",
      description: "",
      category: "",
      price: "",
      tags: "",
      imageUrl: "",
    });
    setEditingId(null);
    setShowForm(false);
  };

  // Image upload handler
  const handleImageUpload = async (file: File) => {
    if (!file || !user) return;

    setUploadingImage(true);
    setError(null);

    try {
      const fileExtension = file.name.split(".").pop();
      const fileName = `vendors/${user.uid}/products/product-${Date.now()}.${fileExtension}`;
      const storageRef = ref(storage!, fileName);

      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      setFormData({ ...formData, imageUrl: url });
      setSuccessMessage("Image uploaded successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Image upload error:", err);
      setError("Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
        <h2 className="text-2xl font-bold text-white">Products & Services</h2>
        <p className="mt-2 text-slate-400">
          Manage your product and service listings
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-4 text-sm text-green-100">
          {successMessage}
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="text-sm font-semibold text-amber-100">
            Are you sure you want to delete this product?
          </p>
          <p className="mt-1 text-xs text-amber-200">
            This action cannot be undone.
          </p>
          <div className="mt-3 flex gap-3">
            <button
              onClick={() => handleDelete(deleteConfirmId)}
              disabled={deleting}
              className="rounded-md bg-red-600 px-3 py-1 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
            <button
              onClick={() => setDeleteConfirmId(null)}
              disabled={deleting}
              className="rounded-md border border-slate-700 px-3 py-1 text-sm text-slate-200 transition hover:border-slate-600 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add New Button */}
      {!showForm && (
        <div>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setSuccessMessage(null);
            }}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/50"
          >
            + Add New Product/Service
          </button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-8 shadow-xl">
          <h3 className="mb-6 text-xl font-semibold text-white">
            {editingId ? "Edit Product/Service" : "Add New Product/Service"}
          </h3>

          <form onSubmit={handleFormSubmit} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Product/Service Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Beaded earrings, Wellness circle, etc."
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Category *
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  required
                  className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Jewelry, Wellness, Art, etc."
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
                rows={4}
                className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Describe your product or service..."
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Price (optional)
                </label>
                <input
                  type="text"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="$50, Starting at $100, etc."
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                  className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="handmade, traditional, custom"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Product Image (optional)
              </label>

              {/* Image preview */}
              {formData.imageUrl && (
                <div className="mb-3 rounded-lg border border-emerald-500/20 bg-slate-900/50 p-3">
                  <p className="mb-2 text-xs text-slate-400">Current image:</p>
                  <div className="flex items-start gap-3">
                    <img
                      src={formData.imageUrl}
                      alt="Product preview"
                      className="h-24 w-24 rounded-lg border border-emerald-500/30 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, imageUrl: "" })}
                      className="text-xs text-red-400 transition hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              {/* Upload button */}
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploadingImage ? "Uploading..." : formData.imageUrl ? "Change image" : "Upload image"}
                </button>
                <span className="text-xs text-slate-500">or paste URL below</span>
              </div>

              {/* URL input as fallback */}
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) =>
                  setFormData({ ...formData, imageUrl: e.target.value })
                }
                className="mt-2 w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? "Saving..."
                  : editingId
                  ? "Update Product"
                  : "Add Product"}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="rounded-xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-300 transition-all hover:border-slate-600 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products List */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
        <h3 className="mb-6 text-lg font-semibold text-white">
          Your Products & Services ({products.length})
        </h3>

        {loading ? (
          <p className="text-center text-slate-400">Loading products...</p>
        ) : products.length === 0 ? (
          <div className="rounded-xl bg-slate-900/50 p-8 text-center">
            <p className="text-slate-300">
              You haven't added any products or services yet.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 inline-block rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/50"
            >
              Add your first product
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <article
                key={product.id}
                className="rounded-xl border border-emerald-500/20 bg-slate-900/50 p-5"
              >
                {product.imageUrl && (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="mb-4 h-40 w-full rounded-lg object-cover"
                  />
                )}
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-white">
                      {product.name}
                    </h4>
                    <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">
                      {product.category}
                    </p>
                  </div>
                  {product.price && (
                    <span className="text-sm font-semibold text-slate-300">
                      {product.price}
                    </span>
                  )}
                </div>
                <p className="mb-3 text-sm text-slate-300">
                  {product.description.length > 100
                    ? `${product.description.slice(0, 100)}...`
                    : product.description}
                </p>
                {product.tags && product.tags.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {product.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(product)}
                    className="rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-300 transition-all hover:bg-emerald-500/30"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(product.id)}
                    className="rounded-lg bg-red-500/20 px-3 py-2 text-sm font-semibold text-red-300 transition-all hover:bg-red-500/30"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
