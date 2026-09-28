import { authIntentHref } from "@/lib/auth-redirect";
import { ONE_TIME_PLANS, SUBSCRIPTION_PLANS, isPlanAvailableForPurchase } from "@/lib/pricing";

// The four offers sold today, built from the plan definitions in pricing.ts so
// the landing page, pricing page, signup summary and checkout never disagree.
export type EmployerOfferId = "standard-post" | "featured-post" | "tier1" | "tier2";

export interface EmployerOffer {
  id: EmployerOfferId;
  kind: "post" | "annual";
  name: string;
  priceLabel: string;
  periodText: string;
  description: string;
  features: string[];
  badge?: string;
}

const NAMES: Record<EmployerOfferId, string> = {
  "standard-post": "Standard job post",
  "featured-post": "Featured job post",
  tier1: "Standard annual plan",
  tier2: "Premium annual plan",
};

function build(id: EmployerOfferId): EmployerOffer {
  const plan = id === "tier1" || id === "tier2" ? SUBSCRIPTION_PLANS[id] : ONE_TIME_PLANS[id];
  return {
    id,
    kind: id === "tier1" || id === "tier2" ? "annual" : "post",
    name: NAMES[id],
    priceLabel: plan.priceLabel,
    periodText: plan.periodLabel === "/year" ? "per year" : "per post",
    description: plan.shortDescription,
    features: plan.features,
    ...(plan.badge ? { badge: plan.badge } : {}),
  };
}

export const EMPLOYER_OFFERS: EmployerOffer[] = (["standard-post", "featured-post", "tier1", "tier2"] as const).map(build);

/** The offer a visitor selected, or null for anything that cannot be bought. */
export function employerOffer(planId: unknown): EmployerOffer | null {
  return isPlanAvailableForPurchase(planId) ? build(planId) : null;
}

/** Signup link that carries the chosen offer through signup, verification and checkout. */
export function employerOfferSignupHref(planId: EmployerOfferId): string {
  return authIntentHref("/org/signup", new URLSearchParams({ plan: planId, intent: "hiring" }));
}
