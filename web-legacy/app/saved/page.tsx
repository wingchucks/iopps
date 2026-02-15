"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  listSavedJobs,
  listSavedTraining,
  listSavedPrograms,
  listSavedSchools,
  listSavedConferences,
  listSavedPosts,
  toggleSavedJob,
  unsaveTrainingProgram,
  unsaveProgram,
  unsaveSchool,
  toggleSavedConference,
  toggleSavePost,
} from "@/lib/firestore";
import type { SavedJob, SavedTraining, SavedProgram, SavedSchool, SavedPost } from "@/lib/types";
import type { SavedConference } from "@/lib/firestore";
import { FeedLayout } from "@/components/opportunity-graph/dynamic";
import { Timestamp } from "firebase/firestore";

type TabKey = "all" | "jobs" | "training" | "education" | "events" | "community";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "jobs", label: "Jobs" },
  { key: "training", label: "Training" },
  { key: "education", label: "Education" },
  { key: "events", label: "Events" },
  { key: "community", label: "Community" },
];

const TAB_EMPTY_STATES: Record<TabKey, { message: string; cta: string; href: string }> = {
  all: { message: "You haven\u2019t saved anything yet. Tap the bookmark icon on any job, program, event, or post to save it here for later.", cta: "Explore opportunities", href: "/careers" },
  jobs: { message: "No saved jobs yet. Browse available positions and save the ones that interest you.", cta: "Browse jobs", href: "/careers" },
  training: { message: "No saved training programs yet. Discover skills development and training opportunities.", cta: "Find training", href: "/careers/programs" },
  education: { message: "No saved education items yet. Explore schools and programs across Canada.", cta: "Explore education", href: "/education" },
  events: { message: "No saved events yet. Check out upcoming conferences and community gatherings.", cta: "View events", href: "/community" },
  community: { message: "No saved community posts yet. Join the conversation and save posts you want to revisit.", cta: "Visit community", href: "/community" },
};

type NormalizedItem = {
  id: string;
  type: TabKey;
  title: string;
  subtitle: string;
  description: string;
  href: string;
  createdAt: Date | null;
};

function toDate(ts: Timestamp | { seconds: number } | null | undefined): Date | null {
  if (!ts) return null;
  if (ts instanceof Timestamp) return ts.toDate();
  if (typeof ts === "object" && "seconds" in ts) return new Date(ts.seconds * 1000);
  return null;
}

function snippet(text: string | undefined | null, max = 150): string {
  if (!text) return "";
  if (text.length <= max) return text;
  return text.slice(0, max) + "...";
}

function normalizeJob(item: SavedJob): NormalizedItem {
  return {
    id: item.id,
    type: "jobs",
    title: item.job?.title ?? "Untitled Job",
    subtitle: item.job?.employerName ?? "",
    description: snippet(item.job?.description),
    href: `/careers/${item.jobId}`,
    createdAt: toDate(item.createdAt),
  };
}

function normalizeTraining(item: SavedTraining): NormalizedItem {
  return {
    id: item.id,
    type: "training",
    title: item.program?.title ?? "Untitled Program",
    subtitle: item.program?.organizationName ?? "",
    description: snippet(item.program?.description),
    href: `/careers/programs/${item.programId}`,
    createdAt: toDate(item.createdAt),
  };
}

function normalizeProgram(item: SavedProgram): NormalizedItem {
  return {
    id: item.id,
    type: "education",
    title: item.program?.name ?? "Untitled Program",
    subtitle: item.program?.schoolName ?? "",
    description: snippet(item.program?.description),
    href: `/education/programs/${item.programId}`,
    createdAt: toDate(item.createdAt),
  };
}

function normalizeSchool(item: SavedSchool): NormalizedItem {
  return {
    id: item.id,
    type: "education",
    title: item.school?.name ?? "Untitled School",
    subtitle: typeof item.school?.location === "string" ? item.school.location : item.school?.location?.city ? `${item.school.location.city}, ${item.school.location.province || ""}`.trim() : "",
    description: snippet(item.school?.description),
    href: `/education/schools/${item.schoolId}`,
    createdAt: toDate(item.createdAt),
  };
}

function normalizeConference(item: SavedConference): NormalizedItem {
  return {
    id: item.id ?? item.conferenceId,
    type: "events",
    title: item.conference?.title ?? "Untitled Event",
    subtitle: item.conference?.organizerName ?? item.conference?.employerName ?? "",
    description: snippet(item.conference?.description),
    href: `/conferences/${item.conferenceId}`,
    createdAt: toDate(item.createdAt as Timestamp | null | undefined),
  };
}

function normalizePost(item: SavedPost): NormalizedItem {
  return {
    id: item.id,
    type: "community",
    title: item.post?.authorName ? `Post by ${item.post.authorName}` : "Community Post",
    subtitle: "",
    description: snippet(item.post?.content),
    href: `/posts/${item.postId}`,
    createdAt: toDate(item.createdAt),
  };
}

const TYPE_LABELS: Record<string, string> = {
  jobs: "Job",
  training: "Training",
  education: "Education",
  events: "Event",
  community: "Post",
};

export default function SavedItemsPage() {
  const { user, role, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [items, setItems] = useState<NormalizedItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user || role !== "community") return;
    let cancelled = false;

    (async () => {
      try {
        setError(null);
        setListLoading(true);

        const [jobs, training, programs, schools, conferences, posts] = await Promise.all([
          listSavedJobs(user.uid).catch(() => [] as SavedJob[]),
          listSavedTraining(user.uid).catch(() => [] as SavedTraining[]),
          listSavedPrograms(user.uid).catch(() => [] as SavedProgram[]),
          listSavedSchools(user.uid).catch(() => [] as SavedSchool[]),
          listSavedConferences(user.uid).catch(() => [] as SavedConference[]),
          listSavedPosts(user.uid).catch(() => [] as SavedPost[]),
        ]);

        if (cancelled) return;

        const all: NormalizedItem[] = [
          ...jobs.map(normalizeJob),
          ...training.map(normalizeTraining),
          ...programs.map(normalizeProgram),
          ...schools.map(normalizeSchool),
          ...conferences.map(normalizeConference),
          ...posts.map(normalizePost),
        ];

        all.sort((a, b) => {
          const da = a.createdAt?.getTime() ?? 0;
          const db = b.createdAt?.getTime() ?? 0;
          return db - da;
        });

        setItems(all);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Unable to load saved items right now.");
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user, role]);

  const handleRemove = useCallback(async (item: NormalizedItem) => {
    if (!user) return;
    setRemovingIds((prev) => new Set(prev).add(item.id));

    try {
      const idFromHref = item.href.split("/").pop() ?? "";

      switch (item.type) {
        case "jobs":
          await toggleSavedJob(user.uid, idFromHref, false);
          break;
        case "training":
          await unsaveTrainingProgram(user.uid, idFromHref);
          break;
        case "education":
          if (item.href.includes("/schools/")) {
            await unsaveSchool(user.uid, idFromHref);
          } else {
            await unsaveProgram(user.uid, idFromHref);
          }
          break;
        case "events":
          await toggleSavedConference(user.uid, idFromHref, false);
          break;
        case "community":
          await toggleSavePost(user.uid, idFromHref, false);
          break;
      }

      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      console.error("Failed to remove saved item:", err);
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }, [user]);

  const filtered = useMemo(() => {
    if (activeTab === "all") return items;
    return items.filter((i) => i.type === activeTab);
  }, [items, activeTab]);

  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = {
      all: items.length,
      jobs: 0,
      training: 0,
      education: 0,
      events: 0,
      community: 0,
    };
    for (const item of items) {
      counts[item.type as TabKey] = (counts[item.type as TabKey] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  if (loading) {
    return (
      <FeedLayout>
        <div className="py-10">
          <p className="text-sm text-[var(--text-secondary)]">Loading your account...</p>
        </div>
      </FeedLayout>
    );
  }

  if (!user) {
    return (
      <FeedLayout>
        <div className="py-10 space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Please sign in
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Log in or register as a community member to see your saved items.
          </p>
          <div className="flex gap-3">
            <Link
              href="/login"
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-md border border-[var(--card-border)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:border-accent hover:text-accent"
            >
              Register
            </Link>
          </div>
        </div>
      </FeedLayout>
    );
  }

  if (role !== "community") {
    return (
      <FeedLayout>
        <div className="py-10 space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Community member area
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Switch to your community account to view saved items.
          </p>
        </div>
      </FeedLayout>
    );
  }

  return (
    <FeedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-accent">Saved items</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Your saved collection
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Jobs, training programs, schools, events, and posts you have saved across the platform.
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-accent text-white"
                  : "text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tab.label}
              {!listLoading && (
                <span className="ml-1.5 text-xs opacity-70">
                  {tabCounts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Content */}
        {listLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4"
              >
                <div className="h-5 w-2/3 rounded bg-[var(--hover-bg)]" />
                <div className="mt-2 h-4 w-1/3 rounded bg-[var(--hover-bg)]" />
                <div className="mt-3 h-4 w-full rounded bg-[var(--hover-bg)]" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--hover-bg)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-secondary)]"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
              </div>
              <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
                {activeTab === "all" ? "Nothing saved yet" : `No saved ${TABS.find((t) => t.key === activeTab)?.label.toLowerCase() ?? ""}`}
              </p>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                {TAB_EMPTY_STATES[activeTab]?.message}
              </p>
              <Link href={TAB_EMPTY_STATES[activeTab]?.href ?? "/careers"} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors">
                {TAB_EMPTY_STATES[activeTab]?.cta ?? "Explore opportunities"}
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>
            </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((item) => (
              <article
                key={item.id}
                className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                        {TYPE_LABELS[item.type] ?? item.type}
                      </span>
                      {item.createdAt && (
                        <span className="text-xs text-[var(--text-secondary)]">
                          {item.createdAt.toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <Link
                      href={item.href}
                      className="mt-1.5 block text-lg font-semibold text-[var(--text-primary)] hover:text-accent"
                    >
                      {item.title}
                    </Link>
                    {item.subtitle && (
                      <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                        {item.subtitle}
                      </p>
                    )}
                    {item.description && (
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemove(item)}
                    disabled={removingIds.has(item.id)}
                    className="shrink-0 self-start rounded-md border border-[var(--card-border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-red-400 hover:text-red-600 disabled:opacity-50"
                  >
                    {removingIds.has(item.id) ? "Removing..." : "Remove"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </FeedLayout>
  );
    }
