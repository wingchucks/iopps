"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { Vendor } from "@/lib/firebase/vendors";
import type { NationsByRegion } from "@/lib/firebase/nations";

interface MapPageClientProps {
  vendors: Vendor[];
  regions: string[];
  nationsByRegion: NationsByRegion[];
}

export function MapPageClient({
  vendors,
  regions,
  nationsByRegion,
}: MapPageClientProps) {
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [filterRegion, setFilterRegion] = useState<string>("");
  const [filterNation, setFilterNation] = useState<string>("");
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  // Filter vendors
  const filteredVendors = vendors.filter((v) => {
    if (filterRegion && v.location?.region !== filterRegion) return false;
    if (filterNation && v.nationId !== filterNation) return false;
    return true;
  });

  // Get nations for selected region
  const nationsForRegion = filterRegion
    ? nationsByRegion.find((g) => g.region === filterRegion)?.nations || []
    : nationsByRegion.flatMap((g) => g.nations);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
      {/* Sidebar */}
      <aside className="shrink-0 lg:w-80">
        {/* Filters */}
        <div className="rounded-xl border border-slate-800 bg-[#08090C] p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Filters
          </h2>

          <div className="mt-4 space-y-4">
            {/* Region Filter */}
            <div>
              <label htmlFor="region" className="mb-1.5 block text-sm text-slate-300">
                Region
              </label>
              <select
                id="region"
                value={filterRegion}
                onChange={(e) => {
                  setFilterRegion(e.target.value);
                  setFilterNation("");
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-[#14B8A6] focus:outline-none"
              >
                <option value="">All Regions</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>

            {/* Nation Filter */}
            <div>
              <label htmlFor="nation" className="mb-1.5 block text-sm text-slate-300">
                Nation / Tribe
              </label>
              <select
                id="nation"
                value={filterNation}
                onChange={(e) => setFilterNation(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-[#14B8A6] focus:outline-none"
              >
                <option value="">All Nations</option>
                {nationsForRegion.map((nation) => (
                  <option key={nation.id} value={nation.id}>
                    {nation.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            {(filterRegion || filterNation) && (
              <button
                onClick={() => {
                  setFilterRegion("");
                  setFilterNation("");
                }}
                className="text-sm text-[#14B8A6] hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Results Count */}
          <p className="mt-4 text-sm text-slate-400">
            {filteredVendors.length} vendor{filteredVendors.length !== 1 ? "s" : ""} found
          </p>
        </div>

        {/* View Toggle (Mobile) */}
        <div className="mt-4 flex gap-2 lg:hidden">
          <button
            onClick={() => setViewMode("map")}
            className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition ${
              viewMode === "map"
                ? "border-[#14B8A6] bg-[#14B8A6]/10 text-[#14B8A6]"
                : "border-slate-700 text-slate-400"
            }`}
          >
            Map View
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition ${
              viewMode === "list"
                ? "border-[#14B8A6] bg-[#14B8A6]/10 text-[#14B8A6]"
                : "border-slate-700 text-slate-400"
            }`}
          >
            List View
          </button>
        </div>

        {/* Vendor List (Desktop always visible, Mobile only in list mode) */}
        <div className={`mt-4 ${viewMode === "map" ? "hidden lg:block" : ""}`}>
          <div className="max-h-[calc(100vh-400px)] space-y-2 overflow-y-auto rounded-xl border border-slate-800 bg-[#08090C] p-2 lg:max-h-[calc(100vh-300px)]">
            {filteredVendors.length === 0 ? (
              <p className="p-4 text-center text-sm text-slate-400">
                No vendors match your filters
              </p>
            ) : (
              filteredVendors.map((vendor) => (
                <button
                  key={vendor.id}
                  onClick={() => setSelectedVendor(vendor)}
                  className={`w-full rounded-lg p-3 text-left transition ${
                    selectedVendor?.id === vendor.id
                      ? "bg-[#14B8A6]/10 ring-1 ring-[#14B8A6]"
                      : "hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {vendor.profileImage ? (
                      <img
                        src={vendor.profileImage}
                        alt={vendor.businessName}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700 text-sm font-bold text-slate-400">
                        {vendor.businessName.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-200">
                        {vendor.businessName}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {vendor.nation}
                      </p>
                      {vendor.location?.city && (
                        <p className="truncate text-xs text-slate-500">
                          {vendor.location.city}, {vendor.location.province}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Map Area */}
      <div
        className={`flex-1 ${viewMode === "list" ? "hidden lg:block" : ""}`}
      >
        <div className="relative h-[400px] overflow-hidden rounded-xl border border-slate-800 bg-[#08090C] lg:h-[calc(100vh-200px)]">
          {/* Placeholder Map */}
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="rounded-full bg-slate-800 p-4">
              <svg
                className="h-12 w-12 text-slate-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-200">
              Interactive Map Coming Soon
            </h3>
            <p className="mt-2 max-w-md text-sm text-slate-400">
              We&apos;re working on an interactive map to help you discover
              Indigenous vendors near you. In the meantime, browse vendors using
              the list view.
            </p>
            <p className="mt-4 text-xs text-slate-500">
              {filteredVendors.length} vendors with location data available
            </p>
          </div>

          {/* Map will be integrated here with react-leaflet or similar */}
          {/* Example integration point:
          <MapContainer
            center={[54.0, -100.0]}
            zoom={4}
            className="h-full w-full"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {filteredVendors.map((vendor) => (
              <Marker
                key={vendor.id}
                position={[
                  vendor.location!.coordinates!.lat,
                  vendor.location!.coordinates!.lng,
                ]}
                eventHandlers={{
                  click: () => setSelectedVendor(vendor),
                }}
              >
                <Popup>{vendor.businessName}</Popup>
              </Marker>
            ))}
          </MapContainer>
          */}
        </div>
      </div>

      {/* Selected Vendor Panel */}
      {selectedVendor && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-[#08090C] p-4 lg:absolute lg:bottom-4 lg:left-auto lg:right-4 lg:w-80 lg:rounded-xl lg:border">
          <button
            onClick={() => setSelectedVendor(null)}
            className="absolute right-2 top-2 rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-start gap-4">
            {selectedVendor.profileImage ? (
              <img
                src={selectedVendor.profileImage}
                alt={selectedVendor.businessName}
                className="h-16 w-16 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-700 text-xl font-bold text-slate-400">
                {selectedVendor.businessName.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-slate-100">
                {selectedVendor.businessName}
              </h3>
              <p className="text-sm text-slate-400">{selectedVendor.nation}</p>
              {selectedVendor.location?.city && (
                <p className="text-xs text-slate-500">
                  {selectedVendor.location.city}, {selectedVendor.location.province}
                </p>
              )}
            </div>
          </div>

          {selectedVendor.tagline && (
            <p className="mt-3 text-sm text-slate-300">{selectedVendor.tagline}</p>
          )}

          <div className="mt-4 flex gap-2">
            <Link
              href={`/shop/${selectedVendor.slug}`}
              className="flex-1 rounded-lg bg-[#14B8A6] px-4 py-2 text-center text-sm font-semibold text-slate-900 transition hover:bg-[#0D9488]"
            >
              View Profile
            </Link>
            {selectedVendor.website && (
              <a
                href={selectedVendor.website}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
