"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { User, MessageSquare, Settings, LogOut } from "lucide-react";

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!user) return null;

  const handleLogout = async () => {
    setOpen(false);
    await logout();
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center"
        aria-label="User menu"
      >
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photoURL}
            alt="Profile photo"
            className="h-8 w-8 rounded-full border border-[var(--border)] object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-medium text-white">
            {user.displayName?.charAt(0) || "?"}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--card-border)]">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
              {user.displayName || "Member"}
            </p>
            <p className="text-xs text-[var(--text-muted)] truncate">
              {user.email}
            </p>
          </div>
          <nav className="py-1">
            <Link
              href={`/member/${user.uid}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--background)] transition-colors"
            >
              <User className="h-4 w-4" />
              My Profile
            </Link>
            <Link
              href="/member/messages"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--background)] transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              Messages
            </Link>
            <Link
              href="/member/settings/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--background)] transition-colors"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </nav>
          <div className="border-t border-[var(--card-border)] py-1">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-[var(--background)] transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
