/**
 * IOPPS Social Opportunity Graph — Feed Layout
 *
 * Shared three-column layout used across all section pages.
 * Extracted from the homepage to ensure visual consistency site-wide.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import NotificationBell from "@/components/NotificationBell";
import { colors } from "./tokens";
import { Icon, IconName } from "./Icon";
import { Avatar } from "./Avatar";

type NavId = "feed" | "careers" | "education" | "events" | "live" | "nations";

interface FeedLayoutProps {
  children: React.ReactNode;
  activeNav?: NavId;
  rightSidebar?: React.ReactNode;
  showFab?: boolean;
  fullWidth?: boolean;
}

const NAV_ITEMS: { id: NavId; icon: IconName; label: string; href: string }[] = [
  { id: "feed", icon: "home", label: "Home Feed", href: "/" },
  { id: "careers", icon: "briefcase", label: "Careers", href: "/careers" },
  { id: "education", icon: "academic", label: "Education", href: "/education" },
  { id: "events", icon: "calendar", label: "Events", href: "/community" },
  { id: "live", icon: "video", label: "IOPPS Live", href: "/live" },
  { id: "nations", icon: "map", label: "Nations Map", href: "/map" },
];

const BOTTOM_NAV: { icon: IconName; label: string; href: string | ((loggedIn: boolean) => string) }[] = [
  { icon: "home", label: "Feed", href: "/" },
  { icon: "briefcase", label: "Jobs", href: "/careers" },
  { icon: "search", label: "Search", href: "/search" },
  { icon: "bell", label: "Alerts", href: (loggedIn) => loggedIn ? "/member/dashboard?tab=alerts" : "/login" },
  { icon: "user", label: "Profile", href: (loggedIn) => loggedIn ? "/member/dashboard" : "/login" },
];

function resolveHref(href: string | ((loggedIn: boolean) => string), loggedIn: boolean): string {
  return typeof href === "function" ? href(loggedIn) : href;
}

export function FeedLayout({
  children,
  activeNav,
  rightSidebar,
  showFab = true,
  fullWidth = false,
}: FeedLayoutProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userName = user?.displayName || user?.email?.split("@")[0] || "Guest";
  const userAvatar = user?.photoURL || undefined;
  const isLoggedIn = !!user;

  // Auto-detect active nav from pathname if not explicitly set
  const resolvedActiveNav: NavId | undefined = activeNav ?? (() => {
    if (pathname === "/") return "feed";
    const match = NAV_ITEMS.find((item) => item.href !== "/" && pathname?.startsWith(item.href));
    return match?.id;
  })();

  const isNavActive = (id: NavId) => resolvedActiveNav === id;

  const isBottomNavActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href) ?? false;
  };

  return (
    <div className="feed-container">
      {/* Sticky Header */}
      <header className="feed-header">
        <div className="feed-header-inner">
          <Link href="/" className="feed-logo">
            <span className="feed-logo-text">IOPPS</span>
            <span className="feed-logo-tagline">Empowering Indigenous Success</span>
          </Link>

          <Link href="/search" className="feed-search">
            <Icon name="search" size={18} color={colors.textMuted} />
            <span>Search jobs, vendors, programs, or Nations...</span>
          </Link>

          <div className="feed-actions">
            {isLoggedIn && <NotificationBell />}
            <Link href={isLoggedIn ? "/member/dashboard" : "/login"} className="feed-avatar-link">
              <Avatar name={userName} src={userAvatar} size={36} ring />
            </Link>
            <button
              className="feed-mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              <Icon name={mobileMenuOpen ? "x" : "menu"} size={24} color={colors.textSoft} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Overlay */}
      {mobileMenuOpen && (
        <div className="feed-mobile-nav">
          <nav>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`feed-mobile-nav-link ${isNavActive(item.id) ? "active" : ""}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon name={item.icon} size={20} color={isNavActive(item.id) ? colors.accent : colors.textSoft} />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* Main Content */}
      <div className="feed-main">
        <div className={`feed-layout ${fullWidth ? "feed-layout--full" : ""}`}>
          {/* Left Sidebar — Desktop Only */}
          <aside className="feed-sidebar-left">
            {/* User Card */}
            <div className="feed-user-card">
              <div className="feed-user-card-inner">
                <Avatar name={userName} src={userAvatar} size={44} ring />
                <div>
                  <div className="feed-user-name">{isLoggedIn ? userName : "Welcome!"}</div>
                  <div className="feed-user-cta">
                    {isLoggedIn ? (
                      <Link href="/member/dashboard">View profile</Link>
                    ) : (
                      <>
                        <Link href="/login">Sign in</Link> to save jobs
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="feed-nav">
              {NAV_ITEMS.map((item, i) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`feed-nav-link ${isNavActive(item.id) ? "active" : ""}`}
                  style={{ borderBottom: i < NAV_ITEMS.length - 1 ? `1px solid ${colors.borderLt}` : "none" }}
                >
                  <Icon name={item.icon} size={20} color={isNavActive(item.id) ? colors.accent : colors.textSoft} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </aside>

          {/* Center Content */}
          <main className="feed-content">{children}</main>

          {/* Right Sidebar — Desktop Only */}
          {!fullWidth && (
            <aside className="feed-sidebar-right">
              {rightSidebar || <DefaultRightSidebar />}
            </aside>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      {showFab && (
        <Link
          href={isLoggedIn ? "/organization/jobs/new" : "/login"}
          className="feed-fab"
          title={isLoggedIn ? "Post a job" : "Sign in to post"}
        >
          <Icon name="plus" size={24} color="#fff" />
        </Link>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="feed-mobile-bottom-nav">
        {BOTTOM_NAV.map((item) => {
          const href = resolveHref(item.href, isLoggedIn);
          return (
            <Link
              key={item.label}
              href={href}
              className={`feed-bottom-nav-item ${isBottomNavActive(typeof item.href === "string" ? item.href : href) ? "active" : ""}`}
            >
              <Icon name={item.icon} size={22} color={isBottomNavActive(typeof item.href === "string" ? item.href : href) ? colors.accent : colors.textSoft} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <style>{feedLayoutStyles}</style>
    </div>
  );
}

/** Default right sidebar with trending + quick links */
function DefaultRightSidebar() {
  return (
    <>
      {/* Trending */}
      <div className="feed-trending">
        <div className="feed-trending-header">
          <Icon name="trending" size={16} color={colors.accent} />
          <span>Trending</span>
        </div>
        {[
          { title: "SIGA Hiring Spree", org: "Saskatchewan", saves: 47 },
          { title: "Tech Futures Scholarship", org: "SIIT", saves: 89 },
          { title: "Indigenous Professionals Summit", org: "IOPPS", saves: 156 },
        ].map((t, i) => (
          <div key={i} className="feed-trending-item">
            <span className="feed-trending-num">{i + 1}</span>
            <div>
              <div className="feed-trending-title">{t.title}</div>
              <div className="feed-trending-meta">
                {t.org} · {t.saves} saves
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="feed-quick-links">
        <div className="feed-quick-links-header">Quick Links</div>
        {[
          { label: "Post a Job", href: "/organization/jobs/new" },
          { label: "Browse Training", href: "/careers" },
          { label: "Find Scholarships", href: "/education" },
          { label: "Upcoming Events", href: "/community" },
        ].map((link, i) => (
          <Link key={i} href={link.href} className="feed-quick-link">
            {link.label} →
          </Link>
        ))}
      </div>

      {/* Footer */}
      <div className="feed-footer">
        IOPPS operates on Treaty 6 Territory, the traditional homeland of the Cree, Metis, and many
        other Indigenous peoples.
        <div className="feed-footer-links">
          <Link href="/about">About</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/contact">Help</Link>
        </div>
        © 2026 IOPPS.ca
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const feedLayoutStyles = `
  .feed-container {
    min-height: 100vh;
    background: ${colors.bg};
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    padding-bottom: 70px;
  }
  @media (min-width: 768px) {
    .feed-container { padding-bottom: 0; }
  }

  /* Header */
  .feed-header {
    position: sticky;
    top: 0;
    z-index: 100;
    background: ${colors.surface};
    border-bottom: 1px solid ${colors.border};
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .feed-header-inner {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 16px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  @media (min-width: 768px) {
    .feed-header-inner { padding: 0 24px; height: 64px; }
  }

  /* Logo */
  .feed-logo {
    display: flex;
    align-items: baseline;
    gap: 6px;
    text-decoration: none;
  }
  .feed-logo-text {
    font-size: 20px;
    font-weight: 900;
    color: ${colors.accent};
    letter-spacing: -0.5px;
  }
  .feed-logo-tagline {
    display: none;
    font-size: 12px;
    color: ${colors.textMuted};
    font-weight: 500;
  }
  @media (min-width: 768px) {
    .feed-logo-text { font-size: 22px; }
    .feed-logo-tagline { display: block; }
  }

  /* Search */
  .feed-search {
    display: none;
    flex: 1;
    max-width: 480px;
    margin: 0 32px;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 10px;
    background: ${colors.bg};
    border: 1px solid ${colors.border};
    font-size: 14px;
    color: ${colors.textMuted};
    text-decoration: none;
  }
  @media (min-width: 1024px) {
    .feed-search { display: flex; }
  }

  /* Actions */
  .feed-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  @media (min-width: 768px) {
    .feed-actions { gap: 12px; }
  }
  .feed-avatar-link {
    text-decoration: none;
    display: none;
  }
  @media (min-width: 768px) {
    .feed-avatar-link { display: block; }
  }
  .feed-mobile-menu-btn {
    padding: 8px;
    background: none;
    border: none;
    cursor: pointer;
  }
  @media (min-width: 768px) {
    .feed-mobile-menu-btn { display: none; }
  }

  /* Mobile Nav Overlay */
  .feed-mobile-nav {
    position: fixed;
    top: 56px;
    left: 0;
    right: 0;
    bottom: 70px;
    background: ${colors.surface};
    z-index: 99;
    padding: 16px;
    overflow-y: auto;
  }
  @media (min-width: 768px) {
    .feed-mobile-nav { display: none; }
  }
  .feed-mobile-nav-link {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    text-decoration: none;
    color: ${colors.textMd};
    font-size: 16px;
    font-weight: 500;
    border-radius: 12px;
    margin-bottom: 4px;
  }
  .feed-mobile-nav-link.active {
    background: ${colors.accentBg};
    color: ${colors.accentDp};
    font-weight: 700;
  }

  /* Main Layout */
  .feed-main {
    max-width: 1280px;
    margin: 0 auto;
    padding: 16px;
  }
  @media (min-width: 768px) {
    .feed-main { padding: 24px; }
  }
  .feed-layout {
    display: flex;
    gap: 24px;
  }
  .feed-layout--full .feed-content {
    flex: 1;
    min-width: 0;
  }

  /* Sidebars */
  .feed-sidebar-left,
  .feed-sidebar-right {
    display: none;
  }
  @media (min-width: 1024px) {
    .feed-sidebar-left {
      display: block;
      width: 240px;
      flex-shrink: 0;
    }
    .feed-sidebar-right {
      display: block;
      width: 300px;
      flex-shrink: 0;
    }
  }

  /* User Card */
  .feed-user-card {
    padding: 16px;
    margin-bottom: 16px;
    border-radius: 12px;
    background: ${colors.surface};
    border: 1px solid ${colors.border};
  }
  .feed-user-card-inner {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  .feed-user-name {
    font-size: 14px;
    font-weight: 700;
    color: ${colors.text};
  }
  .feed-user-cta {
    font-size: 12px;
    color: ${colors.textSoft};
  }
  .feed-user-cta a {
    color: ${colors.accent};
    text-decoration: none;
  }

  /* Nav */
  .feed-nav {
    background: ${colors.surface};
    border-radius: 12px;
    border: 1px solid ${colors.border};
    overflow: hidden;
  }
  .feed-nav-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    color: ${colors.textMd};
  }
  .feed-nav-link.active {
    background: ${colors.accentBg};
    color: ${colors.accentDp};
    font-weight: 700;
  }

  /* Content */
  .feed-content {
    flex: 1;
    min-width: 0;
  }

  /* Trending */
  .feed-trending {
    background: ${colors.surface};
    border-radius: 12px;
    border: 1px solid ${colors.border};
    overflow: hidden;
    margin-bottom: 16px;
  }
  .feed-trending-header {
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 6px;
    border-bottom: 1px solid ${colors.borderLt};
    font-size: 14px;
    font-weight: 700;
    color: ${colors.text};
  }
  .feed-trending-item {
    padding: 12px 16px;
    display: flex;
    gap: 10px;
    align-items: flex-start;
    border-bottom: 1px solid ${colors.bg};
    cursor: pointer;
  }
  .feed-trending-item:last-child { border-bottom: none; }
  .feed-trending-num {
    font-size: 14px;
    font-weight: 800;
    color: ${colors.textFaint};
    width: 18px;
    text-align: right;
  }
  .feed-trending-title {
    font-size: 13px;
    font-weight: 600;
    color: ${colors.text};
    line-height: 1.3;
  }
  .feed-trending-meta {
    font-size: 12px;
    color: ${colors.textSoft};
    margin-top: 2px;
  }

  /* Quick Links */
  .feed-quick-links {
    background: ${colors.surface};
    border-radius: 12px;
    border: 1px solid ${colors.border};
    overflow: hidden;
    margin-bottom: 16px;
  }
  .feed-quick-links-header {
    padding: 14px 16px;
    border-bottom: 1px solid ${colors.borderLt};
    font-size: 14px;
    font-weight: 700;
    color: ${colors.text};
  }
  .feed-quick-link {
    display: block;
    padding: 10px 16px;
    font-size: 13px;
    color: ${colors.accent};
    text-decoration: none;
    border-bottom: 1px solid ${colors.bg};
  }
  .feed-quick-link:last-child { border-bottom: none; }

  /* Footer */
  .feed-footer {
    padding: 8px 0;
    font-size: 11px;
    color: ${colors.textMuted};
    line-height: 1.6;
  }
  .feed-footer-links {
    display: flex;
    gap: 12px;
    margin: 12px 0;
  }
  .feed-footer-links a {
    color: ${colors.textMuted};
    text-decoration: none;
  }

  /* Mobile Bottom Nav */
  .feed-mobile-bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 70px;
    background: ${colors.surface};
    border-top: 1px solid ${colors.border};
    display: flex;
    justify-content: space-around;
    align-items: center;
    z-index: 100;
    padding-bottom: env(safe-area-inset-bottom, 0);
  }
  @media (min-width: 768px) {
    .feed-mobile-bottom-nav { display: none; }
  }
  .feed-bottom-nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    text-decoration: none;
    font-size: 10px;
    font-weight: 500;
    color: ${colors.textSoft};
    padding: 8px 12px;
  }
  .feed-bottom-nav-item.active {
    color: ${colors.accent};
    font-weight: 700;
  }

  /* Floating Action Button */
  .feed-fab {
    position: fixed;
    bottom: 90px;
    right: 20px;
    width: 56px;
    height: 56px;
    border-radius: 28px;
    background: ${colors.accent};
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0,128,128,0.3);
    z-index: 99;
    transition: transform 0.2s, box-shadow 0.2s;
    text-decoration: none;
  }
  .feed-fab:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(0,128,128,0.4);
  }
  .feed-fab:active {
    transform: scale(0.95);
  }
  @media (min-width: 768px) {
    .feed-fab { bottom: 30px; right: 30px; }
  }

  /* Pulse Animation */
  @keyframes ioppsPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
`;
