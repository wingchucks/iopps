import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Indigenous Conferences & Summits",
  description:
    "Discover Indigenous conferences, summits, and professional events across Canada. Network, learn, and connect with Indigenous leaders, professionals, and organizations. Find upcoming events in business, education, health, and culture.",
  keywords: [
    "Indigenous conferences",
    "Indigenous summits",
    "Indigenous events Canada",
    "First Nations conferences",
    "Indigenous business events",
    "Indigenous professional development",
    "Indigenous networking",
    "Indigenous education conferences",
    "Indigenous health summits",
    "reconciliation events",
  ],
  openGraph: {
    title: "Indigenous Conferences & Summits | IOPPS.ca",
    description:
      "Discover Indigenous conferences, summits, and professional events across Canada. Network and connect with Indigenous leaders and organizations.",
    url: "/conferences",
    images: [
      {
        url: "/og-conferences.png",
        width: 1200,
        height: 630,
        alt: "IOPPS Indigenous Conferences & Events",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Indigenous Conferences & Summits | IOPPS.ca",
    description:
      "Discover Indigenous conferences, summits, and professional events across Canada.",
  },
  alternates: {
    canonical: "/conferences",
  },
};

export default function ConferencesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
