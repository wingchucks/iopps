"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { EmployerProfile, EmployerProduct, ProductType, PaymentMethod, ProductCategory } from "@/lib/types";
import { PRODUCT_CATALOG, CATEGORY_LABELS, formatPrice } from "@/lib/products";
import {
  ArrowLeftIcon,
  PlusIcon,
  GiftIcon,
  CreditCardIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CalendarIcon,
  ArrowPathIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

type ProductWithDates = Omit<EmployerProduct, "activatedAt" | "expiresAt" | "createdAt" | "updatedAt"> & {
  activatedAt: string | null;
  expiresAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export default function EmployerProductsPage() {
  const { id: employerId } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const router = useRouter();

  const [employer, setEmployer] = useState<EmployerProfile | null>(null);
  const [products, setProducts] = useState<ProductWithDates[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Add product form state
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>("job");
  const [selectedProduct, setSelectedProduct] = useState<ProductType>("SINGLE");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("free_grant");
  const [quantity, setQuantity] = useState(1);
  const [durationDays, setDurationDays] = useState<number | "">("");
  const [grantReason, setGrantReason] = useState("");
  const [notes, setNotes] = useState("");
  const [paidAmount, setPaidAmount] = useState<number | "">("");

  // Extend modal state
  const [extendDays, setExtendDays] = useState(30);

  useEffect(() => {
    if (!user || (role !== "admin" && role !== "moderator")) {
      router.push("/admin");
      return;
    }
    loadData();
  }, [user, role, employerId]);

  async function loadData() {
    try {
      setLoading(true);

      // Load employer
      const employerDoc = await getDoc(doc(db!, "employers", employerId));
      if (!employerDoc.exists()) {
        router.push("/admin/employers");
        return;
      }
      setEmployer({ id: employerDoc.id, ...employerDoc.data() } as EmployerProfile);

      // Load products from API
      const idToken = await user!.getIdToken();
      const response = await fetch(`/api/admin/employer-products?employerId=${employerId}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      showToast("error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleAddProduct() {
    if (!user) return;

    try {
      setProcessing(true);
      const idToken = await user.getIdToken();

      const response = await fetch("/api/admin/employer-products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          employerId,
          productType: selectedProduct,
          paymentMethod,
          quantity: selectedCategory === "job" ? quantity : 1,
          durationDays: durationDays || undefined,
          grantReason: grantReason || undefined,
          notes: notes || undefined,
          paidAmount: paidAmount !== "" ? paidAmount : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add product");
      }

      showToast("success", "Product added successfully");
      setShowAddModal(false);
      resetForm();
      loadData();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Failed to add product");
    } finally {
      setProcessing(false);
    }
  }

  async function handleExtendProduct(productId: string) {
    if (!user) return;

    try {
      setProcessing(true);
      const idToken = await user.getIdToken();

      const response = await fetch("/api/admin/employer-products", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          employerId,
          productId,
          action: "extend",
          additionalDays: extendDays,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to extend product");
      }

      showToast("success", `Product extended by ${extendDays} days`);
      setShowExtendModal(null);
      loadData();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Failed to extend product");
    } finally {
      setProcessing(false);
    }
  }

  async function handleCancelProduct(productId: string) {
    if (!user || !confirm("Are you sure you want to cancel this product?")) return;

    try {
      setProcessing(true);
      const idToken = await user.getIdToken();

      const response = await fetch(
        `/api/admin/employer-products?employerId=${employerId}&productId=${productId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${idToken}` },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to cancel product");
      }

      showToast("success", "Product cancelled");
      loadData();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Failed to cancel product");
    } finally {
      setProcessing(false);
    }
  }

  function resetForm() {
    setSelectedCategory("job");
    setSelectedProduct("SINGLE");
    setPaymentMethod("free_grant");
    setQuantity(1);
    setDurationDays("");
    setGrantReason("");
    setNotes("");
    setPaidAmount("");
  }

  function getProductsByCategory(category: ProductCategory) {
    return Object.entries(PRODUCT_CATALOG).filter(([_, config]) => config.category === category);
  }

  function getStatusBadge(status: string, expiresAt: string | null) {
    const isExpired = expiresAt && new Date(expiresAt) < new Date();

    if (status === "cancelled") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-1 text-xs font-medium text-red-400">
          <XCircleIcon className="h-3 w-3" /> Cancelled
        </span>
      );
    }

    if (isExpired) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2 py-1 text-xs font-medium text-[var(--text-muted)]">
          <ClockIcon className="h-3 w-3" /> Expired
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-400">
        <CheckCircleIcon className="h-3 w-3" /> Active
      </span>
    );
  }

  function getPaymentBadge(method: PaymentMethod) {
    switch (method) {
      case "free_grant":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-1 text-xs font-medium text-purple-400">
            <GiftIcon className="h-3 w-3" /> Free Grant
          </span>
        );
      case "stripe":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-400">
            <CreditCardIcon className="h-3 w-3" /> Stripe
          </span>
        );
      case "manual":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-1 text-xs font-medium text-yellow-400">
            <DocumentTextIcon className="h-3 w-3" /> Manual
          </span>
        );
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[var(--card-border)] border-t-teal-500"></div>
          <p className="mt-3 text-[var(--text-muted)]">Loading products...</p>
        </div>
      </div>
    );
  }

  const activeProducts = products.filter(
    (p) => p.status === "active" && (!p.expiresAt || new Date(p.expiresAt) >= new Date())
  );
  const inactiveProducts = products.filter(
    (p) => p.status !== "active" || (p.expiresAt && new Date(p.expiresAt) < new Date())
  );

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <div className="border-b border-[var(--card-border)] bg-surface">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <Link
            href="/admin/employers"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-accent"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Employers
          </Link>
          <div className="mt-4 flex items-start justify-between">
            <div className="flex items-center gap-4">
              {employer?.logoUrl ? (
                <img
                  src={employer.logoUrl}
                  alt={employer.organizationName}
                  className="h-16 w-16 rounded-lg border border-[var(--card-border)] bg-white object-contain p-2"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-[var(--card-border)] bg-surface text-xs text-foreground0">
                  No Logo
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-foreground">{employer?.organizationName}</h1>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Products & Subscriptions</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-teal-400"
            >
              <PlusIcon className="h-4 w-4" />
              Add Product
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-[var(--card-border)] bg-surface p-4">
            <p className="text-sm font-medium text-[var(--text-muted)]">Total Products</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{products.length}</p>
          </div>
          <div className="rounded-lg border border-[var(--card-border)] bg-surface p-4">
            <p className="text-sm font-medium text-[var(--text-muted)]">Active Products</p>
            <p className="mt-1 text-2xl font-bold text-green-400">{activeProducts.length}</p>
          </div>
          <div className="rounded-lg border border-[var(--card-border)] bg-surface p-4">
            <p className="text-sm font-medium text-[var(--text-muted)]">Total Value</p>
            <p className="mt-1 text-2xl font-bold text-accent">
              {formatPrice(products.reduce((sum, p) => sum + p.price, 0))}
            </p>
          </div>
        </div>

        {/* Active Products */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Active Products</h2>
          {activeProducts.length === 0 ? (
            <div className="rounded-lg border border-[var(--card-border)] bg-surface p-8 text-center">
              <GiftIcon className="mx-auto h-12 w-12 text-slate-600" />
              <p className="mt-2 text-[var(--text-muted)]">No active products</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 text-sm text-accent hover:text-teal-300"
              >
                Add a product
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {activeProducts.map((product) => (
                <div
                  key={product.id}
                  className="rounded-lg border border-[var(--card-border)] bg-surface p-5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-foreground">{product.productName}</h3>
                        {getStatusBadge(product.status, product.expiresAt)}
                        {getPaymentBadge(product.paymentMethod)}
                      </div>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {CATEGORY_LABELS[product.category]} • {formatPrice(product.price)} value
                        {product.paidAmount !== product.price && (
                          <span className="text-green-400"> (paid {formatPrice(product.paidAmount)})</span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setExtendDays(30);
                          setShowExtendModal(product.id);
                        }}
                        className="rounded-md border border-[var(--card-border)] px-3 py-1 text-xs text-[var(--text-secondary)] transition hover:border-accent hover:text-accent"
                      >
                        <ArrowPathIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleCancelProduct(product.id)}
                        disabled={processing}
                        className="rounded-md border border-red-800 px-3 py-1 text-xs text-red-400 transition hover:border-red-500 hover:bg-red-500/10"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-foreground0">Activated</p>
                      <p className="text-sm text-[var(--text-secondary)]">{formatDate(product.activatedAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-foreground0">Expires</p>
                      <p className="text-sm text-[var(--text-secondary)]">{formatDate(product.expiresAt)}</p>
                    </div>
                    {product.grantReason && (
                      <div className="col-span-2">
                        <p className="text-xs text-foreground0">Reason</p>
                        <p className="text-sm text-[var(--text-secondary)]">{product.grantReason}</p>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  {(product.stats.jobsRemaining !== undefined ||
                    product.stats.featuredJobsRemaining !== undefined ||
                    product.stats.conferencesRemaining !== undefined) && (
                    <div className="mt-4 rounded-md bg-surface p-3">
                      <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">Usage Stats</p>
                      <div className="flex flex-wrap gap-4 text-sm">
                        {product.stats.jobsRemaining !== undefined && (
                          <div>
                            <span className="text-[var(--text-muted)]">Jobs:</span>{" "}
                            <span className="text-foreground">
                              {product.stats.jobsPosted || 0} used,{" "}
                              {product.stats.jobsRemaining === "unlimited"
                                ? "unlimited"
                                : product.stats.jobsRemaining}{" "}
                              remaining
                            </span>
                          </div>
                        )}
                        {product.stats.featuredJobsRemaining !== undefined && (
                          <div>
                            <span className="text-[var(--text-muted)]">Featured:</span>{" "}
                            <span className="text-foreground">
                              {product.stats.featuredJobsUsed || 0} used, {product.stats.featuredJobsRemaining}{" "}
                              remaining
                            </span>
                          </div>
                        )}
                        {product.stats.conferencesRemaining !== undefined && (
                          <div>
                            <span className="text-[var(--text-muted)]">Conferences:</span>{" "}
                            <span className="text-foreground">
                              {product.stats.conferencesPosted || 0} used, {product.stats.conferencesRemaining}{" "}
                              remaining
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inactive/Expired Products */}
        {inactiveProducts.length > 0 && (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-[var(--text-muted)]">Expired / Cancelled</h2>
            <div className="space-y-2">
              {inactiveProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--card-border)] bg-slate-900/30 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--text-muted)]">{product.productName}</span>
                    {getStatusBadge(product.status, product.expiresAt)}
                  </div>
                  <span className="text-xs text-foreground0">
                    {product.status === "cancelled" ? "Cancelled" : `Expired ${formatDate(product.expiresAt)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--card-border)] bg-surface p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-foreground">Add Product</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[var(--text-muted)] hover:text-foreground">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Adding product to <strong>{employer?.organizationName}</strong>
            </p>

            <div className="mt-6 space-y-5">
              {/* Category Selection */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Category</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(CATEGORY_LABELS) as ProductCategory[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat);
                        const products = getProductsByCategory(cat);
                        if (products.length > 0) {
                          setSelectedProduct(products[0][0] as ProductType);
                        }
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                        selectedCategory === cat
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-[var(--card-border)] text-[var(--text-muted)] hover:border-[var(--card-border)]"
                      }`}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Selection */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Product</label>
                <div className="grid gap-2">
                  {getProductsByCategory(selectedCategory).map(([type, config]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedProduct(type as ProductType)}
                      className={`flex items-start justify-between rounded-lg border p-3 text-left transition ${
                        selectedProduct === type
                          ? "border-accent bg-accent/10"
                          : "border-[var(--card-border)] hover:border-[var(--card-border)]"
                      }`}
                    >
                      <div>
                        <p className={`font-medium ${selectedProduct === type ? "text-accent" : "text-foreground"}`}>
                          {config.name}
                        </p>
                        <p className="text-xs text-foreground0">{config.duration} days</p>
                      </div>
                      <span className="text-sm font-semibold text-accent">{formatPrice(config.price)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity (for job products) */}
              {selectedCategory === "job" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Quantity</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-[var(--text-secondary)] hover:bg-slate-700"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-center text-sm text-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-[var(--text-secondary)] hover:bg-slate-700"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Payment Method */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("free_grant")}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-3 transition ${
                      paymentMethod === "free_grant"
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-[var(--card-border)] hover:border-[var(--card-border)]"
                    }`}
                  >
                    <GiftIcon className={`h-5 w-5 ${paymentMethod === "free_grant" ? "text-purple-400" : "text-[var(--text-muted)]"}`} />
                    <span className={`text-xs ${paymentMethod === "free_grant" ? "text-purple-400" : "text-[var(--text-muted)]"}`}>
                      Free Grant
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("manual")}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-3 transition ${
                      paymentMethod === "manual"
                        ? "border-yellow-500 bg-yellow-500/10"
                        : "border-[var(--card-border)] hover:border-[var(--card-border)]"
                    }`}
                  >
                    <DocumentTextIcon className={`h-5 w-5 ${paymentMethod === "manual" ? "text-yellow-400" : "text-[var(--text-muted)]"}`} />
                    <span className={`text-xs ${paymentMethod === "manual" ? "text-yellow-400" : "text-[var(--text-muted)]"}`}>
                      Manual/Invoice
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("stripe")}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-3 transition ${
                      paymentMethod === "stripe"
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-[var(--card-border)] hover:border-[var(--card-border)]"
                    }`}
                  >
                    <CreditCardIcon className={`h-5 w-5 ${paymentMethod === "stripe" ? "text-blue-400" : "text-[var(--text-muted)]"}`} />
                    <span className={`text-xs ${paymentMethod === "stripe" ? "text-blue-400" : "text-[var(--text-muted)]"}`}>
                      Stripe
                    </span>
                  </button>
                </div>
              </div>

              {/* Duration Override */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                  Duration (days)
                  <span className="ml-2 text-xs text-foreground0">
                    Leave empty for default ({PRODUCT_CATALOG[selectedProduct]?.duration || 30} days)
                  </span>
                </label>
                <input
                  type="number"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value ? parseInt(e.target.value) : "")}
                  placeholder={`${PRODUCT_CATALOG[selectedProduct]?.duration || 30}`}
                  className="w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground placeholder-slate-500"
                />
              </div>

              {/* Paid Amount (for manual/stripe) */}
              {paymentMethod !== "free_grant" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                    Amount Paid (cents)
                    <span className="ml-2 text-xs text-foreground0">
                      Leave empty for full price ({formatPrice((PRODUCT_CATALOG[selectedProduct]?.price || 0) * quantity)})
                    </span>
                  </label>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value ? parseInt(e.target.value) : "")}
                    placeholder={`${(PRODUCT_CATALOG[selectedProduct]?.price || 0) * quantity}`}
                    className="w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground placeholder-slate-500"
                  />
                </div>
              )}

              {/* Grant Reason */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Reason (optional)</label>
                <input
                  type="text"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  placeholder="e.g., Partner, Sponsorship, Promotion"
                  className="w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground placeholder-slate-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Internal notes..."
                  className="w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground placeholder-slate-500"
                />
              </div>

              {/* Summary */}
              <div className="rounded-lg border border-[var(--card-border)] bg-surface p-4">
                <p className="text-sm text-[var(--text-secondary)]">
                  <span className="text-[var(--text-muted)]">Granting:</span>{" "}
                  <strong>
                    {quantity > 1 ? `${quantity}x ` : ""}
                    {PRODUCT_CATALOG[selectedProduct]?.name}
                  </strong>
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  <span className="text-[var(--text-muted)]">Value:</span>{" "}
                  <strong className="text-accent">
                    {formatPrice((PRODUCT_CATALOG[selectedProduct]?.price || 0) * quantity)}
                  </strong>
                  {paymentMethod === "free_grant" && <span className="text-purple-400"> (FREE)</span>}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  <span className="text-[var(--text-muted)]">Duration:</span>{" "}
                  {durationDays || PRODUCT_CATALOG[selectedProduct]?.duration} days
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-surface"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProduct}
                disabled={processing}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-slate-900 hover:bg-teal-400 disabled:opacity-50"
              >
                {processing ? "Adding..." : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--card-border)] bg-surface p-6">
            <h3 className="text-lg font-bold text-foreground">Extend Product</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Add more days to this product</p>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Additional Days</label>
              <select
                value={extendDays}
                onChange={(e) => setExtendDays(parseInt(e.target.value))}
                className="w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground"
              >
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
                <option value={180}>180 days</option>
                <option value={365}>365 days</option>
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowExtendModal(null)}
                className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-surface"
              >
                Cancel
              </button>
              <button
                onClick={() => handleExtendProduct(showExtendModal)}
                disabled={processing}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-slate-900 hover:bg-teal-400 disabled:opacity-50"
              >
                {processing ? "Extending..." : "Extend"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={`rounded-lg border px-6 py-4 shadow-lg ${
              toast.type === "success"
                ? "border-green-500/50 bg-green-950/90 text-green-400"
                : "border-red-500/50 bg-red-950/90 text-red-400"
            }`}
          >
            <div className="flex items-center gap-3">
              {toast.type === "success" ? (
                <CheckCircleIcon className="h-5 w-5" />
              ) : (
                <XCircleIcon className="h-5 w-5" />
              )}
              <p className="font-medium">{toast.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
