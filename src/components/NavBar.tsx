"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Avatar from "./Avatar";
import ThemeToggle from "./ThemeToggle";

const navLinks = [
  { href: "/feed", label: "Home" },
  { href: "/search", label: "Search" },
  { href: "/partners", label: "Partners" },
  { href: "/profile", label: "Profile" },
];

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();
  const displayName = user?.displayName || user?.email || "U";

  return (
    <nav
      className="sticky top-0 z-50"
      style={{
        background: "linear-gradient(135deg, var(--navy), var(--navy-light))",
        boxShadow: "0 2px 20px rgba(0,0,0,.15)",
      }}
    >
      <div className="flex items-center justify-between h-16 px-4 md:px-10">
        {/* Left: logo + nav links */}
        <div className="flex items-center gap-4 md:gap-8">
          <Link href="/feed" className="flex items-center gap-2.5 no-underline">
            <span className="text-white font-black text-xl md:text-2xl tracking-[2px]">IOPPS</span>
            <span
              className="text-teal-light rounded opacity-80 hidden sm:inline"
              style={{
                fontSize: 8,
                fontWeight: 800,
                letterSpacing: 2,
                padding: "3px 8px",
                background: "rgba(13,148,136,.15)",
              }}
            >
              EMPOWERING INDIGENOUS SUCCESS
            </span>
          </Link>
          <div className="hidden md:flex gap-1">
            {navLinks.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className="px-4 py-2 rounded-lg border-none font-semibold text-sm transition-all no-underline"
                  style={{
                    background: active ? "rgba(255,255,255,.12)" : "transparent",
                    color: active ? "#fff" : "rgba(255,255,255,.6)",
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right: search + actions + avatar (desktop) */}
        <div className="hidden md:flex items-center gap-3">
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-[10px] w-60"
            style={{
              background: "rgba(255,255,255,.08)",
              border: "1px solid rgba(255,255,255,.1)",
            }}
          >
            <span style={{ color: "rgba(255,255,255,.4)", fontSize: 14 }}>&#128269;</span>
            <span style={{ color: "rgba(255,255,255,.3)", fontSize: 13 }}>Search IOPPS...</span>
          </div>
          <button
            className="relative w-10 h-10 rounded-[10px] border-none cursor-pointer text-lg text-white"
            style={{ background: "rgba(255,255,255,.08)" }}
          >
            &#128276;
            <span className="absolute top-0.5 right-0.5 min-w-4 h-4 rounded-full bg-red text-white flex items-center justify-center" style={{ fontSize: 9, fontWeight: 700 }}>
              3
            </span>
          </button>
          <button
            className="w-10 h-10 rounded-[10px] border-none cursor-pointer text-lg text-white"
            style={{ background: "rgba(255,255,255,.08)" }}
          >
            &#128172;
          </button>
          <ThemeToggle />
          <Link href="/profile">
            <Avatar name={displayName} size={36} />
          </Link>
        </div>

        {/* Mobile: avatar + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <Link href="/profile">
            <Avatar name={displayName} size={32} />
          </Link>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-10 h-10 rounded-[10px] border-none cursor-pointer text-xl text-white flex items-center justify-center"
            style={{ background: "rgba(255,255,255,.08)" }}
          >
            {menuOpen ? "\u2715" : "\u2630"}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/10 pb-3">
          {navLinks.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-3 font-semibold text-sm no-underline transition-all"
                style={{
                  color: active ? "#fff" : "rgba(255,255,255,.6)",
                  background: active ? "rgba(255,255,255,.08)" : "transparent",
                }}
              >
                {label}
              </Link>
            );
          })}
          <div
            className="mx-4 mt-2 flex items-center gap-2 px-4 py-2.5 rounded-[10px]"
            style={{
              background: "rgba(255,255,255,.08)",
              border: "1px solid rgba(255,255,255,.1)",
            }}
          >
            <span style={{ color: "rgba(255,255,255,.4)", fontSize: 14 }}>&#128269;</span>
            <span style={{ color: "rgba(255,255,255,.3)", fontSize: 13 }}>Search IOPPS...</span>
          </div>
        </div>
      )}
    </nav>
  );
}
