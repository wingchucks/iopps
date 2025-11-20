"use client";

import { useEffect, useMemo, useState } from "react";
import { listShopListings } from "@/lib/firestore";
import type { ShopListing } from "@/lib/types";

const fallbackListings: ShopListing[] = [
  {
    id: "shop-1",
    employerId: "demo",
    name: "Prairie Moon Beadwork",
    owner: "Autumn Cardinal",
    description:
      "Hand-beaded earrings, medallions, and custom regalia crafted with prairie florals.",
    category: "Arts & Gifts",
    location: "Saskatoon, SK",
    shipsCanadaWide: true,
    onlineStore: true,
    tags: ["Beadwork", "Regalia"],
    active: true,
  },
  {
    id: "shop-2",
    employerId: "demo",
    name: "Northern Cedar Apparel",
    owner: "Leah Sinclair",
    description:
      "Streetwear honoring coastal nations with cedar motif embroidery and eco-friendly fabrics.",
    category: "Apparel",
    location: "Vancouver, BC",
    shipsCanadaWide: true,
    onlineStore: false,
    tags: ["Hoodies", "Eco-conscious"],
    active: true,
  },
  {
    id: "shop-3",
    employerId: "demo",
    name: "Strong Roots Wellness",
    owner: "Black Bear Health Collective",
    description:
      "Virtual mental wellness circles and workplace training delivered by Indigenous clinicians.",
    category: "Services",
    location: "Virtual / Treaty 7",
    shipsCanadaWide: false,
    onlineStore: true,
    tags: ["Wellness", "Training"],
    active: true,
  },
];

const categoryOptions = [
  "All",
  "Arts & Gifts",
  "Apparel",
  "Food",
  "Services",
] as const;

export default function ShopPage() {
  const [listings, setListings] =
    useState<ShopListing[]>(fallbackListings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState<(typeof categoryOptions)[number]>("All");
  const [locationFilter, setLocationFilter] = useState("");
  const [shipsCanadaWide, setShipsCanadaWide] = useState(false);
  const [onlineOnly, setOnlineOnly] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listShopListings();
        setListings(data.length ? data : fallbackListings);
      } catch (err) {
        console.error(err);
        setError("Unable to load Indigenous businesses right now.");
        setListings(fallbackListings);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    return listings.filter((listing) => {
      const text = `${listing.name} ${listing.owner ?? ""} ${
        listing.description ?? ""
      } ${(listing.tags ?? []).join(" ")}`.toLowerCase();
      const matchesKeyword = text.includes(keyword.toLowerCase());
      const matchesCategory =
        categoryFilter === "All" ? true : listing.category === categoryFilter;
      const matchesLocation = locationFilter
        ? (listing.location ?? "")
            .toLowerCase()
            .includes(locationFilter.toLowerCase())
        : true;
      const matchesShipping = shipsCanadaWide
        ? Boolean(listing.shipsCanadaWide)
        : true;
      const matchesOnline = onlineOnly ? Boolean(listing.onlineStore) : true;
      return (
        matchesKeyword &&
        matchesCategory &&
        matchesLocation &&
        matchesShipping &&
        matchesOnline
      );
    });
  }, [
    categoryFilter,
    keyword,
    listings,
    locationFilter,
    onlineOnly,
    shipsCanadaWide,
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <section className="space-y-3">
        <p className="text-xs uppercase tracking-[0.4em] text-teal-300">
          Shop Indigenous
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Indigenous-owned businesses and products
        </h1>
        <p className="text-sm text-slate-300 sm:text-base">
          Discover Indigenous makers, service providers, and cultural experience
          hosts across Canada.
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/60 p-5 shadow-lg">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Keyword
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Beadwork, catering, wellness..."
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(
                  e.target.value as (typeof categoryOptions)[number]
                )
              }
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            >
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Location
            </label>
            <input
              type="text"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              placeholder="City, region, or virtual"
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-200">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={shipsCanadaWide}
              onChange={(e) => setShipsCanadaWide(e.target.checked)}
            />
            Ships Canada-wide
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={onlineOnly}
              onChange={(e) => setOnlineOnly(e.target.checked)}
            />
            Online store only
          </label>
          <button
            type="button"
            onClick={() => {
              setKeyword("");
              setCategoryFilter("All");
              setLocationFilter("");
              setShipsCanadaWide(false);
              setOnlineOnly(false);
            }}
            className="text-xs font-semibold text-teal-300 underline"
          >
            Reset filters
          </button>
        </div>
      </section>

      <section className="mt-8 space-y-4">
        {error && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-xl border border-slate-900 bg-slate-900/60"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 text-center text-sm text-slate-300">
            No businesses match your filters yet. We are actively onboarding
            new listings—check back soon or adjust filters.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((listing) => (
              <article
                key={listing.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-teal-400"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-teal-300">
                      {listing.category}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-50">
                      {listing.name}
                    </h3>
                    {listing.owner && (
                      <p className="text-sm text-slate-300">
                        Owned by {listing.owner}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <p>{listing.location}</p>
                    {listing.shipsCanadaWide && <p>Ships Canada-wide</p>}
                    {listing.onlineStore && <p>Online store</p>}
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-200">
                  {listing.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
                  {(listing.tags ?? []).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-slate-700 px-3 py-1"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
