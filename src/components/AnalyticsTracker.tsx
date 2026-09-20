"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import type { AnalyticsEventName } from "@/lib/analytics/types";
import { navigationEvent } from "@/lib/analytics/navigation";

function classifyClick(element: HTMLElement, href?: string): AnalyticsEventName {
  const explicit = element.closest<HTMLElement>("[data-analytics-event]")?.dataset.analyticsEvent;
  if (explicit) return explicit as AnalyticsEventName;

  const text = `${element.textContent ?? ""} ${href ?? ""}`.toLowerCase();
  if (text.includes("apply")) return "job_apply_click";
  if (href) return navigationEvent(href, window.location.href);

  return "cta_click";
}

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const lastPageView = useRef<string>("");

  useEffect(() => {
    const path = `${pathname}${window.location.search}`;
    if (lastPageView.current === path) return;
    lastPageView.current = path;
    trackAnalyticsEvent("page_view", { path });
  }, [pathname]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;

      const clickable = target.closest<HTMLElement>("a,button,[role='button'],[data-analytics-event]");
      if (!clickable) return;

      const anchor = clickable.closest<HTMLAnchorElement>("a[href]");
      const href = anchor?.href;
      const explicitLabel = clickable.closest<HTMLElement>("[data-analytics-label]")?.dataset.analyticsLabel;
      const label = explicitLabel || clickable.getAttribute("aria-label") || clickable.textContent || href;

      trackAnalyticsEvent(classifyClick(clickable, href), {
        href,
        label: label ?? undefined,
      });
    }

    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, []);

  return null;
}
