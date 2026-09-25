import { ONE_TIME_PLANS } from "@/lib/pricing";

// What publishing a new job would use, computed on the server by a dry run of
// the same decision that enforces payment (see readPaidPublishingSummaries).
export type PublishingFunding =
  | "standard_credit"
  | "featured_credit"
  | "standard_subscription"
  | "premium_subscription"
  | "school_subscription"
  | "included_slot";

export interface PublishingOption {
  covered: boolean;
  funding: PublishingFunding | null;
  /** Credits, annual postings or featured slots left after publishing, when counted. */
  remainingAfter: number | null;
  /** Denial code when not covered (payment_required, or a reconciliation code). */
  reason: string | null;
}

export interface PublishingSummary {
  plan: "free" | "standard" | "premium" | "school";
  standard: PublishingOption;
  featured: PublishingOption;
}

export interface PublishingMessage {
  covered: boolean;
  headline: string;
  detail: string;
  /** One-time offer to buy when publishing is not covered by payment. */
  purchasePlan: "standard-post" | "featured-post" | null;
}

export const STANDARD_ANNUAL_POSTINGS = 15;

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** Plain-language summary of what the Publish button will do, or null while loading. */
export function describePublishing(summary: PublishingSummary | null, featured: boolean): PublishingMessage | null {
  if (!summary) return null;
  const option = featured ? summary.featured : summary.standard;
  const listing = featured ? "a featured listing for the duration you chose (up to 45 days)" : "a standard listing for 30 days";
  const left = option.remainingAfter ?? 0;
  if (option.covered) {
    switch (option.funding) {
      case "standard_credit":
        return { covered: true, headline: "Uses 1 standard post credit", detail: `Publishes ${listing}. You'll have ${plural(left, "standard credit")} left.`, purchasePlan: null };
      case "featured_credit":
        return { covered: true, headline: "Uses 1 featured credit", detail: `Publishes ${listing}. You'll have ${plural(left, "featured credit")} left.`, purchasePlan: null };
      case "standard_subscription":
        return { covered: true, headline: "Included in your Standard annual plan", detail: `Publishes ${listing}. You'll have ${left} of ${STANDARD_ANNUAL_POSTINGS} annual postings left.`, purchasePlan: null };
      case "premium_subscription":
      case "school_subscription":
        return { covered: true, headline: `Included in your ${option.funding === "school_subscription" ? "School" : "Premium"} annual plan`, detail: `Publishes ${listing}. Your plan includes unlimited standard postings.`, purchasePlan: null };
      case "included_slot":
        return { covered: true, headline: "Uses 1 featured slot from your plan", detail: `Publishes ${listing}. You'll have ${plural(left, "featured slot")} left.`, purchasePlan: null };
      default:
        return { covered: true, headline: "Covered by your account", detail: `Publishes ${listing}.`, purchasePlan: null };
    }
  }
  if (option.reason === "payment_required") {
    const planId = featured ? "featured-post" : "standard-post";
    const plan = ONE_TIME_PLANS[planId];
    return {
      covered: false,
      headline: `Publishing needs a ${plan.title} (${plan.priceLabel} CAD + GST)`,
      detail: "Buy one now: your job is saved as a draft first, and you'll come back here to publish it. You can also save it as a draft and publish later.",
      purchasePlan: planId,
    };
  }
  return {
    covered: false,
    headline: "Publishing needs an account check",
    detail: "Your posting balance needs a quick review by IOPPS before you can publish. Save this job as a draft and contact IOPPS support.",
    purchasePlan: null,
  };
}
