import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { VendorHero, VendorHeroSkeleton } from "@/components/shop/VendorHero";
import { VendorStory, VendorStorySkeleton } from "@/components/shop/VendorStory";
import {
  VendorGallery,
  VendorGallerySkeleton,
} from "@/components/shop/VendorGallery";
import { VendorCard, VendorCardSkeleton } from "@/components/shop/VendorCard";
import {
  getVendorBySlug,
  getVendorBySlugForPreview,
  getVendorsByNation,
  getVendorsByCategory,
  incrementProfileView,
  type Vendor,
} from "@/lib/firebase/vendors";
import { VendorPageClient } from "./VendorPageClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  // First try active vendors, then fall back to preview mode
  let vendor = await getVendorBySlug(slug);
  if (!vendor) {
    vendor = await getVendorBySlugForPreview(slug);
  }

  if (!vendor) {
    return {
      title: "Vendor Not Found | Shop Indigenous",
    };
  }

  const isPreview = vendor.status !== "active";
  const titleSuffix = isPreview ? " (Preview)" : "";

  return {
    title: `${vendor.businessName}${titleSuffix} | Shop Indigenous`,
    description: vendor.tagline || vendor.description?.slice(0, 160),
    openGraph: {
      title: vendor.businessName,
      description: vendor.tagline || vendor.description?.slice(0, 160),
      images: vendor.coverImage ? [{ url: vendor.coverImage }] : undefined,
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: vendor.businessName,
      description: vendor.tagline || vendor.description?.slice(0, 160),
      images: vendor.coverImage ? [vendor.coverImage] : undefined,
    },
    // Prevent indexing of preview/draft pages
    ...(isPreview && { robots: { index: false, follow: false } }),
  };
}

// Revalidate every 5 minutes
export const revalidate = 300;

/**
 * Related Vendors Section (async server component)
 */
async function RelatedVendorsSection({
  vendor,
}: {
  vendor: Vendor;
}) {
  // Try to get vendors from same nation first
  let relatedVendors = await getVendorsByNation(vendor.nationId, vendor.id, 4);

  // If not enough, get from same category
  if (relatedVendors.length < 4 && vendor.categoryIds.length > 0) {
    const categoryVendors = await getVendorsByCategory(
      vendor.categoryIds[0],
      vendor.id,
      4 - relatedVendors.length
    );

    // Merge without duplicates
    const existingIds = new Set(relatedVendors.map((v) => v.id));
    for (const cv of categoryVendors) {
      if (!existingIds.has(cv.id)) {
        relatedVendors.push(cv);
      }
    }
  }

  if (relatedVendors.length === 0) {
    return null;
  }

  const sectionTitle = vendor.nation
    ? `More ${vendor.nation} Artisans`
    : "Similar Vendors";

  return (
    <section className="mt-12 border-t border-slate-800 pt-12">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">{sectionTitle}</h2>
        <Link href="/shop" className="text-sm text-[#14B8A6] hover:underline">
          View all vendors
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {relatedVendors.map((relatedVendor) => (
          <VendorCard key={relatedVendor.id} vendor={relatedVendor} size="compact" />
        ))}
      </div>
    </section>
  );
}

function RelatedVendorsSkeleton() {
  return (
    <section className="mt-12 border-t border-slate-800 pt-12">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-5 w-40 animate-pulse rounded bg-slate-800" />
        <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <VendorCardSkeleton key={i} size="compact" />
        ))}
      </div>
    </section>
  );
}

/**
 * Price range display helper
 */
function getPriceRangeDisplay(range: string): string {
  switch (range) {
    case "budget":
      return "$";
    case "mid":
      return "$$";
    case "premium":
      return "$$$";
    case "luxury":
      return "$$$$";
    default:
      return "$$";
  }
}

/**
 * Preview Banner Component for draft/inactive vendors
 */
function PreviewBanner({ status }: { status: string }) {
  const statusMessages: Record<string, { title: string; description: string }> = {
    draft: {
      title: "Preview Mode",
      description: "This shop is not yet published. Only you can see this preview.",
    },
    paused: {
      title: "Shop Paused",
      description: "This shop is currently paused and not visible to the public.",
    },
    suspended: {
      title: "Shop Suspended",
      description: "This shop has been suspended. Please contact support.",
    },
  };

  const message = statusMessages[status] || statusMessages.draft;

  return (
    <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="flex items-start gap-3">
        <svg
          className="h-5 w-5 flex-shrink-0 text-amber-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
        <div>
          <h3 className="font-semibold text-amber-300">{message.title}</h3>
          <p className="mt-1 text-sm text-slate-300">{message.description}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Main Vendor Storefront Page
 */
export default async function VendorStorefrontPage({ params }: PageProps) {
  const { slug } = await params;

  console.log("[Shop Page] Looking for vendor with slug:", slug);

  // First try to get active vendor (public view)
  let vendor = await getVendorBySlug(slug);
  let isPreviewMode = false;

  console.log("[Shop Page] getVendorBySlug result:", vendor ? `Found: ${vendor.businessName}` : "Not found");

  // If not found, try preview mode (any status - for owner preview)
  if (!vendor) {
    vendor = await getVendorBySlugForPreview(slug);
    console.log("[Shop Page] getVendorBySlugForPreview result:", vendor ? `Found: ${vendor.businessName}` : "Not found");
    if (vendor) {
      isPreviewMode = true;
    }
  }

  if (!vendor) {
    console.log("[Shop Page] No vendor found for slug:", slug);
    notFound();
  }

  // Track profile view only for active vendors (fire and forget - non-blocking)
  if (!isPreviewMode) {
    incrementProfileView(vendor.id).catch((err) => {
      // Non-critical analytics - log but don't block
      console.error("[Shop] Failed to track profile view:", err);
    });
  }

  return (
    <PageShell className="pb-24 md:pb-10">
      {/* Preview Banner for non-active vendors */}
      {isPreviewMode && <PreviewBanner status={vendor.status} />}

      {/* Back Link */}
      <Link
        href="/shop"
        className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-[#14B8A6]"
      >
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
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Shop Indigenous
      </Link>

      {/* Hero Section */}
      <div className="mt-6">
        <VendorHero vendor={vendor} />
      </div>

      {/* CTA Bar - Client Component */}
      <div className="mt-6">
        <VendorPageClient vendor={vendor} />
      </div>

      {/* Main Content Grid */}
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Left Column - Main Content */}
        <div className="space-y-8 lg:col-span-2">
          {/* Story Section */}
          {vendor.description && (
            <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6">
              <VendorStory vendor={vendor} />
            </section>
          )}

          {/* Gallery Section */}
          {vendor.gallery && vendor.gallery.length > 0 && (
            <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6">
              <h2 className="mb-4 text-xl font-bold text-slate-100">Gallery</h2>
              <VendorGallery
                images={vendor.gallery}
                businessName={vendor.businessName}
              />
            </section>
          )}
        </div>

        {/* Right Column - Details Sidebar */}
        <div className="space-y-6">
          {/* Details Card */}
          <div className="rounded-2xl border border-slate-800 bg-[#08090C] p-6">
            <h3 className="text-lg font-semibold text-slate-100">Details</h3>

            {/* Categories */}
            {vendor.categories && vendor.categories.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Categories
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {vendor.categories.map((cat) => (
                    <span
                      key={cat}
                      className="rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs font-medium text-slate-300"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Materials */}
            {vendor.materials && vendor.materials.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Materials
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {vendor.materials.map((mat) => (
                    <span
                      key={mat}
                      className="rounded-full bg-slate-800/50 px-3 py-1 text-xs text-slate-400"
                    >
                      {mat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Techniques */}
            {vendor.techniques && vendor.techniques.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Techniques
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {vendor.techniques.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-full bg-slate-800/50 px-3 py-1 text-xs text-slate-400"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Price Range */}
            {vendor.priceRange && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Price Range
                </p>
                <p className="mt-1 text-lg font-semibold text-[#14B8A6]">
                  {getPriceRangeDisplay(vendor.priceRange)}
                </p>
              </div>
            )}

            {/* Badges */}
            <div className="mt-4 space-y-2">
              {vendor.acceptsCustomOrders && (
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <svg
                    className="h-4 w-4 text-[#14B8A6]"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Accepts Custom Orders
                </div>
              )}
              {vendor.madeToOrder && (
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <svg
                    className="h-4 w-4 text-[#14B8A6]"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Made to Order
                </div>
              )}
            </div>
          </div>

          {/* Social Links Card */}
          {(vendor.socialLinks?.instagram ||
            vendor.socialLinks?.facebook ||
            vendor.socialLinks?.pinterest ||
            vendor.socialLinks?.tiktok ||
            vendor.socialLinks?.youtube) && (
            <div className="rounded-2xl border border-slate-800 bg-[#08090C] p-6">
              <h3 className="text-lg font-semibold text-slate-100">
                Follow Us
              </h3>
              <div className="mt-4 flex flex-wrap gap-3">
                {vendor.socialLinks?.instagram && (
                  <a
                    href={vendor.socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                    Instagram
                  </a>
                )}
                {vendor.socialLinks?.facebook && (
                  <a
                    href={vendor.socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    Facebook
                  </a>
                )}
                {vendor.socialLinks?.pinterest && (
                  <a
                    href={vendor.socialLinks.pinterest}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
                    </svg>
                    Pinterest
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Contact Card */}
          <div className="rounded-2xl border border-slate-800 bg-[#08090C] p-6">
            <h3 className="text-lg font-semibold text-slate-100">Contact</h3>
            <div className="mt-4 space-y-3">
              {vendor.email && (
                <a
                  href={`mailto:${vendor.email}`}
                  className="flex items-center gap-3 text-sm text-slate-300 transition hover:text-[#14B8A6]"
                >
                  <svg
                    className="h-5 w-5 text-[#14B8A6]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  {vendor.email}
                </a>
              )}
              {vendor.phone && (
                <a
                  href={`tel:${vendor.phone}`}
                  className="flex items-center gap-3 text-sm text-slate-300 transition hover:text-[#14B8A6]"
                >
                  <svg
                    className="h-5 w-5 text-[#14B8A6]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  {vendor.phone}
                </a>
              )}
              {vendor.website && (
                <a
                  href={vendor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm text-slate-300 transition hover:text-[#14B8A6]"
                >
                  <svg
                    className="h-5 w-5 text-[#14B8A6]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                    />
                  </svg>
                  Visit Website
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Related Vendors */}
      <Suspense fallback={<RelatedVendorsSkeleton />}>
        <RelatedVendorsSection vendor={vendor} />
      </Suspense>
    </PageShell>
  );
}
