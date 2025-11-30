"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { PageShell } from "@/components/PageShell";
import ShareButtons from "@/components/ShareButtons";
import { getVendorProfileById, listVendorShopListings } from "@/lib/firestore";
import type { VendorProfile, ProductServiceListing } from "@/lib/types";

export default function VendorDetailPage() {
  const params = useParams();
  const vendorId = params.vendorId as string;

  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [products, setProducts] = useState<ProductServiceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadVendor = async () => {
      try {
        const vendorData = await getVendorProfileById(vendorId);
        if (vendorData) {
          setVendor(vendorData);
          try {
            const productData = await listVendorShopListings(vendorId);
            setProducts(productData);
          } catch (err) {
            console.error("Failed to load vendor products", err);
          }
        } else {
          setError("Vendor not found");
        }
      } catch (err) {
        console.error("Failed to load vendor", err);
        setError("Failed to load vendor profile");
      } finally {
        setLoading(false);
      }
    };
    loadVendor();
  }, [vendorId]);

  if (loading) {
    return (
      <PageShell>
        <div className="mx-auto max-w-5xl py-12 text-center">
          <p className="text-slate-400">Loading vendor profile...</p>
        </div>
      </PageShell>
    );
  }

  if (error || !vendor) {
    return (
      <PageShell>
        <div className="mx-auto max-w-5xl py-12 text-center">
          <h1 className="text-2xl font-bold text-slate-200">
            {error || "Vendor not found"}
          </h1>
          <Link
            href="/shop"
            className="mt-6 inline-block rounded-lg bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 transition-colors hover:bg-[#16cdb8]"
          >
            Back to Shop
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl py-8">
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-[#14B8A6]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Shop
        </Link>

        {vendor.heroImageUrl && (
          <div className="mt-6 relative h-64 w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <Image src={vendor.heroImageUrl} alt={`${vendor.businessName} hero`} fill className="object-cover" priority />
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-slate-800 bg-[#08090C] p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {vendor.logoUrl && (
              <div className="flex-shrink-0">
                <div className="relative h-24 w-24 overflow-hidden rounded-xl border-2 border-slate-700 bg-slate-900">
                  <Image src={vendor.logoUrl} alt={`${vendor.businessName} logo`} fill className="object-cover" />
                </div>
              </div>
            )}

            <div className="flex-1">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  {vendor.isIndigenousOwned && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#14B8A6]/30 bg-[#14B8A6]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#14B8A6]">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Indigenous-Owned
                    </span>
                  )}
                  <h1 className="mt-3 text-3xl font-bold text-slate-50">{vendor.businessName}</h1>
                  {vendor.tagline && <p className="mt-2 text-lg text-slate-300">{vendor.tagline}</p>}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                {vendor.category && (
                  <span className="inline-flex items-center rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-1.5 font-medium text-slate-300">
                    {vendor.category}
                  </span>
                )}
                {vendor.location && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{vendor.location}</span>
                    {vendor.region && <span className="text-slate-600">·</span>}
                    {vendor.region && <span>{vendor.region}</span>}
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {vendor.shipsCanadaWide && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-300">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Ships Canada-wide
                  </span>
                )}
                {vendor.isOnlineOnly && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/40 px-3 py-1.5 text-xs font-medium text-slate-300">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    Online only
                  </span>
                )}
                {vendor.hasInPersonLocation && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/40 px-3 py-1.5 text-xs font-medium text-slate-300">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    In-person location
                  </span>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-800">
                <ShareButtons
                  item={{
                    id: vendor.id,
                    title: `${vendor.businessName} - Indigenous-Owned Business on IOPPS`,
                    description: vendor.about?.substring(0, 150) + '...' || `Support ${vendor.businessName}, an Indigenous-owned business`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {vendor.about && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-[#08090C] p-8">
            <h2 className="text-xl font-bold text-slate-200">About</h2>
            <div className="mt-4 space-y-4 text-slate-300">
              {vendor.about.split("\n").map((paragraph, i) => (
                <p key={i} className="leading-relaxed">{paragraph}</p>
              ))}
            </div>
          </div>
        )}

        {vendor.originStory && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-[#08090C] p-8">
            <h2 className="text-xl font-bold text-slate-200">Our Story</h2>
            <div className="mt-4 space-y-4 text-slate-300">
              {vendor.originStory.split("\n").map((paragraph, i) => (
                <p key={i} className="leading-relaxed">{paragraph}</p>
              ))}
            </div>
          </div>
        )}

        {vendor.communityConnections && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-[#08090C] p-8">
            <h2 className="text-xl font-bold text-slate-200">Community Connections</h2>
            <div className="mt-4 space-y-4 text-slate-300">
              {vendor.communityConnections.split("\n").map((paragraph, i) => (
                <p key={i} className="leading-relaxed">{paragraph}</p>
              ))}
            </div>
          </div>
        )}

        {vendor.offerings && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-[#08090C] p-8">
            <h2 className="text-xl font-bold text-slate-200">What We Offer</h2>
            <div className="mt-4 space-y-4 text-slate-300">
              {vendor.offerings.split("\n").map((paragraph, i) => (
                <p key={i} className="leading-relaxed">{paragraph}</p>
              ))}
            </div>
          </div>
        )}

        {products.length > 0 && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-[#08090C] p-8">
            <h2 className="text-xl font-bold text-slate-200">Products & Services</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <div key={product.id} className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 transition hover:border-[#14B8A6]/50">
                  {product.imageUrl && (
                    <div className="relative h-40 w-full overflow-hidden rounded-lg bg-slate-800">
                      <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                    </div>
                  )}
                  <h3 className="mt-3 font-semibold text-slate-100">{product.name}</h3>
                  <p className="mt-2 text-xs uppercase tracking-wider text-slate-400">{product.category}</p>
                  {product.price && <p className="mt-2 font-semibold text-[#14B8A6]">{product.price}</p>}
                  <p className="mt-2 text-sm text-slate-300 line-clamp-3">{product.description}</p>
                  {product.tags && product.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {product.tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-slate-700/60 bg-slate-800/40 px-2 py-0.5 text-[0.65rem] text-slate-400">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-slate-800 bg-[#08090C] p-8">
          <h2 className="text-xl font-bold text-slate-200">Get in Touch</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div className="space-y-4">
              {vendor.contactEmail && (
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 flex-shrink-0 text-[#14B8A6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Email</p>
                    <a href={`mailto:${vendor.contactEmail}`} className="mt-1 block text-slate-200 hover:text-[#14B8A6] hover:underline">
                      {vendor.contactEmail}
                    </a>
                  </div>
                </div>
              )}
              {vendor.contactPhone && (
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 flex-shrink-0 text-[#14B8A6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Phone</p>
                    <a href={`tel:${vendor.contactPhone}`} className="mt-1 block text-slate-200 hover:text-[#14B8A6] hover:underline">
                      {vendor.contactPhone}
                    </a>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-4">
              {vendor.websiteUrl && (
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 flex-shrink-0 text-[#14B8A6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Website</p>
                    <a href={vendor.websiteUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block text-slate-200 hover:text-[#14B8A6] hover:underline">
                      Visit website
                    </a>
                  </div>
                </div>
              )}
              {vendor.shopUrl && (
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 flex-shrink-0 text-[#14B8A6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Online Shop</p>
                    <a href={vendor.shopUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block text-slate-200 hover:text-[#14B8A6] hover:underline">
                      Shop now
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {(vendor.instagram || vendor.facebook || vendor.tiktok || vendor.otherLink) && (
            <div className="mt-6 border-t border-slate-800 pt-6">
              <p className="text-sm font-semibold text-slate-400">Follow us</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {vendor.instagram && (
                  <a href={vendor.instagram.startsWith('http') ? vendor.instagram : `https://instagram.com/${vendor.instagram}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6]">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    Instagram
                  </a>
                )}
                {vendor.facebook && (
                  <a href={vendor.facebook.startsWith('http') ? vendor.facebook : `https://facebook.com/${vendor.facebook}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6]">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook
                  </a>
                )}
                {vendor.tiktok && (
                  <a href={vendor.tiktok.startsWith('http') ? vendor.tiktok : `https://tiktok.com/@${vendor.tiktok}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6]">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                    </svg>
                    TikTok
                  </a>
                )}
                {vendor.otherLink && (
                  <a href={vendor.otherLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6]">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Other Link
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
