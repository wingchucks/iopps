"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useAccountContext } from "@/lib/useAccountContext";
import { getAccountProfileHref, getAccountProfileLabel } from "@/lib/account-navigation";
import {
  getBrandHref,
  getMemberUtilityNavItems,
  getPublicAuthNavItems,
  getRailNavItems,
  type NavigationIconName,
} from "@/lib/navigation";
import Avatar from "./Avatar";
import CreateChooserModal from "./CreateChooserModal";

function NavIcon({ name, size = 20 }: { name: NavigationIconName | "plus"; size?: number }) {
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "home":
      return (
        <svg {...p}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "briefcase":
      return (
        <svg {...p}>
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...p}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case "video":
      return (
        <svg {...p}>
          <rect x="3" y="5" width="15" height="14" rx="2" />
          <polygon points="10 9 10 15 15 12 10 9" fill="currentColor" stroke="none" />
          <path d="M18 10l3-2v8l-3-2" />
        </svg>
      );
    case "award":
      return (
        <svg {...p}>
          <circle cx="12" cy="8" r="7" />
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
        </svg>
      );
    case "dashboard":
      return (
        <svg {...p}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "settings":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case "search":
      return (
        <svg {...p}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case "book":
      return (
        <svg {...p}>
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      );
    case "school":
      return (
        <svg {...p}>
          <path d="M22 10 12 5 2 10l10 5 10-5Z" />
          <path d="M6 12v5.5c0 .5.3 1 .8 1.2 1.7.9 3.5 1.3 5.2 1.3s3.5-.4 5.2-1.3c.5-.2.8-.7.8-1.2V12" />
          <path d="M22 10v6" />
          <circle cx="22" cy="17" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "bookmark":
      return (
        <svg {...p}>
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "bell":
      return (
        <svg {...p}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case "shield":
      return (
        <svg {...p}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case "plus":
      return (
        <svg {...p}>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      );
    case "store":
      return (
        <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016 2.993 2.993 0 0 0 2.25-1.016 3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
        </svg>
      );
    case "users":
      return (
        <svg {...p}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "tag":
      return (
        <svg {...p}>
          <path d="M20.59 13.41 11 3H4v7l9.59 9.59a2 2 0 0 0 2.82 0l4.18-4.18a2 2 0 0 0 0-2.82Z" />
          <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return null;
  }
}

function isRailItemActive(pathname: string, href: string, key: string, searchType: string | null): boolean {
  if (key === "search") {
    return pathname === "/search" && searchType !== "businesses" && searchType !== "partners";
  }

  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

export default function IconRailSidebar() {
  const [showChooser, setShowChooser] = useState(false);
  const [menuOverflow, setMenuOverflow] = useState({
    hasOverflow: false,
    canScrollUp: false,
    canScrollDown: false,
  });
  const navRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { hasOrg, isAdmin, orgId, orgSlug, orgName, orgType } = useAccountContext();
  const isAuthenticated = Boolean(user);
  const navItems = getRailNavItems({ isAuthenticated, hasOrg, isAdmin });
  const utilityItems = isAuthenticated ? getMemberUtilityNavItems() : [];
  const publicAuthItems = getPublicAuthNavItems();
  const brandHref = getBrandHref(isAuthenticated);
  const displayName = user?.displayName || user?.email || "Account";
  const profileHref = getAccountProfileHref({ hasOrg, orgId, orgSlug, orgType });
  const profileLabel = getAccountProfileLabel({ hasOrg, orgType });
  const profileSubLabel = hasOrg ? orgName || displayName : user?.email || displayName;

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const searchType = searchParams.get("type")?.toLowerCase() ?? null;

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const updateOverflow = () => {
      const maxScroll = nav.scrollHeight - nav.clientHeight;
      setMenuOverflow({
        hasOverflow: maxScroll > 8,
        canScrollUp: nav.scrollTop > 8,
        canScrollDown: nav.scrollTop < maxScroll - 8,
      });
    };

    updateOverflow();
    nav.addEventListener("scroll", updateOverflow, { passive: true });
    window.addEventListener("resize", updateOverflow);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => updateOverflow())
        : null;

    resizeObserver?.observe(nav);

    return () => {
      nav.removeEventListener("scroll", updateOverflow);
      window.removeEventListener("resize", updateOverflow);
      resizeObserver?.disconnect();
    };
  }, [navItems.length]);

  const scrollHintText = menuOverflow.canScrollUp && menuOverflow.canScrollDown
    ? "More menu items above and below"
    : menuOverflow.canScrollUp
      ? "More menu items above"
      : "More menu items below";

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[240px] flex-col border-r border-border bg-card lg:flex">
        <Link href={brandHref} className="flex items-center px-4 py-4 no-underline shrink-0">
          <div
            className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10"
            style={{
              background:
                "linear-gradient(145deg, color-mix(in srgb, var(--teal) 28%, #08111f) 0%, #07111e 100%)",
              boxShadow:
                "0 18px 34px -26px color-mix(in srgb, var(--teal) 85%, transparent), inset 0 1px 0 rgba(255,255,255,0.18)",
            }}
          >
            <span
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 28% 20%, rgba(255,255,255,0.24), transparent 50%)",
              }}
            />
            <Image
              src="/logo.png"
              alt="IOPPS"
              width={32}
              height={32}
              className="relative z-10 shrink-0"
              priority
            />
          </div>
        </Link>

        {isAuthenticated && hasOrg && (
          <button
            onClick={() => setShowChooser(true)}
            className="shrink-0 border-none px-3 pt-2 text-left cursor-pointer"
            style={{ background: "transparent" }}
          >
            <div
              className="flex h-11 items-center gap-3 rounded-xl px-4 transition-all duration-200 hover:brightness-110"
              style={{
                background:
                  "linear-gradient(135deg, var(--teal-light) 0%, var(--teal) 55%, var(--teal-dark) 100%)",
                color: "#fff",
                boxShadow:
                  "0 18px 34px -24px color-mix(in srgb, var(--teal) 88%, transparent), inset 0 1px 0 rgba(255,255,255,0.18)",
              }}
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                style={{ background: "rgba(255,255,255,0.14)" }}
              >
                <NavIcon name="plus" size={20} />
              </span>
              <span className="whitespace-nowrap text-sm font-bold">Create</span>
            </div>
          </button>
        )}

        <div className="mx-3 h-px shrink-0" style={{ background: "var(--border)" }} />

        {menuOverflow.hasOverflow && (
          <div
            className="mx-3 mt-3 flex shrink-0 items-center justify-between gap-3 rounded-xl border px-3 py-2"
            style={{
              background: "color-mix(in srgb, var(--teal) 8%, transparent)",
              borderColor: "color-mix(in srgb, var(--teal) 18%, transparent)",
            }}
          >
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--teal)" }}>
                Menu tip
              </p>
              <p className="m-0 mt-1 text-xs font-medium" style={{ color: "var(--text-sec)" }}>
                {scrollHintText}
              </p>
            </div>
            <span className="shrink-0 text-sm font-bold" style={{ color: "var(--teal)" }}>
              {menuOverflow.canScrollUp && menuOverflow.canScrollDown
                ? "\u2195"
                : menuOverflow.canScrollUp
                  ? "\u2191"
                  : "\u2193"}
            </span>
          </div>
        )}

        <div className="relative min-h-0 flex-1">
          {menuOverflow.canScrollUp && (
            <div
              className="pointer-events-none absolute inset-x-2 top-0 z-10 h-8 rounded-t-2xl"
              style={{
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--card) 96%, transparent) 0%, transparent 100%)",
              }}
            />
          )}

          <nav
            ref={navRef}
            className="flex h-full flex-col gap-0.5 overflow-y-auto px-2 py-2"
            style={{ scrollbarWidth: "thin", scrollbarColor: "var(--teal) transparent" }}
          >
            {navItems.map(({ href, label, icon, key }) => {
              const active = isRailItemActive(pathname, href, key, searchType);

              return (
                <Link key={href} href={href} className="no-underline" data-nav-item={key}>
                  <div
                    className="flex h-11 items-center gap-3 rounded-xl px-3.5 transition-colors hover:bg-bg"
                    style={{
                      background: active ? "color-mix(in srgb, var(--teal) 10%, transparent)" : "transparent",
                      boxShadow: active ? "inset 3px 0 0 var(--teal)" : "inset 3px 0 0 transparent",
                      color: active ? "var(--teal)" : "var(--text-muted)",
                    }}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                      <NavIcon name={icon || "home"} size={20} />
                    </span>
                    <span
                      className="whitespace-nowrap text-sm font-medium transition-colors duration-200"
                      style={{ color: active ? "var(--teal)" : "var(--text-sec)" }}
                    >
                      {label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </nav>

          {menuOverflow.canScrollDown && (
            <div
              className="pointer-events-none absolute inset-x-2 bottom-0 z-10 h-10 rounded-b-2xl"
              style={{
                background:
                  "linear-gradient(0deg, color-mix(in srgb, var(--card) 98%, transparent) 0%, transparent 100%)",
              }}
            />
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-1 border-t border-border px-2 py-3">
          <button
            onClick={toggle}
            className="flex h-10 items-center gap-3 rounded-xl border-none px-3.5 cursor-pointer transition-colors hover:bg-bg"
            style={{ background: "transparent", color: "var(--text-muted)" }}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center text-base">
              {theme === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19"}
            </span>
            <span className="whitespace-nowrap text-sm font-medium" style={{ color: "var(--text-sec)" }}>
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </span>
          </button>

          {utilityItems.map(({ href, label, icon, key }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link key={href} href={href} className="no-underline" data-nav-item={key}>
                <div
                  className="flex h-10 items-center gap-3 rounded-xl px-3.5 transition-colors hover:bg-bg"
                  style={{
                    background:
                      active ? "color-mix(in srgb, var(--teal) 10%, transparent)" : "transparent",
                    boxShadow:
                      active ? "inset 3px 0 0 var(--teal)" : "inset 3px 0 0 transparent",
                    color: active ? "var(--teal)" : "var(--text-muted)",
                  }}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                    <NavIcon name={icon || "settings"} size={20} />
                  </span>
                  <span className="whitespace-nowrap text-sm font-medium" style={{ color: "var(--text-sec)" }}>
                    {label}
                  </span>
                </div>
              </Link>
            );
          })}

          {isAuthenticated ? (
            <div className="flex items-center gap-3 rounded-xl px-3.5 py-2" data-nav-profile="true">
              <Link href={profileHref} className="shrink-0 no-underline">
                <Avatar name={displayName} size={28} />
              </Link>
              <div className="flex min-w-0 items-center gap-2">
                <Link href={profileHref} className="min-w-0 flex-1 no-underline">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold m-0" style={{ color: "var(--text-sec)" }}>
                      {profileLabel}
                    </p>
                    <p className="truncate text-xs m-0" style={{ color: "var(--text-muted)" }}>
                      {profileSubLabel}
                    </p>
                  </div>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="whitespace-nowrap rounded-md border-none text-[11px] font-semibold cursor-pointer"
                  style={{
                    padding: "3px 8px",
                    background: "color-mix(in srgb, var(--red) 10%, transparent)",
                    color: "var(--red)",
                  }}
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            !authLoading && (
              <div className="flex flex-col gap-2 px-2 pt-2" data-nav-profile="true">
                {publicAuthItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-xl px-3.5 py-2.5 text-center text-sm font-semibold no-underline"
                    style={{
                      background: item.key === "signup" ? "var(--teal)" : "var(--border)",
                      color: item.key === "signup" ? "#fff" : "var(--text)",
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )
          )}
        </div>
      </aside>

      <CreateChooserModal
        open={showChooser}
        onClose={() => setShowChooser(false)}
        hasOrg={hasOrg}
      />
    </>
  );
}
