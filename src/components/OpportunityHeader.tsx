"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
const links = [
  ["/jobs", "Jobs"],
  ["/businesses", "Entrepreneurship"],
  ["/livestreams", "IOPPS Live"],
  ["/events", "Events"],
];
export default function OpportunityHeader() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <header className="op-header">
      <div className="op-wrap op-header-row">
        <Link href="/" aria-label="IOPPS home" className="op-brand">
          <Image src="/logo.png" width={44} height={44} alt="" />
          IOPPS
        </Link>
        <nav className="op-desktop-nav" aria-label="Main navigation">
          {links.map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="op-auth">
          {!loading &&
            (user ? (
              <Link className="op-button" href="/feed">
                My account
              </Link>
            ) : (
              <>
                <Link className="op-button" href="/signup">
                  Sign up
                </Link>
                <Link href="/login">Sign in</Link>
              </>
            ))}
          <button
            className="op-menu"
            aria-expanded={open}
            aria-controls="op-mobile-nav"
            onClick={() => setOpen(!open)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>
      <nav
        hidden={!open}
        id="op-mobile-nav"
        className="op-mobile-nav op-wrap"
        aria-label="Mobile navigation"
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      >
        {links.map(([href, label]) => (
          <Link key={href} href={href} onClick={() => setOpen(false)}>
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
