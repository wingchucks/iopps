"use client";

import { usePathname } from "next/navigation";
import { BackToTop } from "./BackToTop";
import { AppHeader } from "./AppHeader";


export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Admin routes have their own layout
  const isAdminRoute = pathname?.startsWith("/admin");
  
  // Pages using FeedLayout or CommunityShell have their own complete layout with header
  const isFeedRoute =
    pathname === "/" ||
    pathname?.startsWith("/signup") ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/register") ||
    pathname?.startsWith("/forgot-password") ||
    pathname?.startsWith("/onboarding") ||
    pathname?.startsWith("/welcome") ||
    pathname?.startsWith("/discover") ||
    pathname?.startsWith("/for-employers") ||
    pathname?.startsWith("/pricing") ||
    pathname?.startsWith("/careers") ||
    pathname?.startsWith("/education") ||
    pathname?.startsWith("/business") ||
    pathname?.startsWith("/community") ||
    pathname?.startsWith("/live") ||
    pathname?.startsWith("/map") ||
    pathname?.startsWith("/conferences") ||
    pathname?.startsWith("/search") ||
    pathname?.startsWith("/saved") ||
    pathname?.startsWith("/about") ||
    pathname?.startsWith("/privacy") ||
    pathname?.startsWith("/terms") ||
    pathname?.startsWith("/contact") ||
    pathname?.startsWith("/organizations") ||
    pathname?.startsWith("/employers") ||
    pathname?.startsWith("/members") ||
    pathname?.startsWith("/network") ||
    pathname?.startsWith("/home") ||  // CommunityShell provides its own header
    pathname?.startsWith("/me");      // Career vault, opportunities etc. use CommunityShell

  // Organization dashboard pages have their own layout (singular /organization/)
  const isOrgDashboard = pathname?.startsWith("/organization/");

  // Member dashboard pages have their own layout (singular /member/)
  const isMemberDashboard = pathname?.startsWith("/member/") || pathname === "/member";

  if (isAdminRoute) {
    return <main id="main-content">{children}</main>;
  }

  // These routes have their own complete layouts (FeedLayout or dashboard)
  if (isFeedRoute || isOrgDashboard || isMemberDashboard) {
    return (
      <>
        <main id="main-content">{children}</main>
        <BackToTop />
      </>
    );
  }

  // All other routes: add AppHeader
  return (
    <div style={{ minHeight: "100vh", paddingBottom: "70px" }}>
      <AppHeader />
      <main id="main-content">{children}</main>
      <BackToTop />
    </div>
  );
}
