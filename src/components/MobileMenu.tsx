"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import MobileNavigationSheet from "@/components/MobileNavigationSheet";
import {
  getBrandHref,
  getMobileNavigationSections,
  getPublicAuthNavItems,
} from "@/lib/navigation";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Menu"
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/8 text-xl text-white"
      >
        &#9776;
      </button>

      <MobileNavigationSheet
        open={open}
        onClose={() => setOpen(false)}
        pathname={pathname}
        brandHref={getBrandHref(false)}
        sections={getMobileNavigationSections({ isAuthenticated: false }).filter((section) => section.key !== "auth")}
        authActions={getPublicAuthNavItems()}
      />
    </>
  );
}
