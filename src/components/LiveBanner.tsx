"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLivestreamFeed } from "@/hooks/useLivestreamFeed";

const DISMISSED_KEY = "iopps-live-banner-dismissed";
// Recheck so a broadcast that starts while someone is reading a page still reaches them.
const RECHECK_MS = 2 * 60 * 1000;

export function showsLiveBanner(pathname: string) {
  // The IOPPS Live page already features the broadcast.
  return !/^\/(livestreams|spotlight)(\/|$)/.test(pathname);
}

function dismissedVideo() {
  try { return window.sessionStorage.getItem(DISMISSED_KEY); } catch { return null; }
}

function watching(value?: string) {
  if (!value || !/^\d+$/.test(value) || value === "0") return "";
  return `${Intl.NumberFormat("en-CA", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value))} watching`;
}

function LiveBroadcastBanner() {
  const { data, error, refresh } = useLivestreamFeed();
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") refresh(); }, RECHECK_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  // Only point people to a broadcast the latest check confirmed is live.
  const live = error ? null : data?.live;
  if (!live || dismissed === live.id || dismissedVideo() === live.id) return null;
  const viewers = watching(live.concurrentViewers);

  function dismiss() {
    try { window.sessionStorage.setItem(DISMISSED_KEY, live!.id); } catch { /* Hidden for this page view only. */ }
    setDismissed(live!.id);
  }

  return (
    <aside aria-label="IOPPS Live broadcast" data-live-banner="true" className="border-b border-white/10 bg-navy-deep text-white">
      <div className="op-wrap flex min-h-12 items-center gap-2">
        <Link href="/livestreams" className="group flex min-w-0 flex-1 items-center gap-3 py-2 text-white no-underline">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded bg-red px-2 py-1 text-[11px] font-extrabold tracking-[0.1em]">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            LIVE NOW
          </span>
          <span className="min-w-0 truncate text-sm font-semibold">{live.title}</span>
          {viewers && <span className="hidden shrink-0 text-xs text-white/70 md:inline">{viewers}</span>}
          <span className="ml-auto shrink-0 text-sm font-bold text-teal-light group-hover:underline">
            Watch<span className="hidden sm:inline"> now</span> <span aria-hidden="true">→</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Hide the live broadcast banner"
          className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg text-white/70 hover:bg-white/10 hover:text-white"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </aside>
  );
}

/** Points visitors to IOPPS Live while the IOPPS YouTube channel is broadcasting. Renders nothing otherwise. */
export default function LiveBanner() {
  const pathname = usePathname();
  return showsLiveBanner(pathname) ? <LiveBroadcastBanner /> : null;
}
