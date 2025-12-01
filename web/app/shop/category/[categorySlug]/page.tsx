import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { VendorCard, VendorCardSkeleton } from "@/components/shop/VendorCard";
import { getCategoryBySlug, getSubcategories } from "@/lib/firebase/categories";
import { getNations } from "@/lib/firebase/nations";
import { getVendors } from "@/lib/firebase/vendors";
import { CategoryPageClient } from "./CategoryPageClient";

interface PageProps {
  params: Promise<{ categorySlug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { categorySlug } = await params;
  const category = await getCategoryBySlug(categorySlug);

  if (!category) {
    return {
      title: "Category Not Found | Shop Indigenous",
    };
  }

  return {
    title: `${category.name} | Shop Indigenous`,
    description:
      category.description ||
      `Browse Indigenous vendors in the ${category.name} category. Discover authentic Indigenous artisans and businesses.`,
    openGraph: {
      title: `${category.name} | Shop Indigenous`,
      description: category.description || `Browse ${category.name} vendors`,
    },
  };
}

// Revalidate every 5 minutes
export const revalidate = 300;

/**
 * Main Category Page
 */
export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { categorySlug } = await params;
  const resolvedSearchParams = await searchParams;

  const category = await getCategoryBySlug(categorySlug);

  if (!category) {
    notFound();
  }

  // Parse filters from URL
  const filters = {
    subcategory: resolvedSearchParams.subcategory as string | undefined,
    nations: resolvedSearchParams.nation
      ? Array.isArray(resolvedSearchParams.nation)
        ? resolvedSearchParams.nation
        : [resolvedSearchParams.nation]
      : undefined,
    regions: resolvedSearchParams.region
      ? Array.isArray(resolvedSearchParams.region)
        ? resolvedSearchParams.region
        : [resolvedSearchParams.region]
      : undefined,
    priceRange: resolvedSearchParams.priceRange as string | undefined,
    customOrdersOnly: resolvedSearchParams.customOrders === "true",
  };

  const sortBy = (resolvedSearchParams.sort as string) || "newest";

  // Fetch data in parallel
  const [nations, vendorsResult] = await Promise.all([
    getNations(),
    getVendors(
      {
        category: filters.subcategory || category.id,
        nation: filters.nations,
        region: filters.regions?.[0],
        priceRange: filters.priceRange as any,
        customOrdersOnly: filters.customOrdersOnly,
      },
      {
        sortBy: sortBy as any,
        limit: 12,
      }
    ),
  ]);

  // Get material and technique options based on category
  // In a real app, these would be category-specific
  const materialOptions = [
    "beads",
    "leather",
    "silver",
    "turquoise",
    "cedar",
    "copper",
    "bone",
    "shell",
    "quill",
    "hide",
  ];

  const techniqueOptions = [
    "hand-woven",
    "hand-beaded",
    "hand-carved",
    "hand-forged",
    "hand-painted",
    "hand-stitched",
    "traditional",
  ];

  return (
    <PageShell>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/shop" className="hover:text-[#14B8A6]">
          Shop Indigenous
        </Link>
        <span>/</span>
        <span className="text-slate-200">{category.name}</span>
      </nav>

      {/* Header */}
      <header className="mt-6">
        <h1 className="text-3xl font-bold text-slate-50">{category.name}</h1>
        {category.description && (
          <p className="mt-2 text-slate-400">{category.description}</p>
        )}
        <p className="mt-2 text-sm text-slate-500">
          {category.vendorCount} vendor{category.vendorCount !== 1 ? "s" : ""}
        </p>
      </header>

      {/* Subcategory Pills */}
      {category.subcategories && category.subcategories.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={`/shop/category/${categorySlug}`}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              !filters.subcategory
                ? "bg-[#14B8A6] text-slate-900"
                : "border border-slate-700 text-slate-300 hover:border-[#14B8A6] hover:text-[#14B8A6]"
            }`}
          >
            All
          </Link>
          {category.subcategories.map((sub) => (
            <Link
              key={sub.id}
              href={`/shop/category/${categorySlug}?subcategory=${sub.id}`}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                filters.subcategory === sub.id
                  ? "bg-[#14B8A6] text-slate-900"
                  : "border border-slate-700 text-slate-300 hover:border-[#14B8A6] hover:text-[#14B8A6]"
              }`}
            >
              {sub.name}
            </Link>
          ))}
        </div>
      )}

      {/* Client-side Filter/Results Component */}
      <CategoryPageClient
        category={category}
        nations={nations}
        initialVendors={vendorsResult.vendors}
        initialHasMore={vendorsResult.hasMore}
        initialFilters={filters}
        initialSort={sortBy}
        materialOptions={materialOptions}
        techniqueOptions={techniqueOptions}
      />
    </PageShell>
  );
}
