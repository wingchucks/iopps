/**
 * IOPPS Social Opportunity Graph — Feed Layout
 *
 * Social-platform-style layout (LinkedIn/Facebook pattern):
 * - Desktop: sticky top bar (logo + search + nav + icons + avatar dropdown),
 *   optional left sidebar, main content, optional right sidebar.
 * - Mobile: slim top bar, full-width content, fixed bottom nav (5 items).
 */

"use client";

import { useState, useEffect, useRef, useCallback, FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useMessageDrawer } from "@/components/messaging";
import { useNotifications, NotificationDropdown, UnreadBadge as NotificationUnreadBadge } from "@/components/notifications";
import { colors } from "./tokens";
import { Icon } from "./Icon";
import { Avatar } from "./Avatar";
import {
  NAV_ITEMS,
  BOTTOM_NAV,
  AVATAR_MENU_ITEMS,
  QUICK_LINKS,
  FOOTER_LINKS,
  resolveHref,
  resolveAvatarHref,
  type NavId,
} from "@/lib/constants/navigation";
import { TREATY_ACKNOWLEDGMENT } from "@/lib/constants/content";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FeedLayoutProps {
  children: React.ReactNode;
  activeNav?: NavId;
  rightSidebar?: React.ReactNode;
  showFab?: boolean;
  fullWidth?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function FeedLayout({
  children,
  activeNav,
  rightSidebar,
  showFab = true,
  fullWidth = false,
}: FeedLayoutProps) {
  const { user, logout, role } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { openDrawer: openMessageDrawer, unreadCount: messageUnreadCount } = useMessageDrawer();
  const { isOpen: notificationsOpen, toggleDropdown: toggleNotifications, closeDropdown: closeNotifications } = useNotifications();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const notificationBellRef = useRef<HTMLButtonElement>(null);

  const avatarMenuRef = useRef<HTMLDivElement>(null);

  const userName = user?.displayName || user?.email?.split("@")[0] || "Guest";
  const userAvatar = user?.photoURL || undefined;
  const userId = user?.uid || "";
  const isLoggedIn = !!user;

  /* ---- Active nav detection ---- */
  // Map legacy NavId values to new ones so the correct top-bar item lights up
  const LEGACY_NAV_MAP: Partial<Record<NavId, NavId>> = {
    feed: "home",
    careers: "jobs",
    community: "events",
    organizations: "business",
    live: "home",
    nations: "home",
    pricing: "home",
  };

  const rawActiveNav: NavId | undefined = activeNav ?? (() => {
    if (pathname === "/" || pathname === "/discover") return "home";
    const match = NAV_ITEMS.find(
      (item) => item.href !== "/" && pathname?.startsWith(item.href),
    );
    return match?.id;
  })();

  const resolvedActiveNav: NavId | undefined =
    rawActiveNav && LEGACY_NAV_MAP[rawActiveNav]
      ? LEGACY_NAV_MAP[rawActiveNav]
      : rawActiveNav;

  const isNavActive = (id: NavId) => resolvedActiveNav === id;

  const isBottomNavActive = (href: string) => {
    if (href === "/") return pathname === "/" || pathname === "/discover";
    if (href === "#") return false;
    return pathname?.startsWith(href) ?? false;
  };

  /* ---- Close avatar dropdown on outside click ---- */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        avatarMenuRef.current &&
        !avatarMenuRef.current.contains(event.target as Node)
      ) {
        setAvatarMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ---- Close menus on route change ---- */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync UI state with route change
    setAvatarMenuOpen(false);
    setMobileMenuOpen(false);
    closeNotifications();
  }, [pathname, closeNotifications]);

  /* ---- Keyboard support for avatar dropdown ---- */
  const handleAvatarKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setAvatarMenuOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setAvatarMenuOpen(false);
      }
    },
    [],
  );

  /* ---- Search submit ---- */
  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
      setSearchQuery("");
    }
  };

  /* ---- Avatar menu item click ---- */
  const handleAvatarMenuClick = async (item: (typeof AVATAR_MENU_ITEMS)[number]) => {
    setAvatarMenuOpen(false);
    if (item.action === "signout") {
      await logout();
      router.push("/");
    }
  };

  /* ---- Render ---- */
  return (
    <div className="feed-container">
      {/* ============================================================ */}
      {/*  Sticky Top Bar                                               */}
      {/* ============================================================ */}
      <header className="feed-header">
        <div className="feed-header-inner">
          {/* Logo */}
          <Link href="/" className="feed-logo" aria-label="IOPPS Home">
            <span className="feed-logo-text">IOPPS</span>
          </Link>

          {/* Desktop Search Bar */}
          <form
            className="feed-search"
            onSubmit={handleSearchSubmit}
            role="search"
          >
            <Icon name="search" size={18} color={colors.textMuted} />
            <input
              type="text"
              className="feed-search-input"
              placeholder="Search jobs, programs, or organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search"
            />
          </form>

          {/* Desktop Main Nav */}
          <nav className="feed-topnav" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`feed-topnav-item ${isNavActive(item.id) ? "active" : ""}`}
                aria-current={isNavActive(item.id) ? "page" : undefined}
              >
                <Icon
                  name={item.icon}
                  size={20}
                  color={isNavActive(item.id) ? colors.accent : colors.textSoft}
                />
                <span className="feed-topnav-label">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Right-side actions */}
          <div className="feed-actions">
            {/* Desktop messages button */}
            {isLoggedIn && (
              <button
                type="button"
                className="feed-icon-btn"
                aria-label="Messages"
                title="Messages"
                onClick={openMessageDrawer}
                style={{ position: "relative" }}
              >
                <Icon name="mail" size={20} color={colors.textSoft} />
                {messageUnreadCount > 0 && (
                  <span className="feed-unread-badge">
                    {messageUnreadCount > 9 ? "9+" : messageUnreadCount}
                  </span>
                )}
              </button>
            )}

            {/* Notification bell */}
            {isLoggedIn && (
              <div style={{ position: "relative" }}>
                <button
                  ref={notificationBellRef}
                  type="button"
                  className="feed-icon-btn"
                  aria-label="Notifications"
                  title="Notifications"
                  aria-expanded={notificationsOpen}
                  aria-haspopup="true"
                  data-notification-bell
                  onClick={toggleNotifications}
                >
                  <Icon name="bell" size={20} color={colors.textSoft} />
                  <NotificationUnreadBadge />
                </button>
                <NotificationDropdown
                  isOpen={notificationsOpen}
                  onClose={closeNotifications}
                />
              </div>
            )}

            {/* Mobile search icon */}
            <Link
              href="/search"
              className="feed-mobile-search-btn"
              aria-label="Search"
            >
              <Icon name="search" size={20} color={colors.textSoft} />
            </Link>

            {/* Avatar dropdown (desktop) */}
            {isLoggedIn ? (
              <div className="feed-avatar-wrapper" ref={avatarMenuRef}>
                <button
                  className="feed-avatar-btn"
                  onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
                  onKeyDown={handleAvatarKeyDown}
                  aria-label="Account menu"
                  aria-expanded={avatarMenuOpen}
                  aria-haspopup="true"
                >
                  <Avatar name={userName} src={userAvatar} size={32} />
                  <Icon
                    name="chevronDown"
                    size={14}
                    color={colors.textMuted}
                    className="feed-avatar-chevron"
                  />
                </button>

                {avatarMenuOpen && (
                  <div
                    className="feed-avatar-menu"
                    role="menu"
                    aria-label="Account options"
                  >
                    {/* User info header */}
                    <div className="feed-avatar-menu-header">
                      <Avatar name={userName} src={userAvatar} size={40} ring />
                      <div>
                        <div className="feed-avatar-menu-name">{userName}</div>
                        <div className="feed-avatar-menu-email">
                          {user.email}
                        </div>
                      </div>
                    </div>

                    <div className="feed-avatar-menu-divider" />

                    {AVATAR_MENU_ITEMS.map((item) => {
                      let href =
                        item.action === "signout"
                          ? "#"
                          : resolveAvatarHref(item.href, userId);

                      // Always route to member profile for "View Profile"
                      // Org users access org dashboard via sidebar/separate link

                      if (item.action === "signout") {
                        return (
                          <button
                            key={item.label}
                            className="feed-avatar-menu-item"
                            role="menuitem"
                            onClick={() => handleAvatarMenuClick(item)}
                          >
                            <Icon
                              name={item.icon}
                              size={18}
                              color={colors.textSoft}
                            />
                            <span>{item.label}</span>
                          </button>
                        );
                      }

                      return (
                        <Link
                          key={item.label}
                          href={href}
                          className="feed-avatar-menu-item"
                          role="menuitem"
                          onClick={() => setAvatarMenuOpen(false)}
                        >
                          <Icon
                            name={item.icon}
                            size={18}
                            color={colors.textSoft}
                          />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="feed-signin-btn">
                Sign In
              </Link>
            )}

            {/* Mobile hamburger */}
            <button
              className="feed-mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              <Icon
                name={mobileMenuOpen ? "x" : "menu"}
                size={24}
                color={colors.textSoft}
              />
            </button>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/*  Mobile Navigation Overlay                                    */}
      {/* ============================================================ */}
      {mobileMenuOpen && (
        <div className="feed-mobile-nav" aria-label="Mobile navigation">
          <nav>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`feed-mobile-nav-link ${isNavActive(item.id) ? "active" : ""}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon
                  name={item.icon}
                  size={20}
                  color={
                    isNavActive(item.id) ? colors.accent : colors.textSoft
                  }
                />
                <span>{item.label}</span>
              </Link>
            ))}

            <div className="feed-mobile-nav-divider" />

            {isLoggedIn && (
              <>
                <Link
                  href={`/member/${userId}`}
                  className="feed-mobile-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon name="user" size={20} color={colors.textSoft} />
                  <span>View Profile</span>
                </Link>
                <Link
                  href="/member/settings"
                  className="feed-mobile-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon name="settings" size={20} color={colors.textSoft} />
                  <span>Settings & Privacy</span>
                </Link>
                <button
                  className="feed-mobile-nav-link feed-mobile-nav-btn"
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await logout();
                    router.push("/");
                  }}
                >
                  <Icon name="logout" size={20} color={colors.textSoft} />
                  <span>Sign Out</span>
                </button>
              </>
            )}

            {!isLoggedIn && (
              <Link
                href="/login"
                className="feed-mobile-nav-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon name="user" size={20} color={colors.accent} />
                <span>Sign In</span>
              </Link>
            )}
          </nav>
        </div>
      )}

      {/* ============================================================ */}
      {/*  Main Content Area                                            */}
      {/* ============================================================ */}
      <div className="feed-main">
        <div
          className={`feed-layout ${fullWidth ? "feed-layout--full" : ""}`}
        >
          {/* Left Sidebar — Desktop Only */}
          <aside className="feed-sidebar-left" aria-label="User profile and navigation">
            {/* User Card */}
            <div className="feed-user-card">
              <div className="feed-user-card-inner">
                <Avatar name={userName} src={userAvatar} size={44} ring />
                <div>
                  <div className="feed-user-name">
                    {isLoggedIn ? userName : "Welcome!"}
                  </div>
                  <div className="feed-user-cta">
                    {isLoggedIn && user ? (
                      <Link href={`/member/${user.uid}`}>View profile</Link>
                    ) : (
                      <>
                        <Link href="/login">Sign in</Link> to save jobs
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Nav */}
            <nav className="feed-nav" aria-label="Sidebar navigation">
              {NAV_ITEMS.map((item, i) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`feed-nav-link ${isNavActive(item.id) ? "active" : ""}`}
                  style={{
                    borderBottom:
                      i < NAV_ITEMS.length - 1
                        ? `1px solid ${colors.borderLt}`
                        : "none",
                  }}
                >
                  <Icon
                    name={item.icon}
                    size={20}
                    color={
                      isNavActive(item.id) ? colors.accent : colors.textSoft
                    }
                  />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </aside>

          {/* Center Content */}
          <main className="feed-content">{children}</main>

          {/* Right Sidebar — Desktop Only */}
          {!fullWidth && (
            <aside className="feed-sidebar-right" aria-label="Trending and quick links">
              {rightSidebar || <DefaultRightSidebar />}
            </aside>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Floating Action Button — employer/admin only                 */}
      {/* ============================================================ */}
      {showFab && isLoggedIn && (role === "employer" || role === "admin") && (
        <Link
          href="/organization/jobs/new"
          className="feed-fab"
          title="Post a job"
          aria-label="Post a job"
        >
          <Icon name="plus" size={24} color="#fff" />
        </Link>
      )}

      {/* ============================================================ */}
      {/*  Mobile Bottom Nav                                            */}
      {/* ============================================================ */}
      <nav className="feed-mobile-bottom-nav" aria-label="Mobile navigation">
        {BOTTOM_NAV.map((item) => {
          let href = resolveHref(item.href, isLoggedIn, userId);
          const active = isBottomNavActive(
            typeof item.href === "string" ? item.href : href,
          );
          const isCreatePost = item.action === "create-post";

          // Always route to member profile - org users can access org dashboard separately
          // This ensures all users see the job seeker hub with their activity
          // (removed employer/admin redirect to /organization/profile)

          if (isCreatePost) {
            // Only show job-posting action for employers/admins;
            // community members go to the social feed to create posts
            const createDest = !isLoggedIn
              ? "/login"
              : role === "employer" || role === "admin"
                ? "/organization/jobs/new"
                : "/discover";
            return (
              <button
                key={item.label}
                className="feed-bottom-nav-item feed-bottom-nav-create"
                aria-label={item.label}
                onClick={() => router.push(createDest)}
              >
                <Icon
                  name={item.icon}
                  size={26}
                  color={colors.accent}
                />
                <span>{item.label}</span>
              </button>
            );
          }

          // Messages bottom nav: open drawer instead of navigating
          if (item.label === "Messages") {
            return (
              <button
                key={item.label}
                className="feed-bottom-nav-item"
                aria-label={item.label}
                onClick={() => {
                  if (isLoggedIn) {
                    openMessageDrawer();
                  } else {
                    router.push("/login");
                  }
                }}
                style={{ position: "relative" }}
              >
                <Icon
                  name={item.icon}
                  size={22}
                  color={colors.textSoft}
                />
                <span>{item.label}</span>
                {isLoggedIn && messageUnreadCount > 0 && (
                  <span className="feed-bottom-nav-badge">
                    {messageUnreadCount > 9 ? "9+" : messageUnreadCount}
                  </span>
                )}
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={href}
              className={`feed-bottom-nav-item ${active ? "active" : ""}`}
            >
              <Icon
                name={item.icon}
                size={22}
                color={active ? colors.accent : colors.textSoft}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <style>{feedLayoutStyles}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Default Right Sidebar                                              */
/* ------------------------------------------------------------------ */

function DefaultRightSidebar() {
  const { role } = useAuth();
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
          {
            title: "Indigenous Professionals Summit",
            org: "IOPPS",
            saves: 156,
          },
        ].map((t, i) => (
          <div key={i} className="feed-trending-item">
            <span className="feed-trending-num">{i + 1}</span>
            <div>
              <div className="feed-trending-title">{t.title}</div>
              <div className="feed-trending-meta">
                {t.org} &middot; {t.saves} saves
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="feed-quick-links">
        <div className="feed-quick-links-header">Quick Links</div>
        {QUICK_LINKS.filter(
          (link) => link.href !== "/organization/jobs/new" || role === "employer" || role === "admin"
        ).map((link, i) => (
          <Link key={i} href={link.href} className="feed-quick-link">
            {link.label} &rarr;
          </Link>
        ))}
      </div>

      {/* Footer */}
      <div className="feed-footer">
        {TREATY_ACKNOWLEDGMENT}
        <div className="feed-footer-links">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
        &copy; {new Date().getFullYear()} IOPPS.ca
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const feedLayoutStyles = `
  /* ---- Base Container ---- */
  .feed-container {
    min-height: 100vh;
    background: ${colors.bg};
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    padding-bottom: 70px;
  }
  @media (min-width: 768px) {
    .feed-container { padding-bottom: 0; }
  }

  /* ================================================================ */
  /*  Header / Top Bar                                                 */
  /* ================================================================ */
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
    gap: 8px;
  }
  @media (min-width: 768px) {
    .feed-header-inner { padding: 0 20px; height: 56px; gap: 16px; }
  }
  @media (min-width: 1024px) {
    .feed-header-inner { padding: 0 24px; gap: 20px; }
  }

  /* ---- Logo ---- */
  .feed-logo {
    display: flex;
    align-items: center;
    gap: 6px;
    text-decoration: none;
    flex-shrink: 0;
  }
  .feed-logo-text {
    font-size: 22px;
    font-weight: 900;
    color: ${colors.accent};
    letter-spacing: -0.5px;
  }

  /* ---- Desktop Search Bar ---- */
  .feed-search {
    display: none;
    flex: 0 1 240px;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 6px;
    background: ${colors.bg};
    border: 1px solid ${colors.border};
  }
  .feed-search:focus-within {
    border-color: ${colors.accent};
    box-shadow: 0 0 0 2px ${colors.accentBg};
  }
  .feed-search-input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-size: 13px;
    color: ${colors.text};
    font-family: inherit;
  }
  .feed-search-input::placeholder {
    color: ${colors.textMuted};
  }

  /* BUG-028: Keyboard accessibility - focus-visible outlines */
  .feed-nav-link:focus-visible,
  .feed-bottom-nav-item:focus-visible,
  .feed-mobile-bottom-nav a:focus-visible,
  .feed-mobile-bottom-nav button:focus-visible,
  .feed-fab:focus-visible {
    outline: 2px solid ${colors.accent};
    outline-offset: 2px;
    border-radius: 6px;
  }
  @media (min-width: 768px) {
    .feed-search { display: flex; }
  }
  @media (min-width: 1200px) {
    .feed-search { flex: 0 1 280px; }
  }

  /* ---- Desktop Top Nav (center) ---- */
  .feed-topnav {
    display: none;
    align-items: stretch;
    gap: 0;
    flex: 1;
    justify-content: center;
    height: 100%;
  }
  @media (min-width: 1024px) {
    .feed-topnav { display: flex; }
  }
  .feed-topnav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 0 14px;
    text-decoration: none;
    border-bottom: 2px solid transparent;
    transition: border-color 0.15s, color 0.15s;
    position: relative;
  }
  .feed-topnav-item:hover {
    background: ${colors.bg};
  }
  .feed-topnav-item.active {
    border-bottom-color: ${colors.accent};
  }
  .feed-topnav-label {
    font-size: 11px;
    font-weight: 500;
    color: ${colors.textSoft};
    white-space: nowrap;
  }
  .feed-topnav-item.active .feed-topnav-label {
    color: ${colors.accent};
    font-weight: 700;
  }

  /* ---- Right-side Actions ---- */
  .feed-actions {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
  }
  @media (min-width: 768px) {
    .feed-actions { gap: 4px; }
  }

  /* Icon button (messages etc.) */
  .feed-icon-btn {
    display: none;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    text-decoration: none;
    transition: background 0.15s;
    background: none;
    border: none;
    cursor: pointer;
  }
  .feed-icon-btn:hover {
    background: ${colors.bg};
  }
  @media (min-width: 768px) {
    .feed-icon-btn { display: flex; }
  }

  /* Mobile search button */
  .feed-mobile-search-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    text-decoration: none;
    transition: background 0.15s;
  }
  .feed-mobile-search-btn:hover {
    background: ${colors.bg};
  }
  @media (min-width: 768px) {
    .feed-mobile-search-btn { display: none; }
  }

  /* Sign-in button (when not logged in, desktop only) */
  .feed-signin-btn {
    display: none;
    padding: 6px 18px;
    border-radius: 20px;
    background: ${colors.accent};
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
    white-space: nowrap;
    transition: background 0.15s;
  }
  .feed-signin-btn:hover {
    background: ${colors.accentDk};
  }
  @media (min-width: 768px) {
    .feed-signin-btn { display: inline-block; }
  }

  /* ---- Avatar Dropdown ---- */
  .feed-avatar-wrapper {
    position: relative;
    display: none;
  }
  @media (min-width: 768px) {
    .feed-avatar-wrapper { display: flex; align-items: center; }
  }
  .feed-avatar-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px;
    background: none;
    border: none;
    cursor: pointer;
    border-radius: 24px;
    transition: background 0.15s;
  }
  .feed-avatar-btn:hover { background: ${colors.bg}; }
  .feed-avatar-chevron {
    transition: transform 0.15s;
  }

  .feed-avatar-menu {
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    width: 280px;
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    z-index: 200;
    overflow: hidden;
  }
  .feed-avatar-menu-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
  }
  .feed-avatar-menu-name {
    font-size: 14px;
    font-weight: 700;
    color: ${colors.text};
  }
  .feed-avatar-menu-email {
    font-size: 12px;
    color: ${colors.textSoft};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 180px;
  }
  .feed-avatar-menu-divider {
    height: 1px;
    background: ${colors.borderLt};
  }
  .feed-avatar-menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 12px 16px;
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    color: ${colors.textMd};
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s;
    font-family: inherit;
  }
  .feed-avatar-menu-item:hover {
    background: ${colors.bg};
  }

  /* ---- Mobile Hamburger ---- */
  .feed-mobile-menu-btn {
    padding: 8px;
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  @media (min-width: 768px) {
    .feed-mobile-menu-btn { display: none; }
  }

  /* ================================================================ */
  /*  Mobile Nav Overlay                                               */
  /* ================================================================ */
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
    padding: 14px 16px;
    text-decoration: none;
    color: ${colors.textMd};
    font-size: 15px;
    font-weight: 500;
    border-radius: 12px;
    margin-bottom: 2px;
  }
  .feed-mobile-nav-link.active {
    background: ${colors.accentBg};
    color: ${colors.accentDp};
    font-weight: 700;
  }
  .feed-mobile-nav-btn {
    width: 100%;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
  }
  .feed-mobile-nav-divider {
    height: 1px;
    background: ${colors.borderLt};
    margin: 8px 16px;
  }

  /* ================================================================ */
  /*  Main Layout                                                      */
  /* ================================================================ */
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

  /* ---- Sidebars ---- */
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

  /* ---- User Card ---- */
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

  /* ---- Sidebar Nav ---- */
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

  /* ---- Content ---- */
  .feed-content {
    flex: 1;
    min-width: 0;
  }

  /* ================================================================ */
  /*  Right Sidebar Widgets                                            */
  /* ================================================================ */
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

  /* ---- Quick Links ---- */
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

  /* ---- Footer ---- */
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

  /* ================================================================ */
  /*  Mobile Bottom Nav                                                */
  /* ================================================================ */
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
  @media (min-width: 1024px) {
    .feed-mobile-bottom-nav { display: none; }
  }
  .feed-bottom-nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    text-decoration: none;
    font-size: 10px;
    font-weight: 500;
    color: ${colors.textSoft};
    padding: 8px 12px;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
  }
  .feed-bottom-nav-item.active {
    color: ${colors.accent};
    font-weight: 700;
  }
  .feed-bottom-nav-create {
    color: ${colors.accent};
  }

  /* ================================================================ */
  /*  Floating Action Button                                           */
  /* ================================================================ */
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

  /* ---- Unread Badge (desktop icon buttons) ---- */
  .feed-unread-badge {
    position: absolute;
    top: -2px;
    right: -2px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border-radius: 9px;
    background: #ef4444;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    pointer-events: none;
  }

  /* ---- Unread Badge (mobile bottom nav) ---- */
  .feed-bottom-nav-badge {
    position: absolute;
    top: 2px;
    right: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 16px;
    height: 16px;
    padding: 0 3px;
    border-radius: 8px;
    background: #ef4444;
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    line-height: 1;
    pointer-events: none;
  }

  /* ---- Pulse Animation ---- */
  @keyframes ioppsPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
`;
