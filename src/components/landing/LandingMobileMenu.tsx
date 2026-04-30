"use client";

import { useState } from "react";
import Link from "next/link";
import { getPublicAuthNavItems, getPublicExploreNavItems } from "@/lib/navigation";

const exploreLinks = getPublicExploreNavItems();
const authLinks = getPublicAuthNavItems();

export default function LandingMobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative lg:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Menu"}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-9 w-10 items-center justify-center rounded-xl border border-white/18 bg-white/[.08] text-lg font-black text-white"
      >
        {open ? "x" : "\u2630"}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-30 w-[min(84vw,300px)] rounded-2xl border border-white/12 bg-[var(--navy-deep)] p-3 shadow-2xl shadow-black/30">
          <div className="grid gap-1">
            {exploreLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold text-white/86 no-underline hover:bg-white/10"
              >
                <span>{link.label}</span>
                <span className="text-white/35">-&gt;</span>
              </Link>
            ))}
          </div>

          <div className="my-2 h-px bg-white/10" />

          <div className="grid gap-2">
            {authLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2.5 text-center text-sm font-black no-underline"
                style={{
                  background: link.key === "signup" ? "var(--teal)" : "rgba(255,255,255,.08)",
                  color: "#FFFFFF",
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
