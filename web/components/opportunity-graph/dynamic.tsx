"use client";

import dynamic from "next/dynamic";

const LoadingSpinner = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
  </div>
);

export const FeedLayout = dynamic(
  () =>
    import("@/components/opportunity-graph/FeedLayout").then(
      (mod) => mod.FeedLayout
    ),
  { ssr: false, loading: LoadingSpinner }
);

export const OpportunityFeed = dynamic(
  () =>
    import("@/components/opportunity-graph/OpportunityFeed").then(
      (mod) => mod.OpportunityFeed
    ),
  { ssr: false, loading: LoadingSpinner }
);
