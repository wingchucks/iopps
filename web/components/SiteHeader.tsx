"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

const navLinks = [
  { href: "/jobs", label: "Jobs" },
  { href: "/conferences", label: "Conferences" },
  { href: "/scholarships", label: "Scholarships & Grants" },
  { href: "/shop", label: "Shop Indigenous" },
  { href: "/powwows", label: "Pow Wows" },
  { href: "/live", label: "Live Streams" },
];

const portalLinks = [
  { href: "/member/profile", label: "Member Area" },
  { href: "/employer", label: "Employer Portal" },
];

export default function SiteHeader() {
  const { user, role, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex flex-col">
            <span className="text-lg font-semibold tracking-tight text-teal-400">
              IOPPS
            </span>
            <span className="text-xs text-slate-300">
              Empowering Indigenous Success across Canada
            </span>
          </Link>
          <nav className="hidden gap-4 text-sm text-slate-200 md:flex">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-teal-400">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-200 md:justify-end">
          <div className="flex flex-wrap gap-2 text-xs text-slate-400">
            {portalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-slate-700 px-3 py-1 hover:border-teal-400 hover:text-teal-300"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="relative">
            {loading ? (
              <div className="text-xs text-slate-400">Checking account...</div>
            ) : user ? (
              <>
                <button
                  className="flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-100 hover:border-teal-400 hover:text-teal-200"
                  onClick={() => setMenuOpen((prev) => !prev)}
                >
                  <span className="h-6 w-6 rounded-full bg-gradient-to-br from-teal-500 to-slate-600 text-center text-[0.65rem] font-semibold leading-6 text-slate-900">
                    {user.displayName?.charAt(0)?.toUpperCase() ??
                      user.email?.charAt(0)?.toUpperCase() ??
                      "U"}
                  </span>
                  <span>{user.displayName ?? user.email ?? "Account"}</span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 z-30 mt-2 w-56 rounded-lg border border-slate-800 bg-slate-950/95 p-3 text-xs text-slate-200 shadow-xl">
                    <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                      Account
                    </p>
                    <p className="mt-1 truncate font-semibold text-slate-100">
                      {user.displayName ?? user.email}
                    </p>
                    <div className="mt-3 space-y-2">
                      {role === "community" && (
                        <>
                          <Link
                            href="/member/profile"
                            className="block rounded-md border border-slate-800 px-3 py-2 text-slate-200 hover:border-teal-400 hover:text-teal-200"
                            onClick={closeMenu}
                          >
                            Member Profile
                          </Link>
                          <Link
                            href="/member/applications"
                            className="block rounded-md border border-slate-800 px-3 py-2 text-slate-200 hover:border-teal-400 hover:text-teal-200"
                            onClick={closeMenu}
                          >
                            My Applications
                          </Link>
                        </>
                      )}
                      {role === "employer" && (
                        <Link
                          href="/employer"
                          className="block rounded-md border border-slate-800 px-3 py-2 text-slate-200 hover:border-teal-400 hover:text-teal-200"
                          onClick={closeMenu}
                        >
                          Employer Dashboard
                        </Link>
                      )}
                      {role === null && (
                        <Link
                          href="/employer"
                          className="block rounded-md border border-slate-800 px-3 py-2 text-slate-200 hover:border-teal-400 hover:text-teal-200"
                          onClick={closeMenu}
                        >
                          Go to Dashboard
                        </Link>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        closeMenu();
                        void logout();
                      }}
                      className="mt-3 w-full rounded-md bg-teal-500 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-teal-400"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/login"
                  className="rounded-full border border-slate-700 px-4 py-1 text-xs font-semibold text-slate-100 hover:border-teal-400 hover:text-teal-200"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-teal-500 px-4 py-1 text-xs font-semibold text-slate-950 hover:bg-teal-400"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
        <nav className="flex flex-wrap gap-3 text-xs text-slate-300 md:hidden">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-teal-400">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
