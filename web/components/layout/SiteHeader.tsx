"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

const NAV_LINKS = [
  { href: "/jobs", label: "Jobs" },
  { href: "/events", label: "Events" },
  { href: "/education", label: "Education" },
  { href: "/business", label: "Business" },
  { href: "/schools", label: "Schools" },
];

export function SiteHeader() {
  const { user, loading, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-[var(--navy)] border-b border-[var(--navy-light)]">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-white font-bold text-2xl tracking-wide">
          IOPPS
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-white/80 hover:text-white text-sm font-medium transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-3">
          {loading ? (
            <div className="w-20 h-8 rounded bg-white/10 animate-pulse" />
          ) : user ? (
            <>
              {/* Bell */}
              <Link href="/notifications" className="text-white/70 hover:text-white p-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </Link>
              {/* Profile dropdown */}
              <div ref={profileRef} className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="w-8 h-8 rounded-full bg-[var(--teal)] text-white flex items-center justify-center text-sm font-semibold"
                >
                  {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                </button>
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-lg py-1 z-50">
                    <Link href="/profile" className="block px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-raised)]">
                      Profile
                    </Link>
                    <Link href="/saved" className="block px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-raised)]">
                      Saved
                    </Link>
                    <Link href="/settings" className="block px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-raised)]">
                      Settings
                    </Link>
                    <hr className="my-1 border-[var(--card-border)]" />
                    <button
                      onClick={() => { signOut(); setProfileOpen(false); }}
                      className="block w-full text-left px-4 py-2 text-sm text-[var(--danger)] hover:bg-[var(--surface-raised)]"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-white/90 hover:text-white text-sm font-medium px-4 py-2"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-white p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[var(--navy)] border-t border-[var(--navy-light)] px-4 pb-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block py-3 text-white/80 hover:text-white text-sm font-medium border-b border-white/10"
            >
              {link.label}
            </Link>
          ))}
          {!loading && !user && (
            <div className="flex gap-3 mt-4">
              <Link href="/login" className="flex-1 text-center text-white border border-white/30 rounded-lg py-2 text-sm">
                Sign In
              </Link>
              <Link href="/signup" className="flex-1 text-center bg-[var(--teal)] text-white rounded-lg py-2 text-sm font-semibold">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
