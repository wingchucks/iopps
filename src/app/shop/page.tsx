"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import {
  getListings,
  getVendors,
  searchListings,
  type ShopListing,
  type ShopVendor,
} from "@/lib/firestore/shop";

const tabs = ["Products", "Services", "Businesses"] as const;
type Tab = (typeof tabs)[number];

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

const allCategories = ["Art", "Food", "Clothing", "Jewelry", "Services", "Education"];

const provinces = [
  "All Locations",
  "Saskatchewan",
  "Alberta",
  "Manitoba",
  "British Columbia",
  "Ontario",
];

export default function ShopPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Products");
  const [listings, setListings] = useState<ShopListing[]>([]);
  const [vendors, setVendors] = useState<ShopVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ShopListing[] | null>(null);
  const [searching, setSearching] = useState(false);

  // Filters
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("All Locations");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [l, v] = await Promise.all([getListings(), getVendors()]);
        setListings(l);
        setVendors(v);
      } catch (err) {
        console.error("Failed to load shop data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const results = await searchListings(q);
      setSearchResults(results);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearching(false);
    }
  };

  const products = useMemo(() => {
    let items = searchResults ?? listings.filter((l) => l.type === "product");
    if (selectedCategories.length > 0) {
      items = items.filter((l) => selectedCategories.includes(l.category));
    }
    const min = parseFloat(priceMin);
    const max = parseFloat(priceMax);
    if (!isNaN(min)) items = items.filter((l) => l.price != null && l.price >= min);
    if (!isNaN(max)) items = items.filter((l) => l.price != null && l.price <= max);
    return items;
  }, [listings, searchResults, selectedCategories, priceMin, priceMax]);

  const services = useMemo(() => {
    let items = searchResults
      ? searchResults.filter((l) => l.type === "service")
      : listings.filter((l) => l.type === "service");
    if (selectedCategories.length > 0) {
      items = items.filter((l) => selectedCategories.includes(l.category));
    }
    return items;
  }, [listings, searchResults, selectedCategories]);

  const filteredVendors = useMemo(() => {
    let v = vendors;
    if (selectedCategories.length > 0) {
      v = v.filter((vendor) => selectedCategories.includes(vendor.category));
    }
    if (selectedLocation !== "All Locations") {
      v = v.filter((vendor) => vendor.location?.province === selectedLocation);
    }
    return v;
  }, [vendors, selectedCategories, selectedLocation]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="max-w-[1200px] mx-auto px-4 py-6 md:px-10 md:py-8">
          {/* Hero skeleton */}
          <div className="skeleton h-48 rounded-2xl mb-6" />
          {/* Tab skeleton */}
          <div className="flex gap-2 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-10 w-28 rounded-xl" />
            ))}
          </div>
          {/* Grid skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton h-56 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isEmpty =
    (activeTab === "Products" && products.length === 0) ||
    (activeTab === "Services" && services.length === 0) ||
    (activeTab === "Businesses" && filteredVendors.length === 0);

  return (
    <AppShell>
    <div className="min-h-screen bg-bg">
      {/* Hero */}
      <section
        className="text-center"
        style={{
          background: "linear-gradient(160deg, var(--gold) 0%, #B45309 40%, #92400E 70%, var(--gold) 100%)",
          padding: "clamp(32px, 5vw, 60px) clamp(20px, 6vw, 80px)",
        }}
      >
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
          Shop Indigenous
        </h1>
        <p className="text-base text-white/70 mb-6 max-w-[500px] mx-auto">
          Support Indigenous-owned businesses across Saskatchewan
        </p>

        {/* Search */}
        <div className="max-w-[520px] mx-auto relative">
          <input
            type="text"
            placeholder="Search products, services, businesses..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!e.target.value.trim()) setSearchResults(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full rounded-xl border-none text-sm font-medium outline-none"
            style={{
              padding: "14px 48px 14px 18px",
              background: "rgba(255,255,255,.95)",
              color: "var(--text)",
            }}
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border-none cursor-pointer"
            style={{
              padding: "8px 14px",
              background: "var(--gold)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {searching ? "..." : "Search"}
          </button>
        </div>
      </section>

      {/* Tabs */}
      <div className="max-w-[1200px] mx-auto px-4 md:px-10 pt-6">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSearchResults(null);
                  setSearchQuery("");
                }}
                className="px-5 py-2.5 rounded-xl border-none font-semibold text-sm cursor-pointer transition-all whitespace-nowrap"
                style={{
                  background: active ? "var(--gold)" : "var(--card)",
                  color: active ? "#fff" : "var(--text-sec)",
                  border: active ? "none" : "1px solid var(--border)",
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1200px] mx-auto px-4 md:px-10 pb-24">
        <div className="flex gap-6">
          {/* Sidebar — desktop only */}
          <aside className="hidden lg:block w-[240px] flex-shrink-0">
            <Card>
              <div style={{ padding: 20 }}>
                <p className="text-xs font-bold text-text-muted tracking-widest mb-3">
                  CATEGORIES
                </p>
                {allCategories.map((cat) => {
                  const s = getCategoryStyle(cat);
                  const checked = selectedCategories.includes(cat);
                  return (
                    <label
                      key={cat}
                      className="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-text-sec"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCategory(cat)}
                        className="accent-gold"
                      />
                      <span>{s.emoji}</span>
                      {cat}
                    </label>
                  );
                })}

                <hr className="my-4 border-border" />

                <p className="text-xs font-bold text-text-muted tracking-widest mb-3">
                  LOCATION
                </p>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full rounded-lg text-sm p-2 border border-border bg-card text-text"
                >
                  {provinces.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>

                {activeTab !== "Businesses" && (
                  <>
                    <hr className="my-4 border-border" />
                    <p className="text-xs font-bold text-text-muted tracking-widest mb-3">
                      PRICE RANGE
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={priceMin}
                        onChange={(e) => setPriceMin(e.target.value)}
                        className="w-full rounded-lg text-sm p-2 border border-border bg-card text-text"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={priceMax}
                        onChange={(e) => setPriceMax(e.target.value)}
                        className="w-full rounded-lg text-sm p-2 border border-border bg-card text-text"
                      />
                    </div>
                  </>
                )}
              </div>
            </Card>
          </aside>

          {/* Main grid */}
          <div className="flex-1 min-w-0">
            {isEmpty ? (
              <Card>
                <div style={{ padding: 48 }} className="text-center">
                  <p className="text-4xl mb-3">{"\uD83C\uDFEA"}</p>
                  <h3 className="text-lg font-bold text-text mb-2">
                    No listings yet
                  </h3>
                  <p className="text-sm text-text-muted max-w-[360px] mx-auto">
                    Indigenous businesses will be featured here soon. Check back
                    for products, services, and vendor profiles.
                  </p>
                </div>
              </Card>
            ) : (
              <>
                {/* Products tab */}
                {activeTab === "Products" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.map((item) => {
                      const s = getCategoryStyle(item.category);
                      return (
                        <Card
                          key={item.id}
                          className="hover:shadow-lg transition-shadow"
                        >
                          {/* Placeholder image */}
                          <div
                            className="flex items-center justify-center"
                            style={{
                              height: 160,
                              background: s.bg,
                            }}
                          >
                            <span className="text-5xl">{s.emoji}</span>
                          </div>
                          <div style={{ padding: 16 }}>
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="text-sm font-bold text-text truncate flex-1">
                                {item.title}
                              </p>
                              {item.featured && (
                                <Badge
                                  text="Featured"
                                  color="var(--gold)"
                                  bg="var(--gold-soft)"
                                  small
                                />
                              )}
                            </div>
                            {item.price != null && (
                              <p
                                className="text-lg font-extrabold mb-1"
                                style={{ color: "var(--gold)" }}
                              >
                                ${item.price.toFixed(2)}
                              </p>
                            )}
                            <p className="text-xs text-text-muted mb-2 line-clamp-2">
                              {item.description}
                            </p>
                            <div className="flex items-center justify-between">
                              <Link
                                href={`/shop/${item.vendorSlug}`}
                                className="text-xs text-text-sec font-medium no-underline hover:text-gold"
                              >
                                {item.vendorName}
                              </Link>
                              <Badge
                                text={item.category}
                                color={s.color}
                                bg={s.bg}
                                small
                              />
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Services tab */}
                {activeTab === "Services" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {services.map((item) => {
                      const s = getCategoryStyle(item.category);
                      return (
                        <Card
                          key={item.id}
                          className="hover:shadow-lg transition-shadow"
                        >
                          <div style={{ padding: 20 }}>
                            <div className="flex items-center gap-3 mb-3">
                              <div
                                className="flex items-center justify-center rounded-xl flex-shrink-0"
                                style={{
                                  width: 48,
                                  height: 48,
                                  background: s.bg,
                                }}
                              >
                                <span className="text-2xl">{s.emoji}</span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-text truncate">
                                  {item.title}
                                </p>
                                <Link
                                  href={`/shop/${item.vendorSlug}`}
                                  className="text-xs text-text-muted no-underline hover:text-gold"
                                >
                                  {item.vendorName}
                                </Link>
                              </div>
                            </div>
                            <p className="text-xs text-text-sec mb-3 line-clamp-2">
                              {item.description}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                text={item.category}
                                color={s.color}
                                bg={s.bg}
                                small
                              />
                              {item.tags?.slice(0, 2).map((tag) => (
                                <Badge
                                  key={tag}
                                  text={tag}
                                  color="var(--text-muted)"
                                  bg="var(--border)"
                                  small
                                />
                              ))}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Businesses tab */}
                {activeTab === "Businesses" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredVendors.map((vendor) => {
                      const s = getCategoryStyle(vendor.category);
                      const initial = vendor.name?.charAt(0)?.toUpperCase() || "?";
                      return (
                        <Card
                          key={vendor.id}
                          className="hover:shadow-lg transition-shadow"
                        >
                          <div style={{ padding: 20 }}>
                            <div className="flex items-center gap-3 mb-3">
                              <div
                                className="flex items-center justify-center rounded-full flex-shrink-0 text-white font-bold text-lg"
                                style={{
                                  width: 48,
                                  height: 48,
                                  background:
                                    "linear-gradient(135deg, var(--gold), #B45309)",
                                }}
                              >
                                {initial}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-text truncate">
                                  {vendor.name}
                                </p>
                                <Badge
                                  text={vendor.category}
                                  color={s.color}
                                  bg={s.bg}
                                  small
                                />
                              </div>
                            </div>
                            <p className="text-xs text-text-sec mb-3 line-clamp-2">
                              {vendor.description}
                            </p>
                            {vendor.location && (
                              <p className="text-xs text-text-muted mb-3">
                                {"\uD83D\uDCCD"} {vendor.location.city},{" "}
                                {vendor.location.province}
                              </p>
                            )}
                            <Link
                              href={`/shop/${vendor.slug}`}
                              className="text-sm font-semibold no-underline hover:underline"
                              style={{ color: "var(--gold)" }}
                            >
                              Visit Profile {"\u2192"}
                            </Link>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
    </AppShell>
  );
}
