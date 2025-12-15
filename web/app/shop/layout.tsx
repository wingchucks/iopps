import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Indigenous Business Directory & Marketplace",
  description:
    "Support Indigenous-owned businesses across Canada. Discover and shop from Indigenous entrepreneurs, artisans, and service providers. Browse by category, region, or nation. Shop Indigenous, support economic reconciliation.",
  keywords: [
    "Indigenous businesses",
    "Indigenous owned businesses",
    "Indigenous marketplace",
    "Indigenous entrepreneurs",
    "Indigenous artisans",
    "First Nations businesses",
    "Métis businesses",
    "Inuit businesses",
    "shop Indigenous",
    "Indigenous products Canada",
    "Indigenous services",
    "support Indigenous business",
  ],
  openGraph: {
    title: "Indigenous Business Directory & Marketplace | IOPPS.ca",
    description:
      "Support Indigenous-owned businesses across Canada. Discover and shop from Indigenous entrepreneurs, artisans, and service providers.",
    url: "/shop",
    images: [
      {
        url: "/og-shop.png",
        width: 1200,
        height: 630,
        alt: "IOPPS Indigenous Business Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Indigenous Business Directory & Marketplace | IOPPS.ca",
    description:
      "Support Indigenous-owned businesses across Canada. Shop Indigenous, support reconciliation.",
  },
  alternates: {
    canonical: "/shop",
  },
};

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
