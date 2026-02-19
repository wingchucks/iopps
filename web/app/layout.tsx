import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { MobileNav } from "@/components/layout/MobileNav";
import { generateOrganizationSchema, generateWebsiteSchema } from "@/lib/seo";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8F9FA" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "IOPPS - Indigenous Opportunities & Partnerships Platform",
    template: "%s | IOPPS",
  },
  description:
    "Canada's Indigenous opportunity hub. Find Indigenous jobs, pow wows, conferences, scholarships, and Indigenous-owned businesses. Empowering Indigenous success across Canada.",
  keywords: [
    "Indigenous jobs Canada",
    "Indigenous employment",
    "Indigenous scholarships",
    "Indigenous conferences",
    "pow wows Canada",
    "Indigenous business directory",
    "Indigenous entrepreneurs",
    "economic reconciliation",
  ],
  authors: [{ name: "IOPPS Team" }],
  creator: "IOPPS",
  publisher: "IOPPS",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://iopps.ca",
  ),
  openGraph: {
    type: "website",
    locale: "en_CA",
    url: "/",
    title: "IOPPS - Indigenous Opportunities & Partnerships Platform",
    description:
      "Canada's Indigenous opportunity hub. Find jobs, pow wows, conferences, scholarships, and Indigenous-owned businesses.",
    siteName: "IOPPS.ca",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "IOPPS - Indigenous Opportunities & Partnerships Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "IOPPS - Indigenous Opportunities & Partnerships Platform",
    description:
      "Canada's Indigenous opportunity hub. Find jobs, pow wows, conferences, scholarships, and Indigenous-owned businesses.",
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
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "IOPPS",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Theme initialization - runs before paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('iopps-theme');if(t==='dark'){document.documentElement.setAttribute('data-theme','dark')}else{document.documentElement.setAttribute('data-theme','light')}}catch(e){}})()`,
          }}
        />
        <link rel="manifest" href="/manifest.json" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              generateOrganizationSchema(),
              generateWebsiteSchema(),
            ]),
          }}
        />
      </head>
      <body className="bg-background text-foreground">
        <AuthProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-white focus:font-medium focus:shadow-lg"
          >
            Skip to main content
          </a>

          <SiteHeader />

          <main id="main-content" className="min-h-screen">
            {children}
          </main>

          <SiteFooter />
          <MobileNav />

          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "var(--card-bg)",
                color: "var(--text-primary)",
                border: "1px solid var(--card-border)",
              },
            }}
          />
        </AuthProvider>

        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}`
          }}
        />
      </body>
    </html>
  );
}
