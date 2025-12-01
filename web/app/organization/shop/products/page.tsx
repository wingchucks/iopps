"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
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

export default function VendorProductsPage() {
  const { user, loading: authLoading } = useAuth();
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
    if (!user || authLoading) return;

    const load = async () => {
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

    void load();
  }, [user, authLoading]);

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
        setProducts(
          products.map((p) =>
            p.id === editingId ? { ...p, ...productData } : p
          )
        );
        setSuccessMessage("Product updated successfully!");
      } else {
        // Create new
        const newId = await createShopListingForVendor(user.uid, productData);
        const newProduct: ProductServiceListing = {
          id: newId,
          vendorId: user.uid,
          ...productData,
          active: true,
          createdAt: null,
        };
        setProducts([newProduct, ...products]);
        setSuccessMessage("Product created successfully!");
      }

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
      setProducts(products.filter((p) => p.id !== id));
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0F] px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0D0D0F] px-4 py-10">
        <div className="mx-auto max-w-5xl space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
            Please sign in
          </h1>
          <p className="text-sm text-slate-300">
            You must be logged in to manage products.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-[#0D0D0F] transition-colors hover:bg-[#14B8A6]/90"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0F] px-4 py-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Vendor Dashboard
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-50">
            Manage Products & Services
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Add, edit, and manage your product and service listings
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 rounded-xl border border-green-500/40 bg-green-500/10 p-4 text-sm text-green-100">
            {successMessage}
          </div>
        )}

        {/* Delete Confirmation */}
        {deleteConfirmId && (
          <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
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
          <div className="mb-6">
            <button
              onClick={() => {
                setShowForm(true);
                setEditingId(null);
                setSuccessMessage(null);
              }}
              className="rounded-full bg-[#14B8A6] px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-[#14B8A6]/90"
            >
              Add New Product/Service
            </button>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="mb-8 rounded-2xl border border-slate-800 bg-[#08090C] p-6 shadow-lg shadow-black/30">
            <h2 className="mb-6 text-xl font-semibold text-slate-50">
              {editingId ? "Edit Product/Service" : "Add New Product/Service"}
            </h2>

            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-semibold text-slate-200"
                  >
                    Product/Service Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
                    placeholder="Beaded earrings, Wellness circle, etc."
                  />
                </div>

                <div>
                  <label
                    htmlFor="category"
                    className="block text-sm font-semibold text-slate-200"
                  >
                    Category *
                  </label>
                  <input
                    type="text"
                    id="category"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    required
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
                    placeholder="Jewelry, Wellness, Art, etc."
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-semibold text-slate-200"
                >
                  Description *
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  required
                  rows={4}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
                  placeholder="Describe your product or service..."
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="price"
                    className="block text-sm font-semibold text-slate-200"
                  >
                    Price (optional)
                  </label>
                  <input
                    type="text"
                    id="price"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
                    placeholder="$50, Starting at $100, etc."
                  />
                </div>

                <div>
                  <label
                    htmlFor="tags"
                    className="block text-sm font-semibold text-slate-200"
                  >
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    id="tags"
                    value={formData.tags}
                    onChange={(e) =>
                      setFormData({ ...formData, tags: e.target.value })
                    }
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
                    placeholder="handmade, traditional, custom"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200">
                  Product Image (optional)
                </label>

                {/* Image preview */}
                {formData.imageUrl && (
                  <div className="mt-2 mb-3 rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                    <p className="mb-2 text-xs text-slate-400">Current image:</p>
                    <div className="flex items-start gap-3">
                      <img
                        src={formData.imageUrl}
                        alt="Product preview"
                        className="h-24 w-24 rounded-lg border border-slate-600 object-cover"
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
                <div className="mt-2 flex flex-wrap items-center gap-3">
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
                    className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploadingImage ? "Uploading..." : formData.imageUrl ? "Change image" : "Upload image"}
                  </button>
                  <span className="text-xs text-slate-500">or</span>
                </div>

                {/* URL input */}
                <input
                  type="url"
                  id="imageUrl"
                  value={formData.imageUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, imageUrl: e.target.value })
                  }
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
                  placeholder="Paste image URL here"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Upload an image or paste an image URL
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full bg-[#14B8A6] px-6 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-[#14B8A6]/90 disabled:cursor-not-allowed disabled:opacity-60"
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
                  className="rounded-full border border-slate-700 px-6 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Products List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">
            Your Products & Services ({products.length})
          </h2>

          {products.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-[#08090C] p-8 text-center shadow-lg shadow-black/30">
              <p className="text-sm text-slate-300">
                You haven't added any products or services yet.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 inline-block rounded-full bg-[#14B8A6] px-6 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-[#14B8A6]/90"
              >
                Add your first product
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="rounded-2xl border border-slate-800 bg-[#08090C] p-5 shadow-lg shadow-black/30"
                >
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="mb-4 h-40 w-full rounded-lg object-cover"
                    />
                  )}
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-50">
                        {product.name}
                      </h3>
                      <p className="text-xs uppercase tracking-[0.3em] text-[#14B8A6]">
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
                    {product.description.length > 150
                      ? `${product.description.slice(0, 150)}...`
                      : product.description}
                  </p>
                  {product.tags && product.tags.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-1.5">
                      {product.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(product.id)}
                      className="rounded-md border border-red-700 px-3 py-1 text-xs text-red-300 transition hover:border-red-600 hover:bg-red-900/20"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Back link */}
        <div className="mt-8 text-center">
          <Link
            href="/organization/shop/setup"
            className="text-sm text-[#14B8A6] underline transition hover:text-[#14B8A6]/80"
          >
            Back to vendor profile
          </Link>
        </div>
      </div>
    </div>
  );
}
