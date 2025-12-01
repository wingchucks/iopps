"use client";

import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getVendorByOwnerId, type Vendor } from "@/lib/firebase/vendors";

// Icons as inline SVGs for consistency
const icons = {
  dashboard: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  profile: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  gallery: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  analytics: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  settings: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  store: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  back: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
    </svg>
  ),
  menu: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  close: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

export default function VendorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Load vendor data
  useEffect(() => {
    async function loadVendor() {
      if (!user) return;

      try {
        const vendorData = await getVendorByOwnerId(user.uid);
        setVendor(vendorData);
      } catch (error) {
        console.error("Error loading vendor:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading) {
      if (!user) {
        router.push("/login?redirect=/dashboard/vendor");
      } else {
        loadVendor();
      }
    }
  }, [user, authLoading, router]);

  // Show loading state
  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0D10] text-slate-400">
        <div className="text-center">
          <svg className="mx-auto h-8 w-8 animate-spin text-[#14B8A6]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-4">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  // Show setup prompt if no vendor profile
  if (!vendor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0D10] p-6">
        <div className="max-w-md rounded-2xl border border-slate-800 bg-[#08090C] p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#14B8A6]/10">
            {icons.store}
          </div>
          <h1 className="mt-6 text-2xl font-bold text-slate-100">
            Create Your Storefront
          </h1>
          <p className="mt-3 text-slate-400">
            You don&apos;t have a vendor profile yet. Set up your storefront to
            start showcasing your products and services on Shop Indigenous.
          </p>
          <Link
            href="/dashboard/vendor/setup"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 transition hover:bg-[#0D9488]"
          >
            Get Started
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <Link
            href="/shop"
            className="mt-4 block text-sm text-slate-400 hover:text-slate-300"
          >
            Browse Shop Indigenous instead
          </Link>
        </div>
      </div>
    );
  }

  const navigation = [
    { name: "Overview", href: "/dashboard/vendor", icon: icons.dashboard },
    { name: "Edit Profile", href: "/dashboard/vendor/profile", icon: icons.profile },
    { name: "Gallery", href: "/dashboard/vendor/gallery", icon: icons.gallery },
    { name: "Analytics", href: "/dashboard/vendor/analytics", icon: icons.analytics },
    { name: "Settings", href: "/dashboard/vendor/settings", icon: icons.settings },
  ];

  return (
    <div className="min-h-screen bg-[#0B0D10]">
      <div className="flex h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden w-64 flex-col border-r border-slate-800 bg-[#08090C] lg:flex">
          <div className="flex h-16 items-center border-b border-slate-800 px-6">
            <Link
              href={`/shop/${vendor.slug}`}
              className="flex items-center gap-3 font-bold text-slate-100"
            >
              {vendor.profileImage ? (
                <img
                  src={vendor.profileImage}
                  alt={vendor.name}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#14B8A6] text-sm font-bold text-slate-900">
                  {vendor.name.charAt(0)}
                </div>
              )}
              <span className="truncate">{vendor.name}</span>
            </Link>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const isActive =
                item.href === "/dashboard/vendor"
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-[#14B8A6]/10 text-[#14B8A6]"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span
                    className={
                      isActive
                        ? "text-[#14B8A6]"
                        : "text-slate-400 group-hover:text-slate-300"
                    }
                  >
                    {item.icon}
                  </span>
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-800 p-4 space-y-2">
            <Link
              href={`/shop/${vendor.slug}`}
              className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              {icons.store}
              View Storefront
            </Link>
            <Link
              href="/shop"
              className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              {icons.back}
              Back to Shop
            </Link>
          </div>
        </div>

        {/* Mobile Header & Menu */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-[#08090C] px-4 lg:hidden">
            <Link
              href={`/shop/${vendor.slug}`}
              className="flex items-center gap-3 font-bold text-slate-100"
            >
              {vendor.profileImage ? (
                <img
                  src={vendor.profileImage}
                  alt={vendor.name}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#14B8A6] text-sm font-bold text-slate-900">
                  {vendor.name.charAt(0)}
                </div>
              )}
              <span className="truncate max-w-[150px]">{vendor.name}</span>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              {mobileMenuOpen ? icons.close : icons.menu}
            </button>
          </header>

          {/* Mobile Navigation Drawer */}
          {mobileMenuOpen && (
            <div className="absolute inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0 bg-black/60"
                onClick={() => setMobileMenuOpen(false)}
              />
              <nav className="absolute right-0 top-16 bottom-0 w-64 border-l border-slate-800 bg-[#08090C] p-4">
                <div className="space-y-1">
                  {navigation.map((item) => {
                    const isActive =
                      item.href === "/dashboard/vendor"
                        ? pathname === item.href
                        : pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                          isActive
                            ? "bg-[#14B8A6]/10 text-[#14B8A6]"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        <span
                          className={
                            isActive
                              ? "text-[#14B8A6]"
                              : "text-slate-400 group-hover:text-slate-300"
                          }
                        >
                          {item.icon}
                        </span>
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
                <div className="mt-6 border-t border-slate-800 pt-4 space-y-1">
                  <Link
                    href={`/shop/${vendor.slug}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white"
                  >
                    {icons.store}
                    View Storefront
                  </Link>
                  <Link
                    href="/shop"
                    onClick={() => setMobileMenuOpen(false)}
                    className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white"
                  >
                    {icons.back}
                    Back to Shop
                  </Link>
                </div>
              </nav>
            </div>
          )}

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto bg-[#0B0D10] p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
