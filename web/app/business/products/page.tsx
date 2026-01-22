"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { listAllProducts, getVendor } from "@/lib/firebase/shop";
import { useAuth } from "@/components/AuthProvider";
import type { VendorProduct, Vendor } from "@/lib/types";

const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "art", label: "Art & Paintings" },
  { value: "jewelry", label: "Jewelry" },
  { value: "clothing", label: "Clothing & Apparel" },
  { value: "crafts", label: "Crafts & Handmade" },
  { value: "food", label: "Food & Beverages" },
  { value: "home", label: "Home & Decor" },
  { value: "books", label: "Books & Media" },
  { value: "other", label: "Other" },
];

// Wrapper component to handle Suspense boundary for useSearchParams
export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsPageSkeleton />}>
      <ProductsPageContent />
    </Suspense>
  );
}

function ProductsPageSkeleton() {
  return (
    <PageShell>
      <div className="animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-48 mb-8" />
        <div className="text-center mb-12">
          <div className="h-6 bg-slate-800 rounded w-40 mx-auto mb-4" />
          <div className="h-10 bg-slate-800 rounded w-80 mx-auto mb-6" />
          <div className="h-6 bg-slate-800 rounded w-96 mx-auto" />
        </div>
        <div className="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-slate-800/50 h-72" />
          ))}
        </div>
      </div>
    </PageShell>
  );
}

function ProductsPageContent() {
  const { role } = useAuth();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [vendors, setVendors] = useState<Record<string, Vendor>>({});
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Only show selling CTA to employers/admins
  const canSell = role === "employer" || role === "admin";

  // Read category from URL on mount
  useEffect(() => {
    const urlCategory = searchParams.get("category");
    if (urlCategory && CATEGORIES.some(c => c.value === urlCategory)) {
      setCategory(urlCategory);
    }
    setInitialized(true);
  }, [searchParams]);

  useEffect(() => {
    if (initialized) {
      loadProducts();
    }
  }, [category, initialized]);

  async function loadProducts() {
    setLoading(true);
    try {
      const productList = await listAllProducts({
        category: category || undefined,
        limit: 50,
      });
      setProducts(productList);

      // Load vendor info for each product
      const vendorIds = [...new Set(productList.map((p) => p.vendorId))];
      const vendorData: Record<string, Vendor> = {};
      await Promise.all(
        vendorIds.map(async (id) => {
          const vendor = await getVendor(id);
          if (vendor) vendorData[id] = vendor;
        })
      );
      setVendors(vendorData);
    } catch (error) {
      console.error("Failed to load products:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = products.filter((product) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query) ||
      vendors[product.vendorId]?.businessName?.toLowerCase().includes(query)
    );
  });

  const formatPrice = (product: VendorProduct) => {
    if (product.priceDisplay) return product.priceDisplay;
    if (product.price) return `$${(product.price / 100).toFixed(2)}`;
    return "Contact for price";
  };

  return (
    <PageShell>
      {/* Breadcrumb */}
      <nav className="mb-8 text-sm text-slate-400">
        <Link href="/" className="hover:text-white transition-colors">
          Home
        </Link>
        <span className="mx-2">→</span>
        <Link href="/business" className="hover:text-white transition-colors">
          Indigenous Marketplace
        </Link>
        <span className="mx-2">→</span>
        <span className="text-white">Products</span>
      </nav>

      {/* Hero Section */}
      <div className="relative text-center mb-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#14B8A6]">
          Indigenous Marketplace
        </p>
        <h1 className="mt-4 text-4xl font-bold italic tracking-tight text-white sm:text-5xl">
          Shop Indigenous Products
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
          Discover authentic handmade goods from Indigenous artisans and businesses across North America.
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 mb-8">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Search */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block">
              Search Products
            </label>
            <input
              type="text"
              placeholder="Search by name, description, or vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#14B8A6] focus:outline-none"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-[#14B8A6] focus:outline-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-slate-400">
          {loading ? "Loading..." : `${filteredProducts.length} products found`}
        </p>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-slate-800/50 h-72" />
          ))}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map((product) => {
            const vendor = vendors[product.vendorId];
            return (
              <Link
                key={product.id}
                href={`/business/${vendor?.slug || product.vendorId}#product-${product.id}`}
                className="group rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden transition-all hover:border-[#14B8A6]/50 hover:-translate-y-1"
              >
                {/* Product Image */}
                <div className="relative h-48 bg-gradient-to-br from-[#14B8A6]/10 to-sky-500/5">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-5xl opacity-50">🛍️</span>
                    </div>
                  )}
                  {product.featured && (
                    <span className="absolute top-3 left-3 rounded-md bg-amber-500 px-2 py-1 text-xs font-bold text-slate-900">
                      Featured
                    </span>
                  )}
                  {!product.inStock && !product.madeToOrder && (
                    <span className="absolute top-3 right-3 rounded-md bg-red-500/80 px-2 py-1 text-xs font-bold text-white">
                      Out of Stock
                    </span>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <div className="text-xs font-semibold text-[#14B8A6] uppercase mb-1">
                    {product.category}
                  </div>
                  <h3 className="font-semibold text-white mb-1 line-clamp-2 group-hover:text-[#14B8A6] transition-colors">
                    {product.name}
                  </h3>
                  {vendor && (
                    <p className="text-xs text-slate-400 mb-3">
                      by {vendor.businessName}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-[#14B8A6]">
                      {formatPrice(product)}
                    </span>
                    {product.madeToOrder && (
                      <span className="text-xs text-slate-500">Made to order</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
          <span className="text-5xl mb-4 block">🔍</span>
          <h3 className="text-xl font-bold text-white mb-2">No Products Found</h3>
          <p className="text-slate-400 mb-6">
            {searchQuery || category
              ? "Try adjusting your search or filters."
              : "Products will appear here once vendors add them."}
          </p>
          <Link
            href="/business/directory"
            className="inline-flex items-center gap-2 rounded-full bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 hover:bg-[#16cdb8] transition-colors"
          >
            Browse Businesses Instead
          </Link>
        </div>
      )}

      {/* CTA Section - Only for employers/admins */}
      {canSell && (
        <section className="mt-16 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-800/50 border border-slate-700 p-8 sm:p-12 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Sell Your Products on IOPPS
          </h2>
          <p className="mt-3 text-slate-400 max-w-2xl mx-auto">
            Join our marketplace and reach customers across North America who want to support Indigenous businesses.
          </p>
          <Link
            href="/organization/shop"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 hover:bg-[#16cdb8] transition-colors"
          >
            Start Selling
          </Link>
        </section>
      )}
    </PageShell>
  );
}
