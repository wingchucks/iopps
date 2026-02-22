"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { getMemberProfile } from "@/lib/firestore/members";
import { doc, getDoc, getDocFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Avatar from "./Avatar";
import CreateChooserModal from "./CreateChooserModal";
import CreatePostModal from "./CreatePostModal";

/* ── SVG icon component ── */
function NavIcon({ name, size = 20 }: { name: string; size?: number }) {
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
    case "award":
      return (
        <svg {...p}>
          <circle cx="12" cy="8" r="7" />
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
        </svg>
      );
    case "building":
      return (
        <svg {...p}>
          <path d="M3 21h18" />
          <path d="M5 21V7l8-4 8 4v14" />
          <path d="M9 21v-6h6v6" />
        </svg>
      );
    case "shopping":
      return (
        <svg {...p}>
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      );
    case "book":
      return (
        <svg {...p}>
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      );
    case "message":
      return (
        <svg {...p}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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
    case "dashboard":
      return (
        <svg {...p}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "shield":
      return (
        <svg {...p}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
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
    case "handshake":
      return (
        <svg {...p}>
          <path d="M20.5 11H3.5" />
          <path d="M11.5 3l-4 8 6 2-4 8" />
          <path d="M3.5 11l3.5-3.5L11 11" />
          <path d="M20.5 11l-3.5-3.5L13 11" />
          <path d="M7 7.5L11 11l-2 4" />
          <path d="M17 7.5L13 11l2 4" />
        </svg>
      );
    case "video":
      return (
        <svg {...p}>
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" />
        </svg>
      );
    case "plus":
      return (
        <svg {...p}>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      );
    default:
      return null;
  }
}

/* ── Nav item definitions ── */
const navItems = [
  { href: "/search", label: "Search", icon: "search" },
  { href: "/feed", label: "Feed", icon: "home" },
  // Admin injected dynamically below
  { href: "/jobs", label: "Jobs", icon: "briefcase" },
  { href: "/events", label: "Events", icon: "calendar" },
  { href: "/scholarships", label: "Scholarships", icon: "award" },
  { href: "/schools", label: "Schools", icon: "building" },
  { href: "/partners", label: "Partners", icon: "handshake" },
  { href: "/shop", label: "Shop", icon: "shopping" },
  { href: "/stories", label: "Stories", icon: "book" },
  { href: "/messages", label: "Messages", icon: "message" },
  { href: "/saved", label: "Saved", icon: "bookmark" },
  { href: "/notifications", label: "Notifications", icon: "bell" },
  { href: "/livestreams", label: "Live", icon: "video" },
];

export default function IconRailSidebar() {
  const [hasOrg, setHasOrg] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showChooser, setShowChooser] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const displayName = user?.displayName || user?.email || "U";

  useEffect(() => {
    if (!user) return;

    async function checkRoles() {
      try {
        const profile = await getMemberProfile(user!.uid);
        if (profile?.orgId) {
          setHasOrg(true);
        } else {
          // Fallback: check users collection for employer role
          const userDoc = await getDoc(doc(db, "users", user!.uid));
          const userData = userDoc.data();
          if (userData?.employerId && userData?.role === "employer") {
            setHasOrg(true);
          }
        }
        if (profile?.role === "admin" || profile?.role === "moderator") {
          setIsAdmin(true);
          return;
        }
      } catch {
        // Members profile failed — check users collection as fallback
        try {
          const userDoc = await getDoc(doc(db, "users", user!.uid));
          const userData = userDoc.data();
          if (userData?.employerId && userData?.role === "employer") {
            setHasOrg(true);
          }
        } catch {}
      }

      // Check Firebase custom claims for admin
      try {
        const result = await user!.getIdTokenResult();
        if (result.claims.admin === true || result.claims.role === "admin") {
          setIsAdmin(true);
        }
      } catch {}
    }

    checkRoles();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const allItems = [
    ...navItems,
    ...(hasOrg
      ? [{ href: "/org/dashboard", label: "Dashboard", icon: "dashboard" }]
      : []),

  ];

  return (
  <>
    <aside className="hidden lg:flex flex-col fixed top-0 left-0 h-screen w-[72px] hover:w-[220px] bg-card border-r border-border z-40 transition-[width] duration-200 group/rail overflow-hidden">
      {/* Logo */}
      <Link
        href="/feed"
        className="flex items-center h-16 px-5 gap-3 no-underline shrink-0"
      >
        <img
          src="/logo.png"
          alt="IOPPS"
          width={32}
          height={32}
          className="shrink-0"
        />
        <span
          className="opacity-0 group-hover/rail:opacity-100 font-black text-lg tracking-[2px] whitespace-nowrap transition-opacity duration-200"
          style={{ color: "var(--navy)" }}
        >
          IOPPS
        </span>
      </Link>

      {/* Create button — auth only */}
      {user && (
        <button
          onClick={() => setShowChooser(true)}
          className="shrink-0 px-2 pt-2 border-none cursor-pointer"
          style={{ background: "transparent" }}
        >
          <div
            className="flex items-center gap-3 h-10 px-3 rounded-lg transition-colors"
            style={{ background: "var(--teal)", color: "#fff" }}
          >
            <span className="w-5 h-5 shrink-0 flex items-center justify-center">
              <NavIcon name="plus" size={20} />
            </span>
            <span className="opacity-0 group-hover/rail:opacity-100 text-sm font-bold whitespace-nowrap transition-opacity duration-200">
              Create
            </span>
          </div>
        </button>
      )}

      {/* Separator */}
      <div
        className="h-px mx-3 shrink-0"
        style={{ background: "var(--border)" }}
      />

      {/* Nav items */}
      <nav
        className="flex-1 flex flex-col gap-0.5 py-2 px-2 overflow-y-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {allItems.map(({ href, label, icon }) => {
          const active =
            pathname === href ||
            (href !== "/feed" && pathname.startsWith(href + "/"));
          const isLive = href === "/livestreams";
          return (
            <Link key={href} href={href} className="no-underline">
              <div
                className="flex items-center gap-3 h-10 px-3 rounded-lg transition-colors hover:bg-bg"
                style={{
                  background: active
                    ? "color-mix(in srgb, var(--teal) 8%, transparent)"
                    : undefined,
                  borderLeft: active
                    ? "3px solid var(--teal)"
                    : "3px solid transparent",
                  color: active ? "var(--teal)" : "var(--text-muted)",
                }}
              >
                <span className="w-5 h-5 shrink-0 flex items-center justify-center relative">
                  <NavIcon name={icon} size={20} />
                  {isLive && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                      style={{
                        background: "#DC2626",
                        animation: "pulse-dot 2s ease-in-out infinite",
                      }}
                    />
                  )}
                </span>
                <span
                  className="opacity-0 group-hover/rail:opacity-100 text-sm font-medium whitespace-nowrap transition-opacity duration-200"
                  style={{
                    color: active ? "var(--teal)" : "var(--text-sec)",
                  }}
                >
                  {label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div
        className="shrink-0 px-2 py-3 flex flex-col gap-1"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="flex items-center gap-3 h-10 px-3 rounded-lg border-none cursor-pointer transition-colors hover:bg-bg"
          style={{ background: "transparent", color: "var(--text-muted)" }}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          <span className="w-5 h-5 shrink-0 flex items-center justify-center text-base">
            {theme === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19"}
          </span>
          <span
            className="opacity-0 group-hover/rail:opacity-100 text-sm font-medium whitespace-nowrap transition-opacity duration-200"
            style={{ color: "var(--text-sec)" }}
          >
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </span>
        </button>

        {/* Admin (visible for admin/moderator only) */}
        {isAdmin && (
          <Link href="/admin" className="no-underline">
            <div
              className="flex items-center gap-3 h-10 px-3 rounded-lg transition-colors hover:bg-bg"
              style={{
                background:
                  pathname === "/admin" || pathname.startsWith("/admin/")
                    ? "color-mix(in srgb, var(--teal) 8%, transparent)"
                    : "transparent",
                borderLeft:
                  pathname === "/admin" || pathname.startsWith("/admin/")
                    ? "3px solid var(--teal)"
                    : "3px solid transparent",
                color:
                  pathname === "/admin" || pathname.startsWith("/admin/")
                    ? "var(--teal)"
                    : "var(--text-muted)",
              }}
            >
              <span className="w-5 h-5 shrink-0 flex items-center justify-center">
                <NavIcon name="shield" size={20} />
              </span>
              <span
                className="opacity-0 group-hover/rail:opacity-100 text-sm font-medium whitespace-nowrap transition-opacity duration-200"
                style={{
                  color:
                    pathname === "/admin" || pathname.startsWith("/admin/")
                      ? "var(--teal)"
                      : "var(--text-sec)",
                }}
              >
                Admin
              </span>
            </div>
          </Link>
        )}

        {/* Settings */}
        <Link href="/settings" className="no-underline">
          <div
            className="flex items-center gap-3 h-10 px-3 rounded-lg transition-colors hover:bg-bg"
            style={{
              background:
                pathname === "/settings" || pathname.startsWith("/settings/")
                  ? "color-mix(in srgb, var(--teal) 8%, transparent)"
                  : "transparent",
              color:
                pathname === "/settings" || pathname.startsWith("/settings/")
                  ? "var(--teal)"
                  : "var(--text-muted)",
            }}
          >
            <span className="w-5 h-5 shrink-0 flex items-center justify-center">
              <NavIcon name="settings" size={20} />
            </span>
            <span
              className="opacity-0 group-hover/rail:opacity-100 text-sm font-medium whitespace-nowrap transition-opacity duration-200"
              style={{ color: "var(--text-sec)" }}
            >
              Settings
            </span>
          </div>
        </Link>

        {/* Profile / Sign out */}
        {user ? (
          <div className="flex items-center gap-3 h-10 px-3 rounded-lg">
            <Link href={hasOrg ? "/org/dashboard" : "/profile"} className="shrink-0 no-underline">
              <Avatar name={displayName} size={28} />
            </Link>
            <div className="opacity-0 group-hover/rail:opacity-100 flex items-center gap-2 transition-opacity duration-200 min-w-0">
              <Link
                href={hasOrg ? "/org/dashboard" : "/profile"}
                className="text-sm font-medium no-underline truncate"
                style={{ color: "var(--text-sec)" }}
              >
                {displayName}
              </Link>
              <button
                onClick={handleSignOut}
                className="text-[11px] font-semibold rounded-md border-none cursor-pointer whitespace-nowrap"
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
          <Link
            href="/signin"
            className="flex items-center gap-3 h-10 px-3 rounded-lg no-underline"
          >
            <span className="w-7 h-7 shrink-0 flex items-center justify-center rounded-full"
              style={{ background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600 }}>
              ?
            </span>
            <span
              className="opacity-0 group-hover/rail:opacity-100 text-sm font-medium whitespace-nowrap transition-opacity duration-200"
              style={{ color: "var(--text-sec)" }}
            >
              Sign in
            </span>
          </Link>
        )}
      </div>
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </aside>
    <CreateChooserModal
      open={showChooser}
      onClose={() => setShowChooser(false)}
      onShareStory={() => setShowCreatePost(true)}
      hasOrg={hasOrg}
    />
    <CreatePostModal
      open={showCreatePost}
      onClose={() => setShowCreatePost(false)}
      onPostCreated={() => setShowCreatePost(false)}
    />
  </>
  );
}

