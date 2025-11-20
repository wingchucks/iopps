import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import SiteHeader from "@/components/SiteHeader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IOPPS - Empowering Indigenous Success across Canada",
  description:
    "Empowering Indigenous success across Canada through jobs, conferences, scholarships, pow wows, Indigenous-owned businesses, and live streams.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const year = new Date().getFullYear();

  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-950 text-slate-100`}>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <SiteHeader />

            <main className="flex-1">{children}</main>

            <footer className="border-t border-slate-800 bg-slate-900/80">
              <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-400">
                &copy; {year} IOPPS. Empowering Indigenous Success across Canada.
              </div>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
