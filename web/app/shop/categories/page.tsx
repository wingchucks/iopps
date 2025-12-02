import Link from "next/link";
import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { getCategories } from "@/lib/firebase/categories";
import { getCategoryVendorCount } from "@/lib/firebase/vendors";

export const metadata: Metadata = {
  title: "All Categories | Shop Indigenous",
  description:
    "Browse all categories of Indigenous artisans and businesses. Discover authentic handcrafted jewelry, art, textiles, food, and more from verified Indigenous vendors.",
  openGraph: {
    title: "All Categories | Shop Indigenous",
    description:
      "Browse all categories of Indigenous artisans and businesses.",
  },
};

export const revalidate = 300;

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <PageShell>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/shop" className="hover:text-[#14B8A6]">
          Shop Indigenous
        </Link>
        <span>/</span>
        <span className="text-slate-200">All Categories</span>
      </nav>

      {/* Header */}
      <header className="mt-6">
        <h1 className="text-3xl font-bold text-slate-50 md:text-4xl">
          Browse by Category
        </h1>
        <p className="mt-2 text-slate-400">
          Explore Indigenous artisans and businesses by category
        </p>
      </header>

      {/* Categories Grid */}
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/shop/category/${category.slug}`}
            className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-[#08090C] to-slate-900/50 p-6 shadow-lg shadow-black/30 transition-all hover:border-[#14B8A6]/50 hover:shadow-[#14B8A6]/10"
          >
            {/* Category Image/Icon Background */}
            {category.imageUrl ? (
              <div className="absolute inset-0 opacity-10">
                <img
                  src={category.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="absolute right-4 top-4 text-6xl opacity-10 transition-opacity group-hover:opacity-20">
                {getCategoryEmoji(category.slug)}
              </div>
            )}

            {/* Content */}
            <div className="relative">
              <h2 className="text-xl font-semibold text-slate-100 transition-colors group-hover:text-[#14B8A6]">
                {category.name}
              </h2>

              {category.description && (
                <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                  {category.description}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  {category.vendorCount || 0} vendor
                  {category.vendorCount !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1 text-sm font-medium text-[#14B8A6] transition-transform group-hover:translate-x-1">
                  Browse
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </span>
              </div>

              {/* Subcategories Preview */}
              {category.subcategories && category.subcategories.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {category.subcategories.slice(0, 3).map((sub) => (
                    <span
                      key={sub.id}
                      className="rounded-full bg-slate-800/50 px-2 py-0.5 text-xs text-slate-400"
                    >
                      {sub.name}
                    </span>
                  ))}
                  {category.subcategories.length > 3 && (
                    <span className="rounded-full bg-slate-800/50 px-2 py-0.5 text-xs text-slate-400">
                      +{category.subcategories.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Empty State */}
      {categories.length === 0 && (
        <div className="mt-10 rounded-2xl border border-slate-800 bg-[#08090C] p-12 text-center">
          <p className="text-lg text-slate-400">
            No categories available yet.
          </p>
          <Link
            href="/shop"
            className="mt-4 inline-block text-sm text-[#14B8A6] hover:underline"
          >
            Return to Shop Indigenous
          </Link>
        </div>
      )}

      {/* CTA */}
      <section className="mt-16 rounded-2xl border border-slate-800/80 bg-gradient-to-br from-[#08090C] to-slate-900/50 p-6 sm:p-8 shadow-lg shadow-black/30">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#14B8A6]">
              For Indigenous entrepreneurs
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-50">
              List your Indigenous-owned business
            </h2>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              Reach community members across Turtle Island with your products,
              services, or cultural experiences.
            </p>
          </div>
          <Link
            href="/organization/shop/setup"
            className="rounded-full bg-[#14B8A6] px-5 py-2.5 text-center text-sm font-semibold text-slate-900 transition hover:bg-[#14B8A6]/90"
          >
            Set up vendor profile
          </Link>
        </div>
      </section>
    </PageShell>
  );
}

/**
 * Helper function to get emoji for category
 */
function getCategoryEmoji(slug: string): string {
  const emojiMap: Record<string, string> = {
    "traditional-arts": "🎨",
    "jewelry-beadwork": "💎",
    "clothing-accessories": "👕",
    "food-beverages": "🍯",
    "health-wellness": "🌿",
    "cultural-experiences": "🪶",
    "education-workshops": "📚",
    "professional-services": "💼",
    "home-living": "🏠",
    "art-fine-crafts": "🖼️",
    "textiles-clothing": "🧶",
    experiences: "🌄",
  };

  return emojiMap[slug] || "📦";
}
