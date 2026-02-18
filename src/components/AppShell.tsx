"use client";

import NavBar from "./NavBar";
import IconRailSidebar from "./IconRailSidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Mobile / tablet: top NavBar (hidden on lg+) */}
      <div className="lg:hidden">
        <NavBar />
      </div>

      {/* Desktop: icon rail sidebar (hidden below lg) */}
      <IconRailSidebar />

      {/* Content area — offset for the fixed rail on desktop */}
      <div className="lg:pl-[72px]">{children}</div>
    </>
  );
}
