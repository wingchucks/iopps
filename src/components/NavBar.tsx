"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Avatar from "./Avatar";

const navLinks = [
  { href: "/feed", label: "Home" },
  { href: "/search", label: "Search" },
  { href: "/partners", label: "Partners" },
  { href: "/schools", label: "Schools" },
];

export default function NavBar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const displayName = user?.displayName || user?.email || "U";

  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between h-16 px-10"
      style={{
        background: "linear-gradient(135deg, var(--navy), var(--navy-light))",
        boxShadow: "0 2px 20px rgba(0,0,0,.15)",
      }}
    >
      {/* Left: logo + nav links */}
      <div className="flex items-center gap-8">
        <Link href="/feed" className="flex items-center gap-2.5 no-underline">
          <span className="text-white font-black text-2xl tracking-[2px]">IOPPS</span>
          <span
            className="text-teal-light rounded opacity-80"
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
        <div className="flex gap-1">
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

      {/* Right: search + actions + avatar */}
      <div className="flex items-center gap-3">
        {/* Search bar */}
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

        {/* Notification bell */}
        <button
          className="relative w-10 h-10 rounded-[10px] border-none cursor-pointer text-lg text-white"
          style={{ background: "rgba(255,255,255,.08)" }}
        >
          &#128276;
          <span className="absolute top-0.5 right-0.5 min-w-4 h-4 rounded-full bg-red text-white flex items-center justify-center" style={{ fontSize: 9, fontWeight: 700 }}>
            3
          </span>
        </button>

        {/* Messages */}
        <button
          className="w-10 h-10 rounded-[10px] border-none cursor-pointer text-lg text-white"
          style={{ background: "rgba(255,255,255,.08)" }}
        >
          &#128172;
        </button>

        <Avatar name={displayName} size={36} />
      </div>
    </nav>
  );
}
