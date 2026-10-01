"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { analyticsPath } from "@/lib/analytics/privacy";
import { flushJobFunnelEvents } from "@/lib/job-funnel-analytics";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!ready || !GA_MEASUREMENT_ID || !window.gtag) return;
    const pagePath = analyticsPath(pathname);
    const context = { page_path: pagePath, page_location: `https://www.iopps.ca${pagePath}`, page_title: "IOPPS", page_referrer: "" };
    window.gtag("set", context);
    window.gtag("event", "page_view", context);
  }, [pathname, ready]);
  if (!GA_MEASUREMENT_ID) return null;
  return <Script
    src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
    strategy="afterInteractive"
    onReady={() => {
      window.dataLayer = window.dataLayer || [];
      // Google processes gtag commands as Arguments objects, not plain arrays.
      // eslint-disable-next-line prefer-rest-params -- Required by the Google tag queue protocol.
      window.gtag = window.gtag || function () { window.dataLayer!.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("set", { page_location: "https://www.iopps.ca/", page_title: "IOPPS", page_referrer: "" });
      window.gtag("config", GA_MEASUREMENT_ID, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
      setReady(true);
      flushJobFunnelEvents();
    }}
  />;
}
