"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthProvider";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";

const navLinks = [
  { label: "Careers", href: "/careers" },
  { label: "Education", href: "/education" },
  { label: "Community", href: "/community" },
  { label: "Business", href: "/business" },
  { label: "Pricing", href: "/pricing" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, userProfile, loading, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold text-accent"
        >
          IOPPS
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent-bg text-accent"
                    : "text-text-secondary hover:bg-border-lt hover:text-text-primary",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {/* Auth section */}
          {loading ? null : user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-border-lt"
              >
                <Avatar
                  src={userProfile?.photoURL}
                  alt={userProfile?.displayName || "User"}
                  fallback={userProfile?.displayName || user.displayName || "User"}
                  size="sm"
                />
                <ChevronDown className="hidden h-4 w-4 text-text-muted sm:block" />
              </button>

              {/* User dropdown */}
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-lg border border-card-border bg-card p-1 shadow-lg">
                    <Link
                      href="/member/dashboard"
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-border-lt hover:text-text-primary"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      Dashboard
                    </Link>
                    <button
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-border-lt hover:text-text-primary"
                      onClick={() => {
                        setUserMenuOpen(false);
                        signOut();
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="ghost" size="sm" href="/login">
                Log In
              </Button>
              <Button variant="primary" size="sm" href="/signup">
                Sign Up
              </Button>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-text-secondary transition-colors hover:bg-border-lt md:hidden"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <nav
          className="border-t border-border bg-card px-4 pb-4 pt-2 md:hidden"
          aria-label="Mobile"
        >
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent-bg text-accent"
                      : "text-text-secondary hover:bg-border-lt hover:text-text-primary",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {!loading && !user && (
            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
              <Button variant="ghost" size="md" href="/login" fullWidth>
                Log In
              </Button>
              <Button variant="primary" size="md" href="/signup" fullWidth>
                Sign Up
              </Button>
            </div>
          )}
          {!loading && user && (
            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
              <Button variant="ghost" size="md" href="/member/dashboard" fullWidth>
                Dashboard
              </Button>
              <Button variant="ghost" size="md" fullWidth onClick={() => { setMobileMenuOpen(false); signOut(); }}>
                Sign Out
              </Button>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
