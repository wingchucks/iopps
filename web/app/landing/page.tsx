/**
 * IOPPS Social Opportunity Graph — Main App Feed
 * 
 * The new social-first experience for discovering opportunities.
 * Now mobile-responsive!
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import NotificationBell from "@/components/NotificationBell";
import { 
  colors, 
  Icon, 
  Avatar, 
  OpportunityFeed,
} from "@/components/opportunity-graph";

export default function AppPage() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Get user display info
  const userName = user?.displayName || user?.email?.split("@")[0] || "Guest";
  const userAvatar = user?.photoURL || undefined;
  const isLoggedIn = !!user;

  return (
    <div className="hub-container">
      {/* Custom Header */}
      <header className="hub-header">
        <div className="hub-header-inner">
          {/* Logo */}
          <Link href="/hub" className="hub-logo">
            <span className="hub-logo-text">IOPPS</span>
            <span className="hub-logo-tagline">Empowering Indigenous Success</span>
          </Link>

          {/* Search - hidden on mobile, links to careers page */}
          <Link href="/careers" className="hub-search">
            <Icon name="search" size={18} color={colors.textMuted} />
            <span>Search jobs, vendors, programs, or Nations...</span>
          </Link>

          {/* Right Actions */}
          <div className="hub-actions">
            {isLoggedIn && <NotificationBell />}
            <Link href={isLoggedIn ? "/member/dashboard" : "/login"} className="hub-avatar-link">
              <Avatar name={userName} src={userAvatar} size={36} ring />
            </Link>
            {/* Mobile menu button */}
            <button 
              className="hub-mobile-menu-btn"
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
        <div className="hub-mobile-nav">
          <nav>
            {[
              { id: "feed", icon: "home", label: "Home Feed", href: "/hub", active: true },
              { id: "careers", icon: "briefcase", label: "Careers", href: "/careers" },
              { id: "education", icon: "academic", label: "Education", href: "/education" },
              { id: "events", icon: "calendar", label: "Events", href: "/community" },
              { id: "live", icon: "video", label: "IOPPS Live", href: "/live" },
              { id: "nations", icon: "map", label: "Nations Map", href: "/map" },
            ].map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`hub-mobile-nav-link ${item.active ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon name={item.icon as any} size={20} color={item.active ? colors.accent : colors.textSoft} />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* Main Content - Responsive Layout */}
      <div className="hub-main">
        <div className="hub-layout">
          
          {/* Left Sidebar - Desktop Only */}
          <aside className="hub-sidebar-left">
            {/* User Card */}
            <div className="hub-user-card">
              <div className="hub-user-card-inner">
                <Avatar name={userName} src={userAvatar} size={44} ring />
                <div>
                  <div className="hub-user-name">{isLoggedIn ? userName : "Welcome!"}</div>
                  <div className="hub-user-cta">
                    {isLoggedIn ? (
                      <Link href="/member/dashboard">View profile</Link>
                    ) : (
                      <><Link href="/login">Sign in</Link> to save jobs</>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hub-nav">
              {[
                { id: "feed", icon: "home", label: "Home Feed", href: "/hub", active: true },
                { id: "careers", icon: "briefcase", label: "Careers", href: "/careers" },
                { id: "education", icon: "academic", label: "Education", href: "/education" },
                { id: "events", icon: "calendar", label: "Events", href: "/community" },
                { id: "live", icon: "video", label: "IOPPS Live", href: "/live", badge: "1" },
                { id: "nations", icon: "map", label: "Nations Map", href: "/map" },
              ].map((item, i) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`hub-nav-link ${item.active ? 'active' : ''}`}
                  style={{ borderBottom: i < 5 ? `1px solid ${colors.borderLt}` : "none" }}
                >
                  <Icon name={item.icon as any} size={20} color={item.active ? colors.accent : colors.textSoft} />
                  <span>{item.label}</span>
                  {item.badge && <span className="hub-nav-badge">{item.badge}</span>}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Center Feed */}
          <main className="hub-feed">
            <OpportunityFeed 
              showTabs={true}
              showSearch={false}
              maxItems={20}
            />
          </main>

          {/* Right Sidebar - Desktop Only */}
          <aside className="hub-sidebar-right">
            {/* Trending */}
            <div className="hub-trending">
              <div className="hub-trending-header">
                <Icon name="trending" size={16} color={colors.accent} />
                <span>Trending</span>
              </div>
              {[
                { title: "SIGA Hiring Spree", org: "Saskatchewan", saves: 47 },
                { title: "Tech Futures Scholarship", org: "SIIT", saves: 89 },
                { title: "Indigenous Professionals Summit", org: "IOPPS", saves: 156 },
              ].map((t, i) => (
                <div key={i} className="hub-trending-item">
                  <span className="hub-trending-num">{i + 1}</span>
                  <div>
                    <div className="hub-trending-title">{t.title}</div>
                    <div className="hub-trending-meta">{t.org} · {t.saves} saves</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Links */}
            <div className="hub-quick-links">
              <div className="hub-quick-links-header">Quick Links</div>
              {[
                { label: "Post a Job", href: "/organization/jobs/new" },
                { label: "Browse Training", href: "/careers/programs" },
                { label: "Find Scholarships", href: "/education/scholarships" },
                { label: "Upcoming Events", href: "/community" },
              ].map((link, i) => (
                <Link key={i} href={link.href} className="hub-quick-link">
                  {link.label} →
                </Link>
              ))}
            </div>

            {/* Footer */}
            <div className="hub-footer">
              IOPPS operates on Treaty 6 Territory, the traditional homeland of the Cree, Métis, and many other Indigenous peoples.
              <div className="hub-footer-links">
                <Link href="/about">About</Link>
                <Link href="/privacy">Privacy</Link>
                <Link href="/terms">Terms</Link>
                <Link href="/contact">Help</Link>
              </div>
              © 2026 IOPPS.ca
            </div>
          </aside>
        </div>
      </div>

      {/* Floating Action Button - for quick actions */}
      <Link 
        href={isLoggedIn ? "/organization/jobs/new" : "/login"} 
        className="hub-fab"
        title={isLoggedIn ? "Post a job" : "Sign in to post"}
      >
        <Icon name="plus" size={24} color="#fff" />
      </Link>

      {/* Mobile Bottom Nav */}
      <nav className="hub-mobile-bottom-nav">
        {[
          { icon: "home", label: "Feed", href: "/hub", active: true },
          { icon: "briefcase", label: "Jobs", href: "/careers" },
          { icon: "search", label: "Search", href: "/careers" },
          { icon: "bell", label: "Alerts", href: isLoggedIn ? "/member/dashboard?tab=alerts" : "/login" },
          { icon: "user", label: "Profile", href: isLoggedIn ? "/member/dashboard" : "/login" },
        ].map((item) => (
          <Link key={item.label} href={item.href} className={`hub-bottom-nav-item ${item.active ? 'active' : ''}`}>
            <Icon name={item.icon as any} size={22} color={item.active ? colors.accent : colors.textSoft} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Responsive Styles */}
      <style>{`
        .hub-container {
          min-height: 100vh;
          background: ${colors.bg};
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          padding-bottom: 70px;
        }
        @media (min-width: 768px) {
          .hub-container { padding-bottom: 0; }
        }

        /* Header */
        .hub-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: ${colors.surface};
          border-bottom: 1px solid ${colors.border};
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .hub-header-inner {
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
          .hub-header-inner { padding: 0 24px; height: 64px; }
        }

        /* Logo */
        .hub-logo {
          display: flex;
          align-items: baseline;
          gap: 6px;
          text-decoration: none;
        }
        .hub-logo-text {
          font-size: 20px;
          font-weight: 900;
          color: ${colors.accent};
          letter-spacing: -0.5px;
        }
        .hub-logo-tagline {
          display: none;
          font-size: 12px;
          color: ${colors.textMuted};
          font-weight: 500;
        }
        @media (min-width: 768px) {
          .hub-logo-text { font-size: 22px; }
          .hub-logo-tagline { display: block; }
        }

        /* Search */
        .hub-search {
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
        }
        @media (min-width: 1024px) {
          .hub-search { display: flex; }
        }

        /* Actions */
        .hub-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        @media (min-width: 768px) {
          .hub-actions { gap: 12px; }
        }
        .hub-bell {
          padding: 8px;
          background: none;
          border: none;
          cursor: pointer;
          position: relative;
        }
        .hub-bell-dot {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${colors.red};
          border: 2px solid ${colors.surface};
        }
        .hub-avatar-link {
          text-decoration: none;
          display: none;
        }
        @media (min-width: 768px) {
          .hub-avatar-link { display: block; }
        }
        .hub-mobile-menu-btn {
          padding: 8px;
          background: none;
          border: none;
          cursor: pointer;
        }
        @media (min-width: 768px) {
          .hub-mobile-menu-btn { display: none; }
        }

        /* Mobile Nav Overlay */
        .hub-mobile-nav {
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
          .hub-mobile-nav { display: none; }
        }
        .hub-mobile-nav-link {
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
        .hub-mobile-nav-link.active {
          background: ${colors.accentBg};
          color: ${colors.accentDp};
          font-weight: 700;
        }

        /* Main Layout */
        .hub-main {
          max-width: 1280px;
          margin: 0 auto;
          padding: 16px;
        }
        @media (min-width: 768px) {
          .hub-main { padding: 24px; }
        }
        .hub-layout {
          display: flex;
          gap: 24px;
        }

        /* Sidebars */
        .hub-sidebar-left,
        .hub-sidebar-right {
          display: none;
        }
        @media (min-width: 1024px) {
          .hub-sidebar-left {
            display: block;
            width: 240px;
            flex-shrink: 0;
          }
          .hub-sidebar-right {
            display: block;
            width: 300px;
            flex-shrink: 0;
          }
        }

        /* User Card */
        .hub-user-card {
          padding: 16px;
          margin-bottom: 16px;
          border-radius: 12px;
          background: ${colors.surface};
          border: 1px solid ${colors.border};
        }
        .hub-user-card-inner {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .hub-user-name {
          font-size: 14px;
          font-weight: 700;
          color: ${colors.text};
        }
        .hub-user-cta {
          font-size: 12px;
          color: ${colors.textSoft};
        }
        .hub-user-cta a {
          color: ${colors.accent};
          text-decoration: none;
        }

        /* Nav */
        .hub-nav {
          background: ${colors.surface};
          border-radius: 12px;
          border: 1px solid ${colors.border};
          overflow: hidden;
        }
        .hub-nav-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          color: ${colors.textMd};
        }
        .hub-nav-link.active {
          background: ${colors.accentBg};
          color: ${colors.accentDp};
          font-weight: 700;
        }
        .hub-nav-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 999px;
          background: ${colors.red};
          color: #fff;
          margin-left: auto;
        }

        /* Feed */
        .hub-feed {
          flex: 1;
          min-width: 0;
        }

        /* Trending */
        .hub-trending {
          background: ${colors.surface};
          border-radius: 12px;
          border: 1px solid ${colors.border};
          overflow: hidden;
          margin-bottom: 16px;
        }
        .hub-trending-header {
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 6px;
          border-bottom: 1px solid ${colors.borderLt};
          font-size: 14px;
          font-weight: 700;
          color: ${colors.text};
        }
        .hub-trending-item {
          padding: 12px 16px;
          display: flex;
          gap: 10px;
          align-items: flex-start;
          border-bottom: 1px solid ${colors.bg};
          cursor: pointer;
        }
        .hub-trending-item:last-child {
          border-bottom: none;
        }
        .hub-trending-num {
          font-size: 14px;
          font-weight: 800;
          color: ${colors.textFaint};
          width: 18px;
          text-align: right;
        }
        .hub-trending-title {
          font-size: 13px;
          font-weight: 600;
          color: ${colors.text};
          line-height: 1.3;
        }
        .hub-trending-meta {
          font-size: 12px;
          color: ${colors.textSoft};
          margin-top: 2px;
        }

        /* Quick Links */
        .hub-quick-links {
          background: ${colors.surface};
          border-radius: 12px;
          border: 1px solid ${colors.border};
          overflow: hidden;
          margin-bottom: 16px;
        }
        .hub-quick-links-header {
          padding: 14px 16px;
          border-bottom: 1px solid ${colors.borderLt};
          font-size: 14px;
          font-weight: 700;
          color: ${colors.text};
        }
        .hub-quick-link {
          display: block;
          padding: 10px 16px;
          font-size: 13px;
          color: ${colors.accent};
          text-decoration: none;
          border-bottom: 1px solid ${colors.bg};
        }
        .hub-quick-link:last-child {
          border-bottom: none;
        }

        /* Footer */
        .hub-footer {
          padding: 8px 0;
          font-size: 11px;
          color: ${colors.textMuted};
          line-height: 1.6;
        }
        .hub-footer-links {
          display: flex;
          gap: 12px;
          margin: 12px 0;
        }
        .hub-footer-links a {
          color: ${colors.textMuted};
          text-decoration: none;
        }

        /* Mobile Bottom Nav */
        .hub-mobile-bottom-nav {
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
          .hub-mobile-bottom-nav { display: none; }
        }
        .hub-bottom-nav-item {
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
        .hub-bottom-nav-item.active {
          color: ${colors.accent};
          font-weight: 700;
        }

        /* Floating Action Button */
        .hub-fab {
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
        }
        .hub-fab:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(0,128,128,0.4);
        }
        .hub-fab:active {
          transform: scale(0.95);
        }
        @media (min-width: 768px) {
          .hub-fab {
            bottom: 30px;
            right: 30px;
          }
        }

        /* Animation */
        @keyframes ioppsPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
