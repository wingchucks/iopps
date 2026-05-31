export const ANALYTICS_EVENT_NAMES = [
  "page_view",
  "cta_click",
  "internal_link_click",
  "outbound_link_click",
  "job_apply_click",
  "job_detail_click",
  "event_detail_click",
  "scholarship_detail_click",
  "training_detail_click",
  "employer_profile_click",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export interface AnalyticsEventPayload {
  eventName: AnalyticsEventName;
  path: string;
  title?: string;
  href?: string;
  label?: string;
  referrer?: string;
  visitorId?: string;
}

export interface AnalyticsSummaryMetric {
  label: string;
  count: number;
}

export interface AnalyticsDailySummary {
  date: string;
  visitors: number;
  pageViews: number;
  totalClicks: number;
  outboundClicks: number;
  applyClicks: number;
  topEvents: AnalyticsSummaryMetric[];
  topPages: AnalyticsSummaryMetric[];
  topClicks: AnalyticsSummaryMetric[];
  sponsorLine: string;
}

export interface AnalyticsSummaryResponse {
  rangeDays: number;
  generatedAt: string;
  totals: {
    visitors: number;
    pageViews: number;
    totalClicks: number;
    outboundClicks: number;
    applyClicks: number;
  };
  days: AnalyticsDailySummary[];
  topEvents: AnalyticsSummaryMetric[];
  topPages: AnalyticsSummaryMetric[];
  topClicks: AnalyticsSummaryMetric[];
  sponsorLine: string;
}
