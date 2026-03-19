"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const NAV_LINKS = [
  {
    href: "/jobs",
    label: "Jobs",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
  {
    href: "/events",
    label: "Events",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    href: "/partners",
    label: "Partners",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    href: "/schools",
    label: "Schools",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5" />
      </svg>
    ),
  },
  {
    href: "/businesses",
    label: "Businesses",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: "/livestreams",
    label: "Live",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" />
      </svg>
    ),
    dot: true,
  },
  {
    href: "/shop",
    label: "Shop",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    ),
  },
  {
    href: "/pricing",
    label: "Pricing",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
];

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  /* Prevent body scroll when menu is open */
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="sm:hidden">
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Menu"
        className="flex items-center justify-center w-9 h-9 rounded-lg border-none cursor-pointer transition-all relative z-[60]"
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

      {/* Full-screen overlay menu */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,.5)" }}
            onClick={() => setOpen(false)}
          />

          {/* Menu panel */}
          <div
            className="fixed left-0 right-0 top-0 z-50 overflow-y-auto"
            style={{
              maxHeight: "100vh",
              background: "var(--navy)",
              borderBottom: "1px solid rgba(255,255,255,.1)",
            }}
          >
            {/* Header with close button */}
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-white font-black text-xl tracking-[2px]">IOPPS</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex items-center justify-center w-9 h-9 rounded-lg border-none cursor-pointer"
                style={{ background: "rgba(255,255,255,.1)" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Nav links */}
            <div className="px-3 pb-3">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold no-underline transition-all hover:bg-white/10"
                  style={{ color: "rgba(255,255,255,.85)" }}
                >
                  <span style={{ color: "rgba(255,255,255,.5)" }}>{link.icon}</span>
                  {link.label}
                  {link.dot && (
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full ml-1"
                      style={{
                        background: "#DC2626",
                        animation: "pulse-nav-dot 2s ease-in-out infinite",
                      }}
                    />
                  )}
                </Link>
              ))}
            </div>

            {/* Divider */}
            <div className="mx-5 h-px" style={{ background: "rgba(255,255,255,.1)" }} />

            {/* Auth buttons */}
            <div className="p-4 flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center py-3 rounded-xl text-sm font-bold no-underline transition-all"
                style={{
                  background: "var(--teal)",
                  color: "#fff",
                }}
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center py-3 rounded-xl text-sm font-bold no-underline transition-all"
                style={{
                  background: "rgba(255,255,255,.08)",
                  border: "1px solid rgba(255,255,255,.15)",
                  color: "rgba(255,255,255,.85)",
                }}
              >
                Join Free
              </Link>
            </div>
          </div>

          <style>{`
            @keyframes pulse-nav-dot {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.5; transform: scale(1.3); }
            }
          `}</style>
        </>
      )}
    </div>
  );
}
