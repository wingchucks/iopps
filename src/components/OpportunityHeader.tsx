"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import LiveBanner from "./LiveBanner";
const links = [
  ["/jobs", "Jobs"],
  ["/livestreams", "IOPPS Live"],
  ["/businesses", "Indigenous Businesses"],
  ["/scholarships", "Scholarships"],
  ["/events", "Events"],
];
// Mobile menu rows: an icon and one line of context for each destination.
const menuDetails: Record<string, { description: string; icon: string }> = {
  "/jobs": { description: "Find your next opportunity", icon: "M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" },
  "/livestreams": { description: "Watch broadcasts and replays", icon: "M12 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19 5a10 10 0 0 1 0 14M5 19A10 10 0 0 1 5 5" },
  "/businesses": { description: "Discover and support Indigenous-owned businesses", icon: "M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9h16M10 20v-5h4v5" },
  "/scholarships": { description: "Funding for your education", icon: "M22 10L12 5 2 10l10 5 10-5zM6 12v5c3 2 9 2 12 0v-5" },
  "/events": { description: "Pow wows, conferences and gatherings", icon: "M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM16 3v4M8 3v4M3 11h18" },
};
function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}
export default function OpportunityHeader() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`) || (href === "/businesses" && /^\/org\/[^/]+$/.test(pathname));
  return (
    <>
      <LiveBanner />
      <header className="op-header" data-menu-open={open ? "true" : undefined}>
        <div className="op-wrap op-header-row">
          <Link href="/" aria-label="IOPPS home" className="op-brand">
            <Image src="/logo.png" width={44} height={44} alt="" />
            IOPPS
          </Link>
          <nav className="op-desktop-nav" aria-label="Main navigation">
            {links.map(([href, label]) => (
              <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined}>
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
              ref={menuButtonRef}
              className="op-menu"
              aria-expanded={open}
              aria-controls="op-mobile-nav"
              onClick={() => setOpen(!open)}
            >
              <Icon path={open ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"} />
              <span className="op-menu-label">{open ? "Close" : "Menu"}</span>
            </button>
          </div>
        </div>
        {/* Tapping outside the open menu closes it; keyboard users have Escape. */}
        {open && <div className="op-menu-backdrop" aria-hidden="true" onClick={() => setOpen(false)} />}
        <nav
          hidden={!open}
          id="op-mobile-nav"
          className="op-mobile-nav"
          aria-label="Mobile navigation"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              menuButtonRef.current?.focus();
            }
          }}
        >
          <ul className="op-wrap op-mobile-list">
            {links.map(([href, label]) => {
              const details = menuDetails[href];
              const descriptionId = `op-mobile-${href.slice(1)}`;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className="op-mobile-link"
                    aria-current={isActive(href) ? "page" : undefined}
                    aria-describedby={details ? descriptionId : undefined}
                    onClick={() => setOpen(false)}
                  >
                    {details && <span className="op-mobile-icon"><Icon path={details.icon} /></span>}
                    <span className="op-mobile-text">
                      <span className="op-mobile-label">{label}</span>
                      {/* Read as the link's description, not as part of its name. */}
                      {details && <span id={descriptionId} className="op-mobile-description" aria-hidden="true">{details.description}</span>}
                    </span>
                    <span className="op-mobile-chevron"><Icon path="M9 6l6 6-6 6" /></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>
    </>
  );
}
