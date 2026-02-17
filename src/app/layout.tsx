import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
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
  metadataBase: new URL("https://iopps.vercel.app"),
  manifest: "/manifest.json",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased`}>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
