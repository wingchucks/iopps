"use client";

import { useState } from "react";
import Link from "next/link";
import { getPublicAuthNavItems, getPublicExploreNavItems } from "@/lib/navigation";

const exploreLinks = getPublicExploreNavItems();
const authLinks = getPublicAuthNavItems();

export default function LandingMobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Menu"}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-9 w-10 items-center justify-center rounded-xl border border-white/18 bg-white/[.08] text-lg font-black text-white"
      >
        {open ? "×" : "\u2630"}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 cursor-default border-0 bg-black/45 p-0"
            onClick={() => setOpen(false)}
          />
          <nav
            aria-label="Mobile navigation"
            className="fixed inset-x-4 top-20 z-50 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-2xl border border-white/12 bg-[var(--navy-deep)] p-3 shadow-2xl shadow-black/30"
          >
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
          </nav>
        </>
      )}
    </div>
  );
}
