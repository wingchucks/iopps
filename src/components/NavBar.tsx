"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useAccountContext } from "@/lib/useAccountContext";
import { getAccountProfileHref, getAccountProfileLabel } from "@/lib/account-navigation";
import {
  getAppExploreNavItems,
  getBrandHref,
  getDesktopTopNavItems,
  getMemberUtilityNavItems,
  getPublicAuthNavItems,
} from "@/lib/navigation";
import Avatar from "./Avatar";
import ThemeToggle from "./ThemeToggle";
import NotificationBell from "./NotificationBell";
import ChatButton from "./ChatButton";
import CreateChooserModal from "./CreateChooserModal";

function isNavLinkActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showChooser, setShowChooser] = useState(false);
  const [drawerOverflow, setDrawerOverflow] = useState({
    hasOverflow: false,
    canScrollUp: false,
    canScrollDown: false,
  });
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { hasOrg, isAdmin, orgId, orgSlug, orgName, orgType } = useAccountContext();
  const isAuthenticated = Boolean(user);
  const brandHref = getBrandHref(isAuthenticated);
  const desktopNavItems = getDesktopTopNavItems({ isAuthenticated });
  const mobileExploreLinks = getAppExploreNavItems({
    isAuthenticated,
    hasOrg,
    isAdmin,
  });
  const mobileUtilityLinks = isAuthenticated ? getMemberUtilityNavItems() : [];
  const publicAuthLinks = getPublicAuthNavItems();
  const displayName = user?.displayName || user?.email || "Account";
  const profileHref = getAccountProfileHref({ hasOrg, orgId, orgSlug, orgType });
  const profileLabel = getAccountProfileLabel({ hasOrg, orgType });
  const profileSubLabel = hasOrg ? orgName || displayName : user?.email || displayName;

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    router.push("/");
  };

  useEffect(() => {
    if (!menuOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    const drawer = drawerRef.current;
    if (!drawer) return;

    const updateOverflow = () => {
      const maxScroll = drawer.scrollHeight - drawer.clientHeight;
      setDrawerOverflow({
        hasOverflow: maxScroll > 8,
        canScrollUp: drawer.scrollTop > 8,
        canScrollDown: drawer.scrollTop < maxScroll - 8,
      });
    };

    updateOverflow();
    drawer.addEventListener("scroll", updateOverflow, { passive: true });
    window.addEventListener("resize", updateOverflow);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => updateOverflow())
        : null;

    resizeObserver?.observe(drawer);

    return () => {
      drawer.removeEventListener("scroll", updateOverflow);
      window.removeEventListener("resize", updateOverflow);
      resizeObserver?.disconnect();
    };
  }, [menuOpen, mobileExploreLinks.length, mobileUtilityLinks.length, publicAuthLinks.length]);

  const drawerHintText = drawerOverflow.canScrollUp && drawerOverflow.canScrollDown
    ? "More options above and below"
    : drawerOverflow.canScrollUp
      ? "More options above"
      : "More options below";

  return (
    <>
      <nav
        className="sticky top-0 z-50"
        style={{
          background: "linear-gradient(135deg, var(--navy), var(--navy-light))",
          boxShadow: "0 2px 20px rgba(0,0,0,.15)",
        }}
      >
        <div className="flex items-center justify-between h-16 px-4 md:px-10">
          <div className="flex items-center gap-4 md:gap-8">
            <Link href={brandHref} className="flex items-center gap-2.5 no-underline">
              <Image src="/logo.png" alt="IOPPS" width={36} height={36} className="shrink-0" />
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

            <div className="hidden md:flex gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] max-w-[48vw]">
              {desktopNavItems.map(({ href, label, dot }) => {
                const active = isNavLinkActive(pathname, href);

                return (
                  <Link
                    key={href}
                    href={href}
                    className="px-4 py-2 rounded-lg border-none font-semibold text-sm transition-all no-underline flex items-center gap-1.5 whitespace-nowrap"
                    style={{
                      background: active ? "rgba(255,255,255,.12)" : "transparent",
                      color: active ? "#fff" : "rgba(255,255,255,.6)",
                    }}
                  >
                    {label}
                    {dot && (
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                        style={{
                          background: "#DC2626",
                          animation: "pulse-nav-dot 2s ease-in-out infinite",
                        }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated && hasOrg && (
              <button
                onClick={() => setShowChooser(true)}
                className="flex items-center justify-center w-9 h-9 rounded-[10px] border-none cursor-pointer transition-all hover:brightness-110"
                style={{ background: "var(--teal)", color: "#fff" }}
                title="Create"
                aria-label="Create"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            )}

            <Link
              href="/search"
              className="flex items-center gap-2 px-4 py-2 rounded-[10px] w-44 xl:w-60 no-underline transition-all hover:bg-white/[.12]"
              style={{
                background: "rgba(255,255,255,.08)",
                border: "1px solid rgba(255,255,255,.1)",
              }}
            >
              <span style={{ color: "rgba(255,255,255,.4)", fontSize: 14 }}>&#128269;</span>
              <span style={{ color: "rgba(255,255,255,.3)", fontSize: 13 }}>Search IOPPS...</span>
            </Link>

            {isAuthenticated && <NotificationBell />}
            {isAuthenticated && <ChatButton />}

            {isAuthenticated && (
              <Link
                href="/saved"
                className="flex items-center justify-center w-10 h-10 rounded-[10px] no-underline transition-all hover:bg-white/[.12]"
                style={{ background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.85)" }}
                title="Saved Items"
                aria-label="Saved Items"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              </Link>
            )}

            <ThemeToggle />

            {isAuthenticated ? (
              <>
                <Link
                  href="/settings"
                  className="flex items-center justify-center w-9 h-9 rounded-[10px] no-underline transition-all hover:bg-white/[.12]"
                  style={{ color: "rgba(255,255,255,.6)" }}
                  title="Settings"
                  aria-label="Settings"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </Link>
                <Link href={profileHref}>
                  <Avatar name={displayName} size={36} />
                </Link>
              </>
            ) : (
              !authLoading && publicAuthLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-[10px] px-4 py-2 text-sm font-semibold no-underline transition-all"
                  style={{
                    background: link.key === "signup" ? "var(--teal)" : "rgba(255,255,255,.08)",
                    color: link.key === "signup" ? "#fff" : "rgba(255,255,255,.9)",
                    border: link.key === "signup" ? "none" : "1px solid rgba(255,255,255,.1)",
                  }}
                >
                  {link.label}
                </Link>
              ))
            )}
          </div>

          <div className="flex md:hidden items-center gap-2">
            {isAuthenticated && hasOrg && (
              <button
                onClick={() => setShowChooser(true)}
                className="flex items-center justify-center w-10 h-10 rounded-[12px] border-none cursor-pointer transition-all hover:brightness-110"
                style={{ background: "var(--teal)", color: "#fff" }}
                title="Create"
                aria-label="Create"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            )}

            {isAuthenticated && (
              <Link href={profileHref}>
                <Avatar name={displayName} size={32} />
              </Link>
            )}

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle navigation menu"
              className="w-10 h-10 rounded-[10px] border-none cursor-pointer text-xl text-white flex items-center justify-center"
              style={{ background: "rgba(255,255,255,.08)" }}
            >
              {menuOpen ? "\u2715" : "\u2630"}
            </button>
          </div>
        </div>

        {menuOpen && (
          <>
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40 border-none bg-slate-950/40 p-0 md:hidden"
            />

            <div className="fixed inset-x-3 top-20 bottom-3 z-50 overflow-hidden rounded-[28px] border border-white/10 bg-[var(--navy)] shadow-2xl shadow-black/40 md:hidden">
              <div ref={drawerRef} className="relative flex h-full flex-col overflow-y-auto px-4 py-4" style={{ scrollbarWidth: "thin", scrollbarColor: "var(--teal) transparent" }}>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="m-0 text-[11px] font-bold uppercase tracking-[0.24em] text-white/45">
                      Navigation
                    </p>
                    <p className="mt-1 mb-0 truncate text-lg font-bold text-white">
                      {isAuthenticated ? displayName : "Browse IOPPS"}
                    </p>
                    <p className="mt-1 mb-0 text-sm text-white/55">
                      Explore opportunities, tools, and your account.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMenuOpen(false)}
                    aria-label="Close menu"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border-none text-lg text-white"
                    style={{ background: "rgba(255,255,255,.08)" }}
                  >
                    &#10005;
                  </button>
                </div>

                {drawerOverflow.hasOverflow && (
                  <div
                    className="mb-4 flex items-center justify-between gap-3 rounded-[18px] border px-4 py-3"
                    style={{
                      background: "rgba(20,184,166,.12)",
                      borderColor: "rgba(20,184,166,.22)",
                    }}
                  >
                    <div className="min-w-0">
                      <p className="m-0 text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: "#99F6E4" }}>
                        Menu tip
                      </p>
                      <p className="m-0 mt-1 text-sm font-medium text-white/82">
                        {drawerHintText}
                      </p>
                    </div>
                    <span className="shrink-0 text-base font-bold" style={{ color: "#99F6E4" }}>
                      {drawerOverflow.canScrollUp && drawerOverflow.canScrollDown
                        ? "\u2195"
                        : drawerOverflow.canScrollUp
                          ? "\u2191"
                          : "\u2193"}
                    </span>
                  </div>
                )}

                {drawerOverflow.canScrollUp && (
                  <div
                    className="pointer-events-none sticky top-0 z-10 -mt-2 mb-2 h-8 rounded-t-[22px]"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(11, 24, 43, 0.96) 0%, rgba(11, 24, 43, 0) 100%)",
                    }}
                  />
                )}

                <div className="space-y-5">
                  <section>
                    <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.24em] text-white/38">
                      Explore
                    </p>
                    <div className="space-y-2">
                      {mobileExploreLinks.map(({ href, label, dot }) => {
                        const active = isNavLinkActive(pathname, href);

                        return (
                          <Link
                            key={href}
                            href={href}
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center justify-between rounded-[20px] border px-4 py-3.5 text-sm font-semibold no-underline transition-all"
                            style={{
                              color: active ? "#fff" : "rgba(255,255,255,.82)",
                              background: active ? "rgba(20,184,166,.18)" : "rgba(255,255,255,.04)",
                              borderColor: active ? "rgba(20,184,166,.35)" : "rgba(255,255,255,.08)",
                            }}
                          >
                            <span className="flex items-center gap-2">
                              {label}
                              {dot && (
                                <span
                                  className="inline-block h-1.5 w-1.5 rounded-full"
                                  style={{ background: "#DC2626" }}
                                />
                              )}
                            </span>
                            <span style={{ color: "rgba(255,255,255,.32)" }}>&#8594;</span>
                          </Link>
                        );
                      })}
                    </div>
                  </section>

                  <section>
                    <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.24em] text-white/38">
                      Utility
                    </p>
                    <div className="space-y-2">
                      {mobileUtilityLinks.map(({ href, label }) => {
                        const active = isNavLinkActive(pathname, href);

                        return (
                          <Link
                            key={href}
                            href={href}
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center justify-between rounded-[20px] border px-4 py-3.5 text-sm font-semibold no-underline transition-all"
                            style={{
                              color: active ? "#fff" : "rgba(255,255,255,.82)",
                              background: active ? "rgba(20,184,166,.18)" : "rgba(255,255,255,.04)",
                              borderColor: active ? "rgba(20,184,166,.35)" : "rgba(255,255,255,.08)",
                            }}
                          >
                            <span>{label}</span>
                            <span style={{ color: "rgba(255,255,255,.32)" }}>&#8594;</span>
                          </Link>
                        );
                      })}

                      <button
                        type="button"
                        onClick={toggle}
                        className="flex w-full items-center justify-between rounded-[20px] border px-4 py-3.5 text-left text-sm font-semibold transition-all"
                        style={{
                          color: "rgba(255,255,255,.82)",
                          background: "rgba(255,255,255,.04)",
                          border: "1px solid rgba(255,255,255,.08)",
                        }}
                      >
                        <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
                        <span className="text-base">{theme === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19"}</span>
                      </button>
                    </div>
                  </section>

                  {isAuthenticated ? (
                    <section>
                      <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.24em] text-white/38">
                        Account
                      </p>
                      <div
                        className="rounded-[22px] border p-3"
                        style={{
                          background: "rgba(255,255,255,.04)",
                          borderColor: "rgba(255,255,255,.08)",
                        }}
                      >
                        <div className="mb-3 flex items-center gap-3">
                          <Link href={profileHref} onClick={() => setMenuOpen(false)}>
                            <Avatar name={displayName} size={40} />
                          </Link>
                          <div className="min-w-0">
                            <p className="mb-0 truncate text-base font-bold text-white">
                              {profileLabel}
                            </p>
                            <p className="mb-0 truncate text-sm text-white/55">
                              {profileSubLabel}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Link
                            href={profileHref}
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center justify-between rounded-[18px] px-4 py-3 text-sm font-semibold no-underline transition-all hover:bg-white/8"
                            style={{ color: "rgba(255,255,255,.82)", background: "rgba(255,255,255,.04)" }}
                          >
                            <span>{profileLabel}</span>
                            <span style={{ color: "rgba(255,255,255,.32)" }}>&#8594;</span>
                          </Link>

                          <button
                            onClick={handleSignOut}
                            className="w-full rounded-[18px] border-none px-4 py-3 text-sm font-semibold cursor-pointer"
                            style={{ background: "rgba(220,38,38,.16)", color: "#FCA5A5" }}
                          >
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </section>
                  ) : (
                    <section>
                      <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.24em] text-white/38">
                        Access IOPPS
                      </p>
                      <div
                        className="rounded-[22px] border p-3"
                        style={{
                          background: "rgba(255,255,255,.04)",
                          borderColor: "rgba(255,255,255,.08)",
                        }}
                      >
                        <div className="space-y-2">
                          <p className="mb-0 px-1 text-sm text-white/58">
                            Sign in to save opportunities, follow organizations, and access your profile.
                          </p>
                          {publicAuthLinks.map((link) => (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={() => setMenuOpen(false)}
                              className="block rounded-[18px] px-4 py-3 text-center text-sm font-semibold no-underline"
                              style={{
                                background:
                                  link.key === "signup" ? "rgba(20,184,166,.16)" : "rgba(59,130,246,.16)",
                                color: link.key === "signup" ? "#99F6E4" : "#93C5FD",
                              }}
                            >
                              {link.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </section>
                  )}
                </div>

                {drawerOverflow.canScrollDown && (
                  <div
                    className="pointer-events-none sticky bottom-0 mt-4 h-10 rounded-b-[22px]"
                    style={{
                      background:
                        "linear-gradient(0deg, rgba(11, 24, 43, 0.98) 0%, rgba(11, 24, 43, 0) 100%)",
                    }}
                  />
                )}
              </div>
            </div>
          </>
        )}

        <style>{`
          @keyframes pulse-nav-dot {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.3); }
          }
        `}</style>
      </nav>

      <CreateChooserModal
        open={showChooser}
        onClose={() => setShowChooser(false)}
        hasOrg={hasOrg}
      />
    </>
  );
}
