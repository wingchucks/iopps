import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import { generateOrganizationSchema, generateWebsiteSchema } from "@/lib/seo";
import MainLayout from "@/components/MainLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "IOPPS - Indigenous Opportunities & Partnerships Platform",
    template: "%s | IOPPS",
  },
  description:
    "Empowering Indigenous success across Canada through jobs, conferences, scholarships, pow wows, Indigenous-owned businesses, and live streams. Join thousands of Indigenous community members and employers committed to economic reconciliation.",
  keywords: [
    "Indigenous jobs",
    "Indigenous employment",
    "Indigenous scholarships",
    "Indigenous conferences",
    "pow wows",
    "Indigenous businesses",
    "Indigenous entrepreneurs",
    "economic reconciliation",
    "TRC Call to Action 92",
    "Indigenous opportunities Canada",
    "First Nations jobs",
    "Métis employment",
    "Inuit careers",
  ],
  authors: [{ name: "IOPPS Team" }],
  creator: "IOPPS",
  publisher: "IOPPS",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://iopps.ca"),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "IOPPS",
  },
  formatDetection: {
    telephone: true,
    email: true,
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: "cover",
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#14B8A6" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
  openGraph: {
    type: "website",
    locale: "en_CA",
    url: "/",
    title: "IOPPS - Indigenous Opportunities & Partnerships Platform",
    description:
      "Empowering Indigenous success across Canada through jobs, conferences, scholarships, and more.",
    siteName: "IOPPS",
  },
  twitter: {
    card: "summary_large_image",
    title: "IOPPS - Indigenous Opportunities & Partnerships Platform",
    description:
      "Empowering Indigenous success across Canada through jobs, conferences, scholarships, and more.",
    creator: "@ioppsca",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const organizationSchema = generateOrganizationSchema();
  const websiteSchema = generateWebsiteSchema();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema),
          }}
        />
      </head>
      <body className={`${inter.className} bg-slate-950 text-slate-100`}>
        <AuthProvider>
          <MainLayout>{children}</MainLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
