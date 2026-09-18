"use client";

import { useEffect, useState } from "react";

// Relative notification labels advance on clock ticks, not unrelated renders.
export function useCurrentTime() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}
