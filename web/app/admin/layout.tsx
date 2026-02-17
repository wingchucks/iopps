"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

const NAV_SECTIONS = [
  { label: "Dashboard", href: "/admin", icon: "📊" },
  { label: "Users", href: "/admin/users", icon: "👥" },
  { label: "Organizations", href: "/admin/organizations", icon: "🏢" },
  { label: "Moderation", href: "/admin/moderation", icon: "🛡️" },
  { label: "Posts", href: "/admin/posts", icon: "📝" },
  { label: "Stories", href: "/admin/stories", icon: "📖" },
  { label: "Livestreams", href: "/admin/livestreams", icon: "📺" },
  { label: "Pinned", href: "/admin/pinned", icon: "📌" },
  { label: "Payments", href: "/admin/payments", icon: "💳" },
  { label: "Data", href: "/admin/data", icon: "🗃️" },
  { label: "Reports", href: "/admin/reports", icon: "📈" },
  { label: "Feed Sync", href: "/admin/feed-sync", icon: "🔄" },
  { label: "Partners", href: "/admin/partners", icon: "🤝" },
  { label: "Email", href: "/admin/email", icon: "✉️" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!auth) { router.push("/"); return; }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/"); return; }
      try {
        const token = await user.getIdTokenResult();
        if (token.claims.admin === true || token.claims.role === "admin") {
          setAuthorized(true);
        } else {
          router.push("/");
        }
      } catch {
        router.push("/");
      }
      setLoading(false);
    });
    return unsub;
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-[var(--accent)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="flex min-h-screen bg-[var(--surface-raised)]">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-64" : "w-16"} bg-[var(--navy)] text-white transition-all duration-200 flex flex-col`}>
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          {sidebarOpen && <span className="font-bold text-lg">IOPPS Admin</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white/70 hover:text-white">
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_SECTIONS.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10">
          {sidebarOpen && (
            <Link href="/" className="text-white/50 hover:text-white text-sm">← Back to site</Link>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
