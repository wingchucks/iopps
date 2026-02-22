"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getMemberProfile } from "@/lib/firestore/members";
import Avatar from "./Avatar";
import ThemeToggle from "./ThemeToggle";
import NotificationBell from "./NotificationBell";
import ChatButton from "./ChatButton";
import CreateChooserModal from "./CreateChooserModal";
import CreatePostModal from "./CreatePostModal";

const baseNavLinks = [
  { href: "/feed", label: "Home" },
  { href: "/search", label: "Search" },
  { href: "/partners", label: "Partners" },
  { href: "/schools", label: "Schools" },
  { href: "/stories", label: "Stories" },
  { href: "/members", label: "Members" },
  { href: "/training", label: "Training" },
  { href: "/mentorship", label: "Mentorship" },
  { href: "/shop", label: "Shop" },
  { href: "/livestreams", label: "Live", dot: true },
];

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasOrg, setHasOrg] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showChooser, setShowChooser] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const displayName = user?.displayName || user?.email || "U";

  useEffect(() => {
    if (!user) return;
    getMemberProfile(user.uid).then((profile) => {
      if (profile?.orgId) setHasOrg(true);
      if (profile?.role === "admin" || profile?.role === "moderator") setIsAdmin(true);
    });
  }, [user]);

  const navLinks = [
    ...baseNavLinks,
    ...(hasOrg ? [{ href: "/org/dashboard", label: "Dashboard", dot: false }] : []),
    ...(isAdmin ? [{ href: "/admin", label: "Admin", dot: false }] : []),
    ...(!hasOrg ? [{ href: "/profile", label: "Profile", dot: false }] : []),
  ];

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    router.push("/");
  };

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
        {/* Left: logo + nav links */}
        <div className="flex items-center gap-4 md:gap-8">
          <Link href="/feed" className="flex items-center gap-2.5 no-underline">
            <img src="/logo.png" alt="IOPPS" width={36} height={36} className="shrink-0" />
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
          <div className="hidden md:flex gap-1">
            {navLinks.map(({ href, label, dot }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className="px-4 py-2 rounded-lg border-none font-semibold text-sm transition-all no-underline flex items-center gap-1.5"
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

        {/* Right: search + actions + avatar (desktop) */}
        <div className="hidden md:flex items-center gap-3">
          {user && (
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
            className="flex items-center gap-2 px-4 py-2 rounded-[10px] w-60 no-underline transition-all hover:bg-white/[.12]"
            style={{
              background: "rgba(255,255,255,.08)",
              border: "1px solid rgba(255,255,255,.1)",
            }}
          >
            <span style={{ color: "rgba(255,255,255,.4)", fontSize: 14 }}>&#128269;</span>
            <span style={{ color: "rgba(255,255,255,.3)", fontSize: 13 }}>Search IOPPS...</span>
          </Link>
          <NotificationBell />
          <ChatButton />
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
          <ThemeToggle />
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
          <Link href={hasOrg ? "/org/dashboard" : "/profile"}>
            <Avatar name={displayName} size={36} />
          </Link>
        </div>

        {/* Mobile: avatar + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <Link href={hasOrg ? "/org/dashboard" : "/profile"}>
            <Avatar name={displayName} size={32} />
          </Link>
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

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/10 pb-3">
          {navLinks.map(({ href, label, dot }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-3 font-semibold text-sm no-underline transition-all"
                style={{
                  color: active ? "#fff" : "rgba(255,255,255,.6)",
                  background: active ? "rgba(255,255,255,.08)" : "transparent",
                }}
              >
                {label}
                {dot && (
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ background: "#DC2626" }}
                  />
                )}
              </Link>
            );
          })}
          <Link
            href="/search"
            onClick={() => setMenuOpen(false)}
            className="mx-4 mt-2 flex items-center gap-2 px-4 py-2.5 rounded-[10px] no-underline"
            style={{
              background: "rgba(255,255,255,.08)",
              border: "1px solid rgba(255,255,255,.1)",
            }}
          >
            <span style={{ color: "rgba(255,255,255,.4)", fontSize: 14 }}>&#128269;</span>
            <span style={{ color: "rgba(255,255,255,.3)", fontSize: 13 }}>Search IOPPS...</span>
          </Link>
          <Link
            href="/saved"
            onClick={() => setMenuOpen(false)}
            className="block px-4 py-3 font-semibold text-sm no-underline transition-all"
            style={{
              color: pathname === "/saved" ? "#fff" : "rgba(255,255,255,.6)",
              background: pathname === "/saved" ? "rgba(255,255,255,.08)" : "transparent",
            }}
          >
            Saved Items
          </Link>
          <Link
            href="/settings"
            onClick={() => setMenuOpen(false)}
            className="block px-4 py-3 font-semibold text-sm no-underline transition-all"
            style={{
              color: pathname === "/settings" ? "#fff" : "rgba(255,255,255,.6)",
              background: pathname === "/settings" ? "rgba(255,255,255,.08)" : "transparent",
            }}
          >
            Settings
          </Link>
          <div className="mx-4 mt-2 flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={handleSignOut}
              className="flex-1 py-2.5 rounded-[10px] border-none cursor-pointer text-sm font-semibold"
              style={{ background: "rgba(220,38,38,.15)", color: "#DC2626" }}
            >
              Sign Out
            </button>
          </div>
        </div>
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
