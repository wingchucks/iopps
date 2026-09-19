"use client";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import OpportunityHeader from "./OpportunityHeader";
import NavBar from "./NavBar";
import IconRailSidebar from "./IconRailSidebar";
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const opportunityFlow =
    pathname.startsWith("/jobs/") ||
    pathname.startsWith("/events/") ||
    pathname.startsWith("/scholarships/") ||
    (/^\/org\/[^/]+$/.test(pathname) && !["/org/dashboard", "/org/signup", "/org/onboarding", "/org/plans", "/org/upgrade", "/org/checkout"].includes(pathname)) ||
    ["/applications", "/saved", "/profile/resume", "/businesses", "/partners", "/livestreams", "/events", "/scholarships"].includes(pathname);
  if (opportunityFlow)
    return (
      <>
        <OpportunityHeader />
        <div data-main-content tabIndex={-1} className="op-account-surface">{children}</div>
      </>
    );
  return (
    <>
      {/* Mobile / tablet: top NavBar (hidden on lg+) */}
      <div className="lg:hidden">
        <NavBar />
      </div>
      {/* Desktop: persistent left navigation (hidden below lg) */}
      <Suspense fallback={null}>
        <IconRailSidebar />
      </Suspense>
      {/* Content area — offset for the fixed sidebar on desktop */}
      <div data-main-content tabIndex={-1} className="lg:pl-[240px] min-w-0 overflow-x-hidden">{children}</div>
    </>
  );
}
