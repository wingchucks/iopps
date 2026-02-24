"use client";

import { useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/jobs", label: "Jobs" },
  { href: "/events", label: "Events" },
  { href: "/partners", label: "Partners" },
  { href: "/schools", label: "Schools" },
  { href: "/stories", label: "Stories" },
  { href: "/shop", label: "Shop" },
  { href: "/pricing", label: "Pricing" },
];

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden relative">
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Menu"
        className="flex items-center justify-center w-9 h-9 rounded-lg border-none cursor-pointer transition-all"
        style={{
          background: open ? "rgba(255,255,255,.15)" : "rgba(255,255,255,.08)",
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,.85)"
          strokeWidth="2"
          strokeLinecap="round"
        >
          {open ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-12 rounded-xl shadow-lg z-50 min-w-[180px] py-2"
          style={{
            background: "var(--navy)",
            border: "1px solid rgba(255,255,255,.1)",
            backdropFilter: "blur(20px)",
          }}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block px-5 py-3 text-sm font-semibold no-underline transition-all hover:bg-white/10"
              style={{ color: "rgba(255,255,255,.85)" }}
            >
              {link.label}
            </Link>
          ))}
          <div className="mx-4 my-2 h-px" style={{ background: "rgba(255,255,255,.1)" }} />
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="block px-5 py-3 text-sm font-semibold no-underline transition-all hover:bg-white/10"
            style={{ color: "var(--teal)" }}
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            onClick={() => setOpen(false)}
            className="block px-5 py-3 text-sm font-semibold no-underline transition-all hover:bg-white/10"
            style={{ color: "var(--teal)" }}
          >
            Join Free
          </Link>
        </div>
      )}
    </div>
  );
}
