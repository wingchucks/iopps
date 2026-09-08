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
    ["/applications", "/saved", "/profile/resume", "/businesses", "/livestreams"].includes(pathname);
  if (opportunityFlow)
    return (
      <>
        <OpportunityHeader />
        <div className="op-account-surface">{children}</div>
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
      <div className="lg:pl-[240px] min-w-0 overflow-x-hidden">{children}</div>
    </>
  );
}
