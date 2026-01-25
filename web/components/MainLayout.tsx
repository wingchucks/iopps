"use client";

import { usePathname } from "next/navigation";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import { MobileBottomNav } from "./MobileBottomNav";
import { BackToTop } from "./BackToTop";


export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Don't show main site header/footer for admin routes
  const isAdminRoute = pathname?.startsWith("/admin");
  const isBuilderRoute = pathname?.includes("/edit") && pathname?.includes("/organization");

  if (isAdminRoute || isBuilderRoute) {
    // Admin/builder routes have their own layout - just render children
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">

      <SiteHeader />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <SiteFooter />
      <MobileBottomNav />
      <BackToTop />
    </div>
  );
}
