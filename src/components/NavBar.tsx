"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useAccountContext } from "@/lib/useAccountContext";
import { getAccountProfileHref, getAccountProfileLabel } from "@/lib/account-navigation";
import {
  getBrandHref,
  getDesktopTopNavItems,
  getMobileNavigationSections,
  getPublicAuthNavItems,
} from "@/lib/navigation";
import Avatar from "./Avatar";
import ThemeToggle from "./ThemeToggle";
import NotificationBell from "./NotificationBell";
import ChatButton from "./ChatButton";
import CreateChooserModal from "./CreateChooserModal";
import MobileNavigationSheet from "./MobileNavigationSheet";
import Button from "./Button";

function isNavLinkActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showChooser, setShowChooser] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { hasOrg, isAdmin, orgId, orgSlug, orgName, orgType } = useAccountContext();

  const isAuthenticated = Boolean(user);
  const brandHref = getBrandHref(isAuthenticated);
  const desktopNavItems = getDesktopTopNavItems({ isAuthenticated });
  const mobileSections = getMobileNavigationSections({ isAuthenticated, hasOrg, isAdmin }).filter(
    (section) => section.key !== "auth",
  );
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

  const mobileFooter = isAuthenticated ? (
    <div className="space-y-3">
      <Link
        href={profileHref}
        onClick={() => setMenuOpen(false)}
        className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 no-underline"
      >
        <Avatar name={displayName} size={38} />
        <div className="min-w-0">
          <p className="m-0 truncate text-sm font-bold text-white">{profileLabel}</p>
          <p className="m-0 truncate text-xs text-white/56">{profileSubLabel}</p>
        </div>
      </Link>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={toggle}
          className="min-h-11 rounded-[16px] border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white"
        >
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <button
          type="button"
          onClick={handleSignOut}
          className="min-h-11 rounded-[16px] border border-red/20 bg-red/12 px-4 text-sm font-semibold text-red-soft"
        >
          Sign Out
        </button>
      </div>
    </div>
  ) : null;

  return (
    <>
      <nav
        className="sticky top-0 z-50 border-b border-white/8"
        style={{
          background: "linear-gradient(135deg, var(--navy), var(--navy-light))",
          boxShadow: "0 10px 28px rgba(0,0,0,.12)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div className="mx-auto flex min-h-[76px] w-full max-w-[1400px] items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-5 lg:gap-8">
            <Link href={brandHref} className="flex shrink-0 items-center gap-3 no-underline">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.045] shadow-[0_16px_34px_-24px_rgba(0,0,0,.48)]"
              >
                <Image src="/logo.png" alt="IOPPS" width={38} height={38} className="shrink-0" />
              </div>
              <div className="min-w-0 leading-none">
                <span className="block text-[1.55rem] font-black tracking-[0.18em] text-white sm:text-[1.7rem]">
                  IOPPS
                </span>
                <span className="mt-1 hidden whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[0.26em] text-teal-light xl:block">
                  Empowering Indigenous Success
                </span>
              </div>
            </Link>

            <div className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] md:flex">
              {desktopNavItems.map(({ href, label, dot }) => {
                const active = isNavLinkActive(pathname, href);

                return (
                  <Link
                    key={href}
                    href={href}
                    className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[14px] px-3.5 py-2.5 text-[15px] font-semibold no-underline transition-all duration-200"
                    style={{
                      background: active ? "rgba(255,255,255,.12)" : "transparent",
                      color: active ? "#fff" : "rgba(255,255,255,.74)",
                      boxShadow: active ? "inset 0 0 0 1px rgba(255,255,255,.08)" : "none",
                    }}
                  >
                    {label}
                    {dot ? <span className="inline-block h-1.5 w-1.5 rounded-full bg-red" /> : null}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="hidden shrink-0 items-center gap-2.5 md:flex">
            {isAuthenticated && hasOrg ? (
              <button
                onClick={() => setShowChooser(true)}
                className="flex h-10 w-10 items-center justify-center rounded-[12px] border-none text-white"
                style={{ background: "var(--teal)" }}
                title="Create"
                aria-label="Create"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            ) : null}

            {isAuthenticated ? (
              <>
                <Link
                  href="/search"
                  className="hidden w-44 items-center gap-2 rounded-[14px] border border-white/10 px-4 py-2.5 no-underline transition-all hover:bg-white/10 xl:flex"
                  style={{ background: "rgba(255,255,255,.08)" }}
                >
                  <span className="text-sm text-white/42">&#128269;</span>
                  <span className="text-sm text-white/42">Search IOPPS...</span>
                </Link>
                <NotificationBell />
                <ChatButton />
                <ThemeToggle />
                <Link href="/settings" className="rounded-[12px] p-2 text-white/72 no-underline transition-all hover:bg-white/10">
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
              !authLoading && (
                <div
                  className="flex items-center gap-2 rounded-[18px] border border-white/10 px-2 py-2"
                  style={{
                    background: "rgba(255,255,255,.045)",
                    boxShadow: "0 18px 34px -28px rgba(0,0,0,.4)",
                  }}
                >
                  <ThemeToggle />
                  {publicAuthLinks.map((item) => (
                    <Link key={item.key} href={item.href}>
                      <Button
                        size="md"
                        variant={item.key === "signup" ? "primary-teal" : "outline"}
                        className={item.key === "login" ? "min-w-[118px] border-white/12 text-white" : "min-w-[120px]"}
                        style={
                          item.key === "login"
                            ? {
                                background: "rgba(255,255,255,.08)",
                                color: "#FFFFFF",
                              }
                            : undefined
                        }
                      >
                        <span className="whitespace-nowrap">{item.label}</span>
                      </Button>
                    </Link>
                  ))}
                </div>
              )
            )}
          </div>

          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Toggle navigation menu"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/8 text-xl text-white"
            >
              &#9776;
            </button>
          </div>
        </div>
      </nav>

      <MobileNavigationSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        pathname={pathname}
        brandHref={brandHref}
        sections={mobileSections}
        authActions={!isAuthenticated && !authLoading ? publicAuthLinks : []}
        footer={mobileFooter}
      />

      <CreateChooserModal open={showChooser} onClose={() => setShowChooser(false)} hasOrg={hasOrg} />
    </>
  );
}
