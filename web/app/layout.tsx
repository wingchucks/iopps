import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.iopps.ca"),
  title: {
    default: "IOPPS — Indigenous Opportunities & Partnerships Platform",
    template: "%s | IOPPS",
  },
  description:
    "IOPPS.CA — Empowering Indigenous Success. Discover Indigenous jobs, events, scholarships, education, businesses, and livestreams across Canada.",
  keywords: [
    "Indigenous jobs",
    "Indigenous opportunities",
    "First Nations employment",
    "Indigenous scholarships",
    "Indigenous events",
    "pow wow",
    "Indigenous business",
    "IOPPS",
  ],
  openGraph: {
    type: "website",
    locale: "en_CA",
    url: "https://www.iopps.ca",
    siteName: "IOPPS",
    title: "IOPPS — Indigenous Opportunities & Partnerships Platform",
    description:
      "Empowering Indigenous Success. Jobs, events, scholarships, education, businesses, and livestreams.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@iopps1",
    title: "IOPPS — Indigenous Opportunities & Partnerships Platform",
    description: "Empowering Indigenous Success.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
        {children}
      </body>
    </html>
  );
}
