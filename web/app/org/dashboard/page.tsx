/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { getOrganizationByOwner } from "@/lib/firestore/v2-organizations";
import type { V2Organization } from "@/lib/firestore/v2-types";

const TILES = [
  {
    title: "Create Opportunity",
    description: "Post a new job, event, or program",
    href: "#",
    icon: (
      <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
  },
  {
    title: "Applications",
    description: "Review candidate applications",
    href: "#",
    icon: (
      <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
  },
  {
    title: "Messages",
    description: "View your inbox",
    href: "/organization/inbox",
    icon: (
      <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    title: "Analytics",
    description: "View insights",
    href: "#",
    icon: (
      <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
  },
  {
    title: "Team",
    description: "Manage team members",
    href: "/organization/team",
    icon: (
      <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
  },
  {
    title: "Settings",
    description: "Organization settings",
    href: "#",
    icon: (
      <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  },
];

function DashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [org, setOrg] = useState<V2Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const found = await getOrganizationByOwner(user.uid);
      if (!found) {
        router.replace("/organization/dashboard");
        return;
      }
      if (found.status === "pending") {
        router.replace("/org/pending");
        return;
      }
      if (found.status === "rejected") {
        router.replace("/org/rejected");
        return;
      }
      setOrg(found);

      if (found.logoPath) {
        try {
          const { getDownloadURL, ref } = await import("firebase/storage");
          const { storage } = await import("@/lib/firebase");
          if (storage) {
            const url = await getDownloadURL(ref(storage, found.logoPath));
            setLogoUrl(url);
          }
        } catch { /* no logo */ }
      }
      setLoading(false);
    })();
  }, [user, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!org) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        {logoUrl ? (
          <img src={logoUrl} alt={org.name} className="h-12 w-12 rounded-xl object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent font-bold text-lg">
            {org.name.charAt(0)}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{org.name}</h1>
          <span className="inline-block mt-0.5 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
            Dashboard
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Views", value: "\u2014" },
          { label: "Applications This Month", value: "\u2014" },
          { label: "Active Listings", value: "\u2014" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 text-center"
          >
            <p className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Dashboard Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TILES.map((tile) => (
          <button
            key={tile.title}
            onClick={() => {
              if (tile.href !== "#") router.push(tile.href);
            }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 text-left hover:shadow-md transition cursor-pointer"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              {tile.icon}
            </div>
            <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">{tile.title}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{tile.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function OrgDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["employer"]}>
      <DashboardContent />
    </ProtectedRoute>
  );
}
