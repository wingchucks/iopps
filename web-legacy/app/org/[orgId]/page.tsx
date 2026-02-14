/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getDownloadURL, ref } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { getOrganization } from "@/lib/firestore/v2-organizations";
import type { V2Organization } from "@/lib/firestore/v2-types";

const TABS = ["Posts", "Jobs", "Programs", "Events", "Services"] as const;

export default function PublicOrgPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { user } = useAuth();
  const [org, setOrg] = useState<V2Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Posts");

  const isAdmin = user && org && (org.ownerUid === user.uid || org.adminUids?.includes(user.uid));

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      const found = await getOrganization(orgId);
      if (!found || found.status !== "active") {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setOrg(found);

      if (found.logoPath && storage) {
        try {
          const url = await getDownloadURL(ref(storage, found.logoPath));
          setLogoUrl(url);
        } catch { /* no logo */ }
      }
      if (found.coverPath && storage) {
        try {
          const url = await getDownloadURL(ref(storage, found.coverPath));
          setCoverUrl(url);
        } catch { /* no cover */ }
      }
      setLoading(false);
    })();
  }, [orgId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (notFound || !org) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background px-4">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Organization not found</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          This organization doesn&apos;t exist or isn&apos;t publicly available.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Cover Image */}
      <div className="relative h-48 w-full bg-[var(--surface)]">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-accent/20 to-accent/5" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      {/* Profile Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Logo */}
        <div className="-mt-12 mb-4">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={org.name}
              className="h-24 w-24 rounded-2xl border-4 border-[var(--card-bg)] object-cover bg-[var(--card-bg)]"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-[var(--card-bg)] bg-accent/10 text-accent text-3xl font-bold">
              {org.name.charAt(0)}
            </div>
          )}
        </div>

        {/* Name + Type */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{org.name}</h1>
            <span className="mt-1 inline-block rounded-full bg-accent/10 px-3 py-0.5 text-xs font-medium text-accent capitalize">
              {org.type}
            </span>
          </div>

          {isAdmin && (
            <div className="flex gap-2">
              <Link
                href="/org/dashboard"
                className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition"
              >
                Dashboard
              </Link>
              <Link
                href="/org/pending"
                className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface)] transition"
              >
                Edit
              </Link>
            </div>
          )}
        </div>

        {/* Website */}
        {org.website && (
          <a
            href={org.website}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm text-accent hover:underline"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
            </svg>
            {org.website.replace(/^https?:\/\//, "")}
          </a>
        )}

        {/* About */}
        {org.about && (
          <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">{org.about}</p>
        )}

        {/* Tabs */}
        <div className="mt-8 border-b border-[var(--border)]">
          <nav className="-mb-px flex gap-6">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium transition ${
                  activeTab === tab
                    ? "border-b-2 border-accent text-accent"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content (placeholder) */}
        <div className="py-12 text-center">
          <svg className="mx-auto h-12 w-12 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-17.5 0V6.75A2.25 2.25 0 0 1 4.5 4.5h15A2.25 2.25 0 0 1 21.75 6.75v6.75m-17.5 0v4.5A2.25 2.25 0 0 0 6.5 20.25h11a2.25 2.25 0 0 0 2.25-2.25v-4.5" />
          </svg>
          <p className="mt-3 text-sm text-[var(--text-muted)]">No {activeTab.toLowerCase()} posted yet</p>
        </div>
      </div>
    </div>
  );
}
