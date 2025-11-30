"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";
import NotificationBell from "@/components/NotificationBell";

const navLinks = [
  { href: "/jobs", label: "Jobs" },
  { href: "/conferences", label: "Conferences" },
  { href: "/scholarships", label: "Scholarships & Grants" },
  { href: "/shop", label: "Shop Indigenous" },
  { href: "/powwows", label: "Pow Wows" },
  { href: "/live", label: "Live Streams" },
  { href: "/pricing", label: "Pricing" },
];

export default function SiteHeader() {
  const { user, role, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = () => setMenuOpen(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/50 bg-gradient-to-r from-[#0D0D0F] via-[#0A0A0C] to-[#0D0D0F] shadow-lg shadow-black/20 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4">
        {/* Single row with logo, navigation, and account */}
        <div className="flex items-center justify-between py-3">
          {/* Branding */}
          <Link href="/" className="group flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-xl shadow-lg shadow-[#14B8A6]/20">
              <Image
                src="/logo.png"
                alt="IOPPS Logo"
                width={40}
                height={40}
                className="object-cover"
                priority
              />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-lg font-bold tracking-tight text-[#14B8A6]">
                IOPPS
              </span>
              <span className="text-[0.65rem] text-slate-400">
                Empowering Indigenous Success
              </span>
            </div>
          </Link>

          {/* Navigation bar */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:bg-slate-800/60 hover:text-[#14B8A6]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="lg:hidden rounded-lg border border-slate-700/50 bg-slate-800/40 p-2 text-slate-300 transition hover:border-[#14B8A6]/50 hover:text-[#14B8A6]"
            aria-label="Toggle menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileNavOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Account section */}
          <div className="hidden lg:flex items-center gap-3">
            {loading ? (
              <div className="text-xs text-slate-400">Loading...</div>
            ) : user ? (
              <>
                <NotificationBell />
                <div className="relative" ref={menuRef}>
                <button
                  className="flex items-center gap-2 rounded-full border border-slate-700/50 bg-slate-800/40 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-[#14B8A6]/50 hover:bg-slate-800/60"
                  onClick={() => setMenuOpen((prev) => !prev)}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#14B8A6] to-[#0B8A7A] text-[0.65rem] font-bold text-slate-900">
                    {user.displayName?.charAt(0)?.toUpperCase() ??
                      user.email?.charAt(0)?.toUpperCase() ??
                      "U"}
                  </span>
                  <span className="hidden sm:inline">{user.displayName ?? user.email ?? "Account"}</span>
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 z-30 mt-2 w-60 rounded-xl border border-slate-800/80 bg-[#08090C] p-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
                    <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                      Account
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-100">
                      {user.displayName ?? user.email}
                    </p>
                    <p className="text-xs text-slate-400 capitalize">{role ?? "User"}</p>

                    <div className="my-3 border-t border-slate-800/50" />

                    <div className="space-y-1.5">
                      {role === "community" && (
                        <>
                          <Link
                            href="/member/dashboard"
                            className="block rounded-lg px-3 py-2 text-xs text-slate-300 transition hover:bg-slate-800/50 hover:text-[#14B8A6]"
                            onClick={closeMenu}
                          >
                            <span className="font-semibold">My Dashboard</span>
                          </Link>
                          <Link
                            href="/member/messages"
                            className="block rounded-lg px-3 py-2 text-xs text-slate-300 transition hover:bg-slate-800/50 hover:text-[#14B8A6]"
                            onClick={closeMenu}
                          >
                            <span className="font-semibold">Messages</span>
                          </Link>
                        </>
                      )}
                      {role === "employer" && (
                        <>
                          <Link
                            href="/employer/dashboard"
                            className="block rounded-lg px-3 py-2 text-xs text-slate-300 transition hover:bg-slate-800/50 hover:text-[#14B8A6]"
                            onClick={closeMenu}
                          >
                            <span className="font-semibold">Employer Dashboard</span>
                          </Link>
                          <Link
                            href="/employer/messages"
                            className="block rounded-lg px-3 py-2 text-xs text-slate-300 transition hover:bg-slate-800/50 hover:text-[#14B8A6]"
                            onClick={closeMenu}
                          >
                            <span className="font-semibold">Messages</span>
                          </Link>
                          <Link
                            href="/vendor/dashboard"
                            className="block rounded-lg px-3 py-2 text-xs text-slate-300 transition hover:bg-slate-800/50 hover:text-[#14B8A6]"
                            onClick={closeMenu}
                          >
                            <span className="font-semibold">Vendor Dashboard</span>
                          </Link>
                        </>
                      )}
                      {(role === "admin" || role === "moderator") && (
                        <>
                          <Link
                            href="/admin"
                            className="block rounded-lg px-3 py-2 text-xs text-slate-300 transition hover:bg-slate-800/50 hover:text-[#14B8A6]"
                            onClick={closeMenu}
                          >
                            <span className="font-semibold">Admin Dashboard</span>
                          </Link>
                        </>
                      )}
                    </div>

                    <div className="mt-3 border-t border-slate-800/50 pt-3">
                      <button
                        onClick={() => {
                          closeMenu();
                          void logout();
                        }}
                        className="w-full rounded-lg bg-gradient-to-r from-[#14B8A6] to-[#0B8A7A] px-3 py-2 text-xs font-semibold text-slate-900 transition hover:from-[#16cdb8] hover:to-[#0d9d8a]"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
                </div>
              </>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/login"
                  className="rounded-full border border-slate-700/50 bg-slate-800/40 px-4 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-[#14B8A6]/50 hover:text-[#14B8A6]"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-gradient-to-r from-[#14B8A6] to-[#0B8A7A] px-4 py-1.5 text-xs font-semibold text-slate-900 transition hover:from-[#16cdb8] hover:to-[#0d9d8a]"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileNavOpen && (
          <div className="lg:hidden border-t border-slate-800/50 py-4">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-slate-800/60 hover:text-[#14B8A6]"
                >
                  {link.label}
                </Link>
              ))}
              {!user && (
                <div className="mt-2 flex flex-col gap-2 border-t border-slate-800/50 pt-4">
                  <Link
                    href="/login"
                    onClick={() => setMobileNavOpen(false)}
                    className="rounded-lg border border-slate-700/50 bg-slate-800/40 px-4 py-2.5 text-center text-sm font-semibold text-slate-200 transition hover:border-[#14B8A6]/50 hover:text-[#14B8A6]"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileNavOpen(false)}
                    className="rounded-lg bg-gradient-to-r from-[#14B8A6] to-[#0B8A7A] px-4 py-2.5 text-center text-sm font-semibold text-slate-900 transition hover:from-[#16cdb8] hover:to-[#0d9d8a]"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
