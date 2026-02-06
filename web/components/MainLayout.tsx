"use client";

import { usePathname } from "next/navigation";
import { BackToTop } from "./BackToTop";
import { AppHeader } from "./AppHeader";


export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Admin routes have their own layout
  const isAdminRoute = pathname?.startsWith("/admin");
  
  // Homepage has its own complete layout with header built-in
  const isHomepage = pathname === "/";
  
  // Organization dashboard pages have their own layout
  const isOrgDashboard = pathname?.startsWith("/organization");
  
  // Member dashboard pages have their own layout  
  const isMemberDashboard = pathname?.startsWith("/member");

  if (isAdminRoute) {
    return <>{children}</>;
  }

  // These routes have their own complete layouts
  if (isHomepage || isOrgDashboard || isMemberDashboard) {
    return (
      <>
        {children}
        <BackToTop />
      </>
    );
  }

  // All other routes: add AppHeader
  return (
    <div style={{ minHeight: "100vh", paddingBottom: "70px" }}>
      <AppHeader />
      <main>{children}</main>
      <BackToTop />
    </div>
  );
}
