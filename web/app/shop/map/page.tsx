import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { getVendors } from "@/lib/firebase/vendors";
import { getNationsByRegion } from "@/lib/firebase/nations";
import { MapPageClient } from "./MapPageClient";

export const metadata: Metadata = {
  title: "Vendor Map | Shop Indigenous",
  description:
    "Explore Indigenous vendors across North America on our interactive map. Find artisans and businesses near you.",
  openGraph: {
    title: "Vendor Map | Shop Indigenous",
    description: "Explore Indigenous vendors across North America on our interactive map.",
  },
};

export const revalidate = 300;

export default async function MapPage() {
  // Fetch vendors with location data
  const [vendorsResult, nationsByRegion] = await Promise.all([
    getVendors({}, { sortBy: "newest", limit: 100 }),
    getNationsByRegion(),
  ]);

  // Filter vendors with coordinates
  const vendorsWithLocation = vendorsResult.vendors.filter(
    (v) => v.location?.coordinates?.lat && v.location?.coordinates?.lng
  );

  // Get region options
  const regions = nationsByRegion.map((g) => g.region);

  return (
    <PageShell className="pb-0 md:pb-0">
      {/* Header */}
      <header className="mb-6">
        <nav className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/shop" className="hover:text-[#14B8A6]">
            Shop Indigenous
          </Link>
          <span>/</span>
          <span className="text-slate-200">Map</span>
        </nav>

        <h1 className="mt-4 text-2xl font-bold text-slate-100 md:text-3xl">
          Vendor Map
        </h1>
        <p className="mt-2 text-slate-400">
          Explore Indigenous vendors and artisans across Turtle Island
        </p>
      </header>

      {/* Map Client Component */}
      <MapPageClient
        vendors={vendorsWithLocation}
        regions={regions}
        nationsByRegion={nationsByRegion}
      />
    </PageShell>
  );
}
