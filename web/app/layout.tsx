import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import { generateOrganizationSchema, generateWebsiteSchema } from "@/lib/seo";
import MainLayout from "@/components/MainLayout";
import PerformanceMonitor from "@/components/PerformanceMonitor";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#14B8A6" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "IOPPS.ca | Indigenous Jobs, Events, Scholarships & Business Directory",
    template: "%s | IOPPS.ca",
  },
  description:
    "Canada's Indigenous opportunity hub. Find Indigenous jobs, pow wows, conferences, scholarships, and Indigenous-owned businesses. Connect with employers committed to reconciliation and Indigenous economic empowerment.",
  keywords: [
    "Indigenous jobs Canada",
    "Indigenous employment",
    "Indigenous scholarships",
    "Indigenous conferences",
    "pow wows Canada",
    "Indigenous business directory",
    "Indigenous entrepreneurs",
    "economic reconciliation",
    "TRC Call to Action 92",
    "First Nations jobs",
    "Métis employment",
    "Inuit careers",
    "Indigenous events",
    "Indigenous community",
    "Native jobs Canada",
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
  openGraph: {
    type: "website",
    locale: "en_CA",
    url: "/",
    title: "IOPPS.ca | Indigenous Jobs, Events, Scholarships & Business Directory",
    description:
      "Canada's Indigenous opportunity hub. Find jobs, pow wows, conferences, scholarships, and Indigenous-owned businesses. Empowering Indigenous success.",
    siteName: "IOPPS.ca",

  },
  twitter: {
    card: "summary_large_image",
    title: "IOPPS.ca | Indigenous Jobs, Events, Scholarships & Business Directory",
    description:
      "Canada's Indigenous opportunity hub. Find jobs, pow wows, conferences, scholarships, and Indigenous-owned businesses.",
    creator: "@ioppsca",
    images: ["/og/default.png"],
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
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
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
        {/* Service Worker Registration for PWA */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      
                    },
                    function(err) {
                      
                    }
                  );
                });
              }
            `,
          }}
        />
      </head>
      <body className={`${inter.className} bg-slate-950 text-slate-100`}>
        <AuthProvider>
          {!process.env.NEXT_PUBLIC_FIREBASE_API_KEY && (
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-xs font-medium text-amber-500">
              <span className="mr-2">⚠️</span>
              <strong>Demo Mode:</strong> Running with mock data because Firebase is not configured.
            </div>
          )}
          <MainLayout>{children}</MainLayout>
        </AuthProvider>
        <Toaster position="bottom-right" toastOptions={{
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid #334155',
          },
        }} />
        <PerformanceMonitor />
      </body>
    </html>
  );
}
