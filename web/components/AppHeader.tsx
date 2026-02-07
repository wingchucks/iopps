"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import NotificationBell from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { colors, Icon, Avatar } from "@/components/opportunity-graph";

export function AppHeader() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userName = user?.displayName || user?.email?.split("@")[0] || "Guest";
  const userAvatar = user?.photoURL || undefined;
  const isLoggedIn = !!user;

  const navItems = [
    { id: "feed", icon: "home", label: "Home", href: "/discover" },
    { id: "careers", icon: "briefcase", label: "Careers", href: "/careers" },
    { id: "education", icon: "academic", label: "Education", href: "/education" },
    { id: "events", icon: "calendar", label: "Events", href: "/community" },
    { id: "live", icon: "video", label: "Live", href: "/live" },
    { id: "map", icon: "map", label: "Map", href: "/map" },
  ];

  const isActive = (href: string) => {
    if (href === "/discover") return pathname === "/discover";
    return pathname?.startsWith(href);
  };

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <Link href="/discover" className="app-logo">
            <span className="app-logo-text">IOPPS</span>
            <span className="app-logo-tagline">Empowering Indigenous Success</span>
          </Link>

          <Link href="/careers" className="app-search">
            <Icon name="search" size={18} color={colors.textMuted} />
            <span>Search jobs, vendors, programs, or Nations...</span>
          </Link>

          <div className="app-actions">
            <ThemeToggle />
            {isLoggedIn && <NotificationBell />}
            <Link href={isLoggedIn ? "/member/dashboard" : "/login"} className="app-avatar-link">
              <Avatar name={userName} src={userAvatar} size={36} ring />
            </Link>
            <button
              className="app-mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              <Icon name={mobileMenuOpen ? "x" : "menu"} size={24} color={colors.textSoft} />
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="app-mobile-nav">
          <nav>
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`app-mobile-nav-link ${isActive(item.href) ? "active" : ""}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon name={item.icon as any} size={20} color={isActive(item.href) ? colors.accent : colors.textSoft} />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}

      <nav className="app-mobile-bottom-nav">
        {[
          { icon: "home", label: "Feed", href: "/discover" },
          { icon: "briefcase", label: "Jobs", href: "/careers" },
          { icon: "search", label: "Search", href: "/careers" },
          { icon: "bell", label: "Alerts", href: isLoggedIn ? "/member/dashboard?tab=alerts" : "/login" },
          { icon: "user", label: "Profile", href: isLoggedIn ? "/member/dashboard" : "/login" },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`app-bottom-nav-item ${isActive(item.href) ? "active" : ""}`}
          >
            <Icon name={item.icon as any} size={22} color={isActive(item.href) ? colors.accent : colors.textSoft} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <style>{`
        .app-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: ${colors.surface};
          border-bottom: 1px solid ${colors.border};
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .app-header-inner {
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
          .app-header-inner { padding: 0 24px; height: 64px; }
        }
        .app-logo {
          display: flex;
          align-items: baseline;
          gap: 6px;
          text-decoration: none;
        }
        .app-logo-text {
          font-size: 20px;
          font-weight: 900;
          color: ${colors.accent};
          letter-spacing: -0.5px;
        }
        .app-logo-tagline {
          display: none;
          font-size: 12px;
          color: ${colors.textMuted};
          font-weight: 500;
        }
        @media (min-width: 768px) {
          .app-logo-text { font-size: 22px; }
          .app-logo-tagline { display: block; }
        }
        .app-search {
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
          .app-search { display: flex; }
        }
        .app-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        @media (min-width: 768px) {
          .app-actions { gap: 12px; }
        }
        .app-avatar-link {
          text-decoration: none;
          display: none;
        }
        @media (min-width: 768px) {
          .app-avatar-link { display: block; }
        }
        .app-mobile-menu-btn {
          padding: 8px;
          background: none;
          border: none;
          cursor: pointer;
        }
        @media (min-width: 768px) {
          .app-mobile-menu-btn { display: none; }
        }
        .app-mobile-nav {
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
          .app-mobile-nav { display: none; }
        }
        .app-mobile-nav-link {
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
        .app-mobile-nav-link.active {
          background: ${colors.accentBg};
          color: ${colors.accentDp};
          font-weight: 700;
        }
        .app-mobile-bottom-nav {
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
          .app-mobile-bottom-nav { display: none; }
        }
        .app-bottom-nav-item {
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
        .app-bottom-nav-item.active {
          color: ${colors.accent};
          font-weight: 700;
        }
      `}</style>
    </>
  );
}
