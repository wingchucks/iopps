import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { ToastProvider } from "@/lib/toast-context";
import { OnboardingProvider } from "@/lib/onboarding-context";
import AuthErrorBoundary from "@/components/AuthErrorBoundary";
import SessionManager from "@/components/SessionManager";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "IOPPS — Empowering Indigenous Success",
    template: "%s | IOPPS",
  },
  description:
    "Jobs, events, scholarships, businesses, schools, and livestreams — all in one place for Indigenous people across North America.",
  metadataBase: new URL("https://iopps-fresh.vercel.app"),
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "IOPPS",
  },
  openGraph: {
    title: "IOPPS — Empowering Indigenous Success",
    description:
      "Jobs, events, scholarships, businesses, schools, and livestreams for Indigenous communities.",
    siteName: "IOPPS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IOPPS — Empowering Indigenous Success",
    description:
      "Jobs, events, scholarships, businesses, schools, and livestreams for Indigenous communities.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0D9488",
};

const themeScript = `(function(){try{var t=localStorage.getItem("iopps-theme");if(t==="dark")document.documentElement.setAttribute("data-theme","dark")}catch(e){}})()`;

const swScript = `if("serviceWorker"in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js")})}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: swScript }} />
      </head>
      <body className={`${geistSans.variable} antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <OnboardingProvider>
                <AuthErrorBoundary>
                  <SessionManager />
                  {children}
                </AuthErrorBoundary>
              </OnboardingProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
