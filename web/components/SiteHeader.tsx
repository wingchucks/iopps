"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import NotificationBell from "@/components/NotificationBell";
import { getUnreadMessageCount } from "@/lib/firestore";

const navLinks = [
  { href: "/careers", label: "Careers" },
  { href: "/organizations", label: "Directory" },
  { href: "/education", label: "Education" },
  { href: "/conferences", label: "Conferences" },
  { href: "/community", label: "Connect" },
  { href: "/live", label: "Live" },
  { href: "/map", label: "Map" },
  { href: "/pricing", label: "Pricing" },
];

export default function SiteHeader() {
  const { user, role, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = () => setMenuOpen(false);

  // Handle logout with redirect to homepage
  const handleLogout = async () => {
    closeMenu();
    router.push('/');
    await logout();
  };

  useEffect(() => {
    async function fetchUnreadMessages() {
      if (!user || !role) return;

      try {
        // Fetch for community members (any role that's not employer/admin/moderator) or employer roles
        const isCommunityMember = role !== "employer" && role !== "admin" && role !== "moderator";
        if (isCommunityMember || role === "employer") {
          const userType = isCommunityMember ? "member" : "employer";
          const count = await getUnreadMessageCount(user.uid, userType);
          setUnreadMessageCount(count);
        }
      } catch (error) {
        console.error("Error fetching unread messages:", error);
      }
    }

    fetchUnreadMessages();

    // Set up an interval to poll for unread messages every minute
    const intervalId = setInterval(fetchUnreadMessages, 60000);

    return () => clearInterval(intervalId);
  }, [user, role]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50">
      {/* Ocean Wave gradient background */}
      <div className="animate-gradient bg-gradient-to-r from-blue-900 via-[#14B8A6]/80 to-cyan-800">
        {/* Subtle white overlay */}
        <div className="bg-gradient-to-b from-white/5 to-transparent">
          <div className="mx-auto w-full px-4 lg:px-6">
            {/* Single row with logo, navigation, and account */}
            <div className="flex items-center justify-between gap-4 py-3">
              {/* Branding */}
              <Link href="/" className="group flex shrink-0 items-center gap-2">
                <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-white/20 shadow-lg backdrop-blur">
                  <Image
                    src="/logo.png"
                    alt="IOPPS Logo"
                    width={44}
                    height={44}
                    className="object-cover"
                    priority
                  />
                </div>
                <span className="text-xl font-black tracking-tight text-white drop-shadow-lg">
                  IOPPS
                </span>
              </Link>

              {/* Navigation bar - Pill container */}
              <nav className="hidden lg:flex flex-1 items-center justify-center">
                <div className="flex items-center rounded-full border border-white/20 bg-white/10 px-1.5 py-1 backdrop-blur">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-all ${pathname === link.href
                        ? "bg-white/20 font-semibold text-white"
                        : "text-white/80 hover:text-white"
                        }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </nav>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="lg:hidden rounded-full border border-white/30 bg-white/10 p-2 text-white backdrop-blur transition hover:bg-white/20"
                aria-label="Toggle menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileNavOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>

              {/* Account section */}
              <div className="hidden lg:flex shrink-0 items-center gap-2">
                {loading ? (
                  <div className="text-xs text-white/60">Loading...</div>
                ) : user ? (
                  <>
                    <NotificationBell />
                    <div className="relative" ref={menuRef}>
                      <button
                        className="flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
                        onClick={() => setMenuOpen((prev) => !prev)}
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[0.65rem] font-bold text-blue-900">
                          {user.displayName?.charAt(0)?.toUpperCase() ??
                            user.email?.charAt(0)?.toUpperCase() ??
                            "U"}
                        </span>
                        <span className="hidden sm:inline">{user.displayName ?? user.email ?? "Account"}</span>
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {menuOpen && (
                        <div className="absolute right-0 z-30 mt-2 w-60 rounded-xl border border-slate-700/50 bg-slate-900/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
                          <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                            Account
                          </p>
                          <p className="mt-1 truncate text-sm font-semibold text-slate-100">
                            {user.displayName ?? user.email}
                          </p>
                          <p className="text-xs text-slate-400 capitalize">{role ?? "User"}</p>

                          <div className="my-3 border-t border-slate-700/50" />

                          <div className="space-y-1.5">
                            {role !== "employer" && role !== "admin" && role !== "moderator" && (
                              <Link
                                href="/member/dashboard"
                                className="block rounded-lg px-3 py-2 text-xs text-slate-300 transition hover:bg-[#14B8A6]/20 hover:text-[#14B8A6]"
                                onClick={closeMenu}
                              >
                                <span className="font-semibold">My Dashboard</span>
                              </Link>
                            )}
                            {role === "employer" && (
                              <Link
                                href="/organization/dashboard"
                                className="block rounded-lg px-3 py-2 text-xs text-slate-300 transition hover:bg-[#14B8A6]/20 hover:text-[#14B8A6]"
                                onClick={closeMenu}
                              >
                                <span className="font-semibold">Organization Dashboard</span>
                              </Link>
                            )}
                            {(role === "admin" || role === "moderator") && (
                              <Link
                                href="/admin"
                                className="block rounded-lg px-3 py-2 text-xs text-slate-300 transition hover:bg-[#14B8A6]/20 hover:text-[#14B8A6]"
                                onClick={closeMenu}
                              >
                                <span className="font-semibold">Admin Dashboard</span>
                              </Link>
                            )}
                          </div>

                          <div className="mt-3 border-t border-slate-700/50 pt-3">
                            <button
                              onClick={() => void handleLogout()}
                              className="w-full rounded-lg bg-gradient-to-r from-[#14B8A6] to-cyan-600 px-3 py-2 text-xs font-semibold text-white transition hover:from-[#16cdb8] hover:to-cyan-500"
                            >
                              Sign out
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    <Link
                      href="/login"
                      className="text-sm font-medium text-white/80 transition hover:text-white"
                    >
                      Login
                    </Link>
                    <Link
                      href="/register"
                      className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-blue-900 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
                    >
                      Get Started
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Navigation Menu */}
            {mobileNavOpen && (
              <div className="lg:hidden border-t border-white/20 py-4">
                <nav className="flex flex-col gap-2">
                  {/* Authenticated User Links */}
                  {user && (
                    <div className="mb-2 flex flex-col gap-2 border-b border-white/20 pb-3">
                      <div className="px-4 py-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
                          Account
                        </p>
                        <p className="truncate text-sm font-medium text-white">
                          {user.displayName ?? user.email}
                        </p>
                      </div>

                      {role !== "employer" && role !== "admin" && role !== "moderator" && (
                        <Link
                          href="/member/dashboard"
                          onClick={() => setMobileNavOpen(false)}
                          className={`rounded-full px-4 py-2.5 text-sm font-medium transition-all ${pathname === "/member/dashboard"
                            ? "bg-white/20 text-white"
                            : "text-white/80 hover:bg-white/10 hover:text-white"
                            }`}
                        >
                          Dashboard
                        </Link>
                      )}

                      {role === "employer" && (
                        <>
                          <Link
                            href="/organization/dashboard"
                            onClick={() => setMobileNavOpen(false)}
                            className={`rounded-full px-4 py-2.5 text-sm font-medium transition-all ${pathname === "/organization/dashboard"
                              ? "bg-white/20 text-white"
                              : "text-white/80 hover:bg-white/10 hover:text-white"
                              }`}
                          >
                            Dashboard
                          </Link>
                          <Link
                            href="/organization/profile"
                            onClick={() => setMobileNavOpen(false)}
                            className={`rounded-full px-4 py-2.5 text-sm font-medium transition-all ${pathname === "/organization/profile"
                              ? "bg-white/20 text-white"
                              : "text-white/80 hover:bg-white/10 hover:text-white"
                              }`}
                          >
                            Manage Organization
                          </Link>
                        </>
                      )}

                      {(role === "admin" || role === "moderator") && (
                        <Link
                          href="/admin"
                          onClick={() => setMobileNavOpen(false)}
                          className={`rounded-full px-4 py-2.5 text-sm font-medium transition-all ${pathname === "/admin"
                            ? "bg-white/20 text-white"
                            : "text-white/80 hover:bg-white/10 hover:text-white"
                            }`}
                        >
                          Admin Dashboard
                        </Link>
                      )}
                    </div>
                  )}

                  {/* Main Navigation Links */}
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileNavOpen(false)}
                      className={`rounded-full px-4 py-2.5 text-sm font-medium transition-all ${pathname === link.href
                        ? "bg-white/20 text-white"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                        }`}
                    >
                      {link.label}
                    </Link>
                  ))}

                  {/* Auth Buttons */}
                  {!user ? (
                    <div className="mt-3 flex flex-col gap-2 border-t border-white/20 pt-4">
                      <Link
                        href="/login"
                        onClick={() => setMobileNavOpen(false)}
                        className="rounded-full border border-white/30 bg-white/10 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-white/20"
                      >
                        Login
                      </Link>
                      <Link
                        href="/register"
                        onClick={() => setMobileNavOpen(false)}
                        className="rounded-full bg-white px-4 py-2.5 text-center text-sm font-bold text-blue-900 shadow-lg transition hover:shadow-xl"
                      >
                        Get Started
                      </Link>
                    </div>
                  ) : (
                    <div className="mt-3 border-t border-white/20 pt-4 px-4">
                      <button
                        onClick={() => {
                          setMobileNavOpen(false);
                          void handleLogout();
                        }}
                        className="w-full rounded-full border border-white/30 bg-white/10 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-red-500/20 hover:border-red-400/50"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </nav>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
