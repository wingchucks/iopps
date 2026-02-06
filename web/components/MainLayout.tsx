"use client";

import { usePathname } from "next/navigation";
import { BackToTop } from "./BackToTop";


export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // New app-style layout - no old site header/footer anywhere
  // Each page handles its own navigation
  const isAdminRoute = pathname?.startsWith("/admin");

  if (isAdminRoute) {
    // Admin routes have their own layout
    return <>{children}</>;
  }

  // All other routes: just render children (no old header/footer)
  return (
    <>
      {children}
      <BackToTop />
    </>
  );
}
