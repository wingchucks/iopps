import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { ToastProvider } from "@/lib/toast-context";
import { OnboardingProvider } from "@/lib/onboarding-context";
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
  themeColor: "#0F2B4C",
};

const themeScript = `(function(){try{var t=localStorage.getItem("iopps-theme");if(t==="dark")document.documentElement.setAttribute("data-theme","dark")}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geistSans.variable} antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <OnboardingProvider>{children}</OnboardingProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
