"use client";

import { useEffect, useState } from "react";
import type { LivestreamFeed } from "@/lib/livestreams";

export function useLivestreamFeed(videoId = "") {
  const [data, setData] = useState<LivestreamFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const timeout = window.setTimeout(() => controller.abort(), 25000);
    async function load() {
      setLoading(true);
      try {
        const query = videoId ? `?${new URLSearchParams({ video: videoId })}` : "";
        const response = await fetch(`/api/livestreams/youtube${query}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Feed unavailable");
        const nextData = await response.json() as LivestreamFeed;
        if (!Array.isArray(nextData.recent) || !Array.isArray(nextData.upcoming)) throw new Error("Invalid feed");
        if (!cancelled) { setData(nextData); setError(null); }
      } catch {
        if (!cancelled) setError("We couldn’t refresh the broadcasts. You can still watch IOPPS on YouTube.");
      } finally {
        window.clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; window.clearTimeout(timeout); controller.abort(); };
  }, [attempt, videoId]);

  return { data, loading, error, refresh: () => setAttempt(value => value + 1) };
}
