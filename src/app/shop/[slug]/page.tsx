"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import {
  getVendorBySlug,
  getVendorListings,
  type ShopVendor,
  type ShopListing,
} from "@/lib/firestore/shop";

const categoryConfig: Record<string, { emoji: string; color: string; bg: string }> = {
  Art: { emoji: "\uD83C\uDFA8", color: "var(--purple)", bg: "var(--purple-soft)" },
  Food: { emoji: "\uD83C\uDF6F", color: "var(--gold)", bg: "var(--gold-soft)" },
  Clothing: { emoji: "\uD83D\uDC55", color: "var(--blue)", bg: "var(--blue-soft)" },
  Jewelry: { emoji: "\uD83D\uDC8E", color: "var(--teal)", bg: "var(--teal-soft)" },
  Services: { emoji: "\uD83D\uDEE0\uFE0F", color: "var(--green)", bg: "var(--green-soft)" },
  Education: { emoji: "\uD83D\uDCDA", color: "var(--blue)", bg: "var(--blue-soft)" },
};

function getCategoryStyle(category: string) {
  return (
    categoryConfig[category] || {
      emoji: "\uD83C\uDFEA",
      color: "var(--teal)",
      bg: "var(--teal-soft)",
    }
  );
}

export default function VendorProfilePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [vendor, setVendor] = useState<ShopVendor | null>(null);
  const [listings, setListings] = useState<ShopListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    async function load() {
      try {
        const v = await getVendorBySlug(slug);
        if (!v) {
          setNotFound(true);
          return;
        }
        setVendor(v);
        const l = await getVendorListings(v.id);
        setListings(l);
      } catch (err) {
        console.error("Failed to load vendor:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="max-w-[900px] mx-auto px-4 py-6 md:px-10 md:py-8">
          <div className="skeleton h-4 w-40 rounded mb-6" />
          <div className="skeleton h-48 rounded-2xl mb-6" />
          <div className="skeleton h-6 w-64 rounded mb-3" />
          <div className="skeleton h-4 w-full rounded mb-2" />
          <div className="skeleton h-4 w-3/4 rounded mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-48 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !vendor) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="max-w-[900px] mx-auto px-4 py-6 md:px-10 md:py-8 text-center">
          <p className="text-4xl mb-3">{"\uD83C\uDFEA"}</p>
          <h2 className="text-xl font-bold text-text mb-2">Vendor not found</h2>
          <p className="text-sm text-text-muted mb-4">
            This business profile doesn&apos;t exist or may have been removed.
          </p>
          <Link
            href="/shop"
            className="text-sm font-semibold no-underline"
            style={{ color: "var(--gold)" }}
          >
            {"\u2190"} Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const catStyle = getCategoryStyle(vendor.category);
  const initial = vendor.name?.charAt(0)?.toUpperCase() || "?";

  return (
    <AppShell>
    <div className="min-h-screen bg-bg">
      <div className="max-w-[900px] mx-auto px-4 py-6 md:px-10 md:py-8">
        {/* Back link */}
        <Link
          href="/shop"
          className="inline-flex items-center gap-1 text-sm text-text-muted no-underline hover:text-gold mb-4"
        >
          {"\u2190"} Back to Marketplace
        </Link>

        {/* Vendor header */}
        <Card className="mb-6">
          {/* Banner */}
          <div
            className="h-36 sm:h-48"
            style={{
              background:
                "linear-gradient(160deg, var(--gold) 0%, #B45309 50%, #92400E 100%)",
            }}
          />
          <div style={{ padding: "0 20px 20px" }} className="relative">
            {/* Avatar */}
            <div
              className="flex items-center justify-center rounded-full text-white font-bold text-2xl border-4 border-card -mt-10 relative"
              style={{
                width: 72,
                height: 72,
                background: "linear-gradient(135deg, var(--gold), #B45309)",
              }}
            >
              {initial}
            </div>

            <div className="mt-3">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl font-extrabold text-text">{vendor.name}</h1>
                <Badge
                  text={vendor.category}
                  color={catStyle.color}
                  bg={catStyle.bg}
                  small
                />
                {vendor.featured && (
                  <Badge
                    text="Featured"
                    color="var(--gold)"
                    bg="var(--gold-soft)"
                    small
                  />
                )}
              </div>

              {vendor.location && (
                <p className="text-sm text-text-muted mb-3">
                  {"\uD83D\uDCCD"} {vendor.location.city}, {vendor.location.province}
                </p>
              )}

              <p className="text-sm text-text-sec leading-relaxed mb-4">
                {vendor.description}
              </p>

              {/* Contact row */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                {vendor.website && (
                  <a
                    href={vendor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold no-underline rounded-lg transition-colors"
                    style={{
                      padding: "6px 12px",
                      background: "var(--gold-soft)",
                      color: "var(--gold)",
                    }}
                  >
                    {"\uD83C\uDF10"} Website
                  </a>
                )}
                {vendor.phone && (
                  <a
                    href={`tel:${vendor.phone}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold no-underline rounded-lg"
                    style={{
                      padding: "6px 12px",
                      background: "var(--teal-soft)",
                      color: "var(--teal)",
                    }}
                  >
                    {"\uD83D\uDCDE"} {vendor.phone}
                  </a>
                )}
                {vendor.email && (
                  <a
                    href={`mailto:${vendor.email}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold no-underline rounded-lg"
                    style={{
                      padding: "6px 12px",
                      background: "var(--blue-soft)",
                      color: "var(--blue)",
                    }}
                  >
                    {"\u2709\uFE0F"} Email
                  </a>
                )}
              </div>

              {/* Social links */}
              {vendor.socialLinks && (
                <div className="flex items-center gap-3 mb-4">
                  {vendor.socialLinks.facebook && (
                    <a
                      href={vendor.socialLinks.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-muted hover:text-blue text-sm no-underline"
                    >
                      Facebook
                    </a>
                  )}
                  {vendor.socialLinks.instagram && (
                    <a
                      href={vendor.socialLinks.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-muted hover:text-purple text-sm no-underline"
                    >
                      Instagram
                    </a>
                  )}
                  {vendor.socialLinks.linkedin && (
                    <a
                      href={vendor.socialLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-muted hover:text-blue text-sm no-underline"
                    >
                      LinkedIn
                    </a>
                  )}
                </div>
              )}

              {/* CTA */}
              {vendor.website && (
                <a
                  href={vendor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border-none font-bold text-sm text-white no-underline cursor-pointer transition-opacity hover:opacity-90"
                  style={{
                    padding: "12px 24px",
                    background: "var(--gold)",
                  }}
                >
                  Visit Website {"\u2192"}
                </a>
              )}
            </div>
          </div>
        </Card>

        {/* Vendor listings */}
        <h2 className="text-lg font-bold text-text mb-4">
          Products & Services
        </h2>

        {listings.length === 0 ? (
          <Card>
            <div style={{ padding: 40 }} className="text-center">
              <p className="text-3xl mb-2">{"\uD83D\uDCE6"}</p>
              <p className="text-sm text-text-muted">
                No listings yet. Check back soon for products and services from{" "}
                {vendor.name}.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {listings.map((item) => {
              const s = getCategoryStyle(item.category);
              return (
                <Card
                  key={item.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  {item.type === "product" ? (
                    <>
                      <div
                        className="flex items-center justify-center"
                        style={{ height: 140, background: s.bg }}
                      >
                        <span className="text-4xl">{s.emoji}</span>
                      </div>
                      <div style={{ padding: 16 }}>
                        <p className="text-sm font-bold text-text mb-1 truncate">
                          {item.title}
                        </p>
                        {item.price != null && (
                          <p
                            className="text-lg font-extrabold mb-1"
                            style={{ color: "var(--gold)" }}
                          >
                            ${item.price.toFixed(2)}
                          </p>
                        )}
                        <p className="text-xs text-text-muted line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: 20 }}>
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="flex items-center justify-center rounded-xl flex-shrink-0"
                          style={{ width: 44, height: 44, background: s.bg }}
                        >
                          <span className="text-xl">{s.emoji}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-text truncate">
                            {item.title}
                          </p>
                          <Badge
                            text={item.category}
                            color={s.color}
                            bg={s.bg}
                            small
                          />
                        </div>
                      </div>
                      <p className="text-xs text-text-sec line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </AppShell>
  );
}
