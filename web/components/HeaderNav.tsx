"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";

const primaryLinks = [
  { href: "/jobs", label: "Jobs" },
  { href: "/conferences", label: "Conferences" },
  { href: "/scholarships", label: "Scholarships & Grants" },
  { href: "/shop", label: "Shop Indigenous" },
  { href: "/powwows", label: "Pow Wows & Events" },
  { href: "/live", label: "Live Streams" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function HeaderNav() {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="IOPPS logo"
            width={40}
            height={40}
            className="h-10 w-10 rounded-full object-cover shadow-lg"
          />
          <div className="flex flex-col">
            <span className="text-lg font-semibold tracking-tight text-teal-400">
              IOPPS
            </span>
            <span className="text-xs text-slate-300">
              Empowering Indigenous Success
            </span>
          </div>
        </Link>

        <nav className="flex flex-wrap gap-4 text-sm text-slate-200">
          {primaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`hover:text-teal-400 ${
                pathname === link.href ? "text-teal-300" : ""
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          {user ? (
            <>
              <Link
                href="/account"
                className="rounded-md border border-slate-700 px-3 py-1 text-slate-200 hover:border-teal-400 hover:text-teal-300"
              >
                {loading ? "Loading..." : "Account"}
              </Link>
              <button
                onClick={logout}
                className="rounded-md bg-teal-500 px-3 py-1 font-semibold text-slate-900 hover:bg-teal-400"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md border border-slate-700 px-3 py-1 text-slate-200 hover:border-teal-400 hover:text-teal-300"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-teal-500 px-3 py-1 font-semibold text-slate-900 hover:bg-teal-400"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
